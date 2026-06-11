import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { generateSkillTree } from '../services/aiService';
import { applyStats, getDynamicTitle } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../middleware/errorHandler';
import { aiLimiter } from '../middleware/rateLimit';

const router = Router();

interface CharacterLike {
  id: string;
  level: number;
  rank: string;
  str: number;
  agi: number;
  int: number;
  end: number;
  vit: number;
}

async function buildSkillTree(characterId: string) {
  const [skills, unlocked] = await Promise.all([
    prisma.skill.findMany({ where: { characterId }, include: { children: true } }),
    prisma.unlockedSkill.findMany({ where: { characterId }, select: { skillId: true } }),
  ]);
  const unlockedIds = new Set(unlocked.map((u) => u.skillId));
  return skills.map((s) => ({ ...s, unlocked: unlockedIds.has(s.id) }));
}

/** Genera e persiste l'albero per UN personaggio, se non esiste già. */
async function ensureSkillTree(character: CharacterLike) {
  const existing = await prisma.skill.count({ where: { characterId: character.id } });
  if (existing > 0) return;

  const generated = await generateSkillTree(character);

  // Creazione per livelli: crea una skill solo quando il suo genitore è già
  // stato creato (o è una radice). Itera finché si fa progresso; le skill con
  // genitore irrisolvibile diventano radici (fallback coerente).
  const nameToId = new Map<string, string>();
  const remaining = [...generated];

  let progressed = true;
  while (remaining.length > 0 && progressed) {
    progressed = false;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const s = remaining[i];
      const parentResolved = s.parentSkillName === null || nameToId.has(s.parentSkillName);
      if (!parentResolved) continue;

      const parentId = s.parentSkillName ? nameToId.get(s.parentSkillName)! : null;
      const skill = await prisma.skill.create({
        data: {
          characterId: character.id,
          name: s.name,
          description: s.description,
          type: s.type,
          unlockLevel: s.unlockLevel,
          statBonus: s.statBonus,
          parentSkillId: parentId,
        },
      });
      nameToId.set(s.name, skill.id);
      remaining.splice(i, 1);
      progressed = true;
    }
  }

  // Eventuali skill con genitore mancante: creale come radici.
  for (const s of remaining) {
    const skill = await prisma.skill.create({
      data: {
        characterId: character.id,
        name: s.name,
        description: s.description,
        type: s.type,
        unlockLevel: s.unlockLevel,
        statBonus: s.statBonus,
        parentSkillId: null,
      },
    });
    nameToId.set(s.name, skill.id);
  }
}

router.get('/', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  await ensureSkillTree(char);
  const skills = await buildSkillTree(char.id);
  res.json(skills);
}));

router.post('/:id/unlock', requireAuth, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const skill = await prisma.skill.findUniqueOrThrow({ where: { id: req.params.id } });

  // La skill deve appartenere all'albero di questo personaggio
  if (skill.characterId !== char.id) {
    throw new HttpError(403, 'Skill non appartenente al personaggio');
  }

  if (char.level < skill.unlockLevel) {
    throw new HttpError(400, `Livello ${skill.unlockLevel} richiesto`);
  }

  const already = await prisma.unlockedSkill.findUnique({
    where: { characterId_skillId: { characterId: char.id, skillId: skill.id } },
  });
  if (already) throw new HttpError(400, 'Skill già sbloccata');

  if (skill.parentSkillId) {
    const parentUnlocked = await prisma.unlockedSkill.findUnique({
      where: { characterId_skillId: { characterId: char.id, skillId: skill.parentSkillId } },
    });
    if (!parentUnlocked) throw new HttpError(400, 'Sblocca prima la skill genitore');
  }

  await prisma.unlockedSkill.create({ data: { characterId: char.id, skillId: skill.id } });

  if (skill.type === 'passive') {
    await applyStats(char.id, skill.statBonus as Record<string, number>);
  }

  const newlyUnlocked = await runUnlockCheck(char.id);
  const updatedChar = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  const skills = await buildSkillTree(char.id);

  res.json({
    skills,
    character: { ...updatedChar, activeTitle: getDynamicTitle(updatedChar) },
    newlyUnlocked,
  });
}));

router.post('/regenerate', requireAuth, aiLimiter, asyncHandler(async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  // Cancella SOLO le skill di questo personaggio (UnlockedSkill cade in cascade)
  await prisma.skill.deleteMany({ where: { characterId: char.id } });
  await ensureSkillTree(char);
  const skills = await buildSkillTree(char.id);
  res.json(skills);
}));

export default router;
