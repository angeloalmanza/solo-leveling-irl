import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/requireAuth';
import { generateSkillTree } from '../services/aiService';
import { applyStats, getDynamicTitle } from '../services/levelService';
import { runUnlockCheck } from '../services/unlockService';

const router = Router();

async function buildSkillTree(characterId: string) {
  const [skills, unlocked] = await Promise.all([
    prisma.skill.findMany({ include: { children: true } }),
    prisma.unlockedSkill.findMany({ where: { characterId }, select: { skillId: true } }),
  ]);
  const unlockedIds = new Set(unlocked.map((u) => u.skillId));
  return skills.map((s) => ({ ...s, unlocked: unlockedIds.has(s.id) }));
}

async function ensureSkillTree(character: { id: string; level: number; rank: string; str: number; agi: number; int: number; end: number; vit: number }) {
  const existing = await prisma.skill.count();
  if (existing > 0) return;

  const generated = await generateSkillTree(character);

  // Prima passa: crea le skill senza parentSkillId
  const nameToId = new Map<string, string>();
  for (const s of generated) {
    if (s.parentSkillName !== null) continue;
    const skill = await prisma.skill.create({
      data: { name: s.name, description: s.description, type: s.type, unlockLevel: s.unlockLevel, statBonus: s.statBonus },
    });
    nameToId.set(s.name, skill.id);
  }

  // Seconda passa: crea i figli con parentSkillId
  for (const s of generated) {
    if (s.parentSkillName === null) continue;
    const parentId = nameToId.get(s.parentSkillName);
    const skill = await prisma.skill.create({
      data: { name: s.name, description: s.description, type: s.type, unlockLevel: s.unlockLevel, statBonus: s.statBonus, parentSkillId: parentId ?? null },
    });
    nameToId.set(s.name, skill.id);
  }

  // Terza passa: eventuale terzo livello
  for (const s of generated) {
    if (s.parentSkillName === null || nameToId.has(s.name)) continue;
    const parentId = nameToId.get(s.parentSkillName);
    await prisma.skill.create({
      data: { name: s.name, description: s.description, type: s.type, unlockLevel: s.unlockLevel, statBonus: s.statBonus, parentSkillId: parentId ?? null },
    });
  }
}

router.get('/', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  await ensureSkillTree(char);
  const skills = await buildSkillTree(char.id);
  res.json(skills);
});

router.post('/:id/unlock', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });

  const skill = await prisma.skill.findUniqueOrThrow({ where: { id: req.params.id } });

  if (char.level < skill.unlockLevel) {
    res.status(400).json({ error: `Livello ${skill.unlockLevel} richiesto` });
    return;
  }

  const already = await prisma.unlockedSkill.findUnique({
    where: { characterId_skillId: { characterId: char.id, skillId: skill.id } },
  });
  if (already) { res.status(400).json({ error: 'Skill già sbloccata' }); return; }

  // Verifica che il genitore sia sbloccato (se esiste)
  if (skill.parentSkillId) {
    const parentUnlocked = await prisma.unlockedSkill.findUnique({
      where: { characterId_skillId: { characterId: char.id, skillId: skill.parentSkillId } },
    });
    if (!parentUnlocked) {
      res.status(400).json({ error: 'Sblocca prima la skill genitore' });
      return;
    }
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
});

router.get('/generate', requireAuth, async (req, res: Response) => {
  const userId = (req as AuthRequest).userId;
  const char = await prisma.character.findUniqueOrThrow({ where: { userId } });
  await prisma.skill.deleteMany();
  await ensureSkillTree(char);
  const skills = await buildSkillTree(char.id);
  res.json(skills);
});

export default router;
