import { z, ZodSchema } from 'zod';
import { groqChat, groqVision, GroqChatOpts } from '../lib/groq';
import { logger } from '../lib/logger';

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

/** Estrae il primo blocco JSON ({...} o [...]) dal testo, come rete di sicurezza. */
function extractJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('No JSON found in AI response');
  }
}

/**
 * Chiama Groq aspettandosi JSON, lo estrae e lo valida con uno schema Zod.
 * Su parse/validazione fallita ritenta una volta (oltre al retry HTTP interno).
 */
async function groqJson<T>(messages: Message[], schema: ZodSchema<T>, opts?: GroqChatOpts): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const content = await groqChat(messages, opts);
    try {
      return schema.parse(extractJson(content));
    } catch (err) {
      lastErr = err;
      logger.warn({ err, attempt }, 'AI output parse/validation failed');
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('AI output invalid');
}

// ── Schemi Zod: validano la FORMA (abilitando il retry); la normalizzazione
//    (slice/clamp/default) resta nel codice per chiarezza e tipi puliti. ──────
const looseStr = z.coerce.string().optional();
const looseNum = z.coerce.number().optional();
const statRecord = z.record(z.coerce.number()).optional();

const AIQuestSchema = z.object({
  title: looseStr,
  description: looseStr,
  category: looseStr,
  xpReward: looseNum,
  statRewards: statRecord,
  difficulty: looseNum,
});
type RawQuest = z.infer<typeof AIQuestSchema>;

const ParsedFoodSchema = z.object({
  name: looseStr,
  grams: looseNum,
  caloriesPer100g: looseNum,
  proteinPer100g: looseNum,
  carbsPer100g: looseNum,
  fatPer100g: looseNum,
  fiberPer100g: looseNum,
});

const QuestsResponseSchema = z.object({ quests: z.array(AIQuestSchema).optional() });

const AISkillRawSchema = z.object({
  name: looseStr,
  description: looseStr,
  type: looseStr,
  unlockLevel: looseNum,
  statBonus: statRecord,
  parentSkillName: z.union([z.string(), z.null()]).optional(),
});
const SkillsResponseSchema = z.object({ skills: z.array(AISkillRawSchema).optional() });

const AIBossTaskSchema = z.object({ title: looseStr, description: looseStr });
const AIWeeklyBossSchema = z.object({
  name: looseStr,
  description: looseStr,
  lore: looseStr,
  statRewards: statRecord,
  difficulty: looseNum,
  tasks: z.array(AIBossTaskSchema).optional(),
});

const clamp = (n: number | undefined, min: number, max: number, fallback: number) =>
  Math.min(Math.max(Math.round(Number(n) || fallback), min), max);

const normStats = (rec: Record<string, number> | undefined): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec ?? {})) {
    if (['str', 'agi', 'int', 'end', 'vit'].includes(k)) out[k] = Math.round(Number(v) || 0);
  }
  return out;
};

function normalizeQuest(q: RawQuest): AIQuest {
  return {
    title: String(q.title ?? '').slice(0, 100),
    description: String(q.description ?? '').slice(0, 255),
    category: q.category === 'fitness' ? 'fitness' : 'mente',
    xpReward: clamp(q.xpReward, 10, 300, 25),
    statRewards: normStats(q.statRewards),
    difficulty: clamp(q.difficulty, 1, 3, 1),
  };
}

function normalizeFood(f: z.infer<typeof ParsedFoodSchema>): ParsedFood {
  return {
    name: String(f.name ?? 'Alimento').slice(0, 100),
    grams: Math.max(1, Math.round(Number(f.grams) || 100)),
    caloriesPer100g: Math.max(0, Number(f.caloriesPer100g) || 0),
    proteinPer100g: Math.max(0, Number(f.proteinPer100g) || 0),
    carbsPer100g: Math.max(0, Number(f.carbsPer100g) || 0),
    fatPer100g: Math.max(0, Number(f.fatPer100g) || 0),
    fiberPer100g: Math.max(0, Number(f.fiberPer100g) || 0),
  };
}

export interface ParsedFood {
  name: string;
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
}

export interface AIQuest {
  title: string;
  description: string;
  category: 'fitness' | 'mente';
  xpReward: number;
  statRewards: Record<string, number>;
  difficulty: number;
}

export interface WeeklySummaryData {
  questsCompleted: number;
  questsTotal: number;
  xpGained: number;
  statsGained: Record<string, number>;
  streak: number;
  bossDefeated: boolean;
  nutritionDaysOk: number;
  level: number;
  rank: string;
}

export async function generateWeeklySummary(data: WeeklySummaryData): Promise<string> {
  const statsText = Object.entries(data.statsGained).length > 0
    ? Object.entries(data.statsGained).map(([k, v]) => `${k.toUpperCase()} aumentato di ${v}`).join(', ')
    : 'nessuna statistica aumentata';

  const content = await groqChat([
    {
      role: 'system',
      content: `Sei la voce del Sistema di Solo Leveling. Parli direttamente al Hunter in seconda persona, con tono epico e drammatico in italiano.
Scrivi SOLO testo narrativo puro: niente JSON, niente liste puntate, niente parentesi graffe, niente placeholder, niente markdown, niente asterischi. Solo paragrafi di testo normale.`,
    },
    {
      role: 'user',
      content: `Scrivi il rapporto settimanale per il Hunter di Rank ${data.rank}, Livello ${data.level}.

Questa settimana il Hunter ha:
— Completato ${data.questsCompleted} quest su ${data.questsTotal} disponibili
— Guadagnato circa ${data.xpGained} punti esperienza
— Migliorato le seguenti statistiche: ${statsText}
— Mantenuto una streak di ${data.streak} giorni consecutivi
— ${data.bossDefeated ? 'Sconfitto il Boss Settimanale' : 'Non sconfitto il Boss Settimanale'}
— Rispettato gli obiettivi nutrizionali per ${data.nutritionDaysOk} giorni su 7

Scrivi 4 paragrafi in stile Solo Leveling:
1. Apertura con "RAPPORTO DI SISTEMA" e valutazione drammatica della settimana
2. Analisi dei progressi ottenuti, citando i numeri reali in modo narrativo
3. Punto di forza principale e punto da migliorare
4. Chiusura motivazionale che spinge il Hunter verso la settimana successiva

IMPORTANTE: scrivi solo testo, niente simboli speciali, niente parentesi, niente variabili.`,
    },
  ], { json: false });

  return content;
}

export async function analyzeMealPhoto(base64Image: string): Promise<ParsedFood[]> {
  const content = await groqVision('meta-llama/llama-4-scout-17b-16e-instruct', [
    {
      role: 'system',
      content: 'Sei un nutrizionista esperto. Analizza le immagini di pasti e restituisci SOLO un array JSON valido, senza testo aggiuntivo.',
    },
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
        {
          type: 'text',
          text: `Analizza il pasto nell'immagine. Per ogni alimento riconoscibile stima i valori nutrizionali PER 100g e i grammi presenti nel piatto.

Rispondi SOLO con questo array JSON (nessun testo prima o dopo):
[{"name":"nome in italiano","grams":100,"caloriesPer100g":0,"proteinPer100g":0,"carbsPer100g":0,"fatPer100g":0,"fiberPer100g":0}]`,
        },
      ],
    },
  ]);

  const raw = z.array(ParsedFoodSchema).parse(extractJson(content));
  return raw.map(normalizeFood);
}

export async function parseFoodWithAI(description: string): Promise<ParsedFood> {
  const raw = await groqJson([
    {
      role: 'system',
      content:
        'Sei un nutrizionista italiano esperto con conoscenza approfondita della cucina italiana e internazionale. Rispondi SOLO con JSON valido, senza testo aggiuntivo.',
    },
    {
      role: 'user',
      content: `Analizza questo alimento o pasto e stima i valori nutrizionali PER 100g e la quantità totale in grammi.

Descrizione: "${description}"

Istruzioni:
- Se la quantità non è specificata, usa una porzione standard italiana (es. pasta = 200g cotta, pizza margherita = 300g, caffè = 30ml)
- Per piatti composti (pasta al sugo, pizza, hamburger) calcola i valori medi del piatto finito pronto da mangiare
- Per fast food usa i valori medi della catena (McDonald's, Burger King, ecc.)
- Arrotonda i valori a 1 decimale

Rispondi con questo JSON esatto (solo JSON, nessun testo fuori):
{
  "name": "nome alimento/piatto in italiano",
  "grams": numero_grammi_porzione_totale,
  "caloriesPer100g": numero,
  "proteinPer100g": numero,
  "carbsPer100g": numero,
  "fatPer100g": numero,
  "fiberPer100g": numero
}`,
    },
  ], ParsedFoodSchema);

  return normalizeFood(raw);
}

export interface AIBossTask {
  title: string;
  description: string;
}

export interface AIWeeklyBoss {
  name: string;
  description: string;
  lore: string;
  xpReward: number;
  statRewards: Record<string, number>;
  difficulty: number;
  tasks: AIBossTask[];
}

export interface AISkill {
  name: string;
  description: string;
  type: 'passive' | 'active';
  unlockLevel: number;
  statBonus: Record<string, number>;
  parentSkillName: string | null;
}

export async function generateSkillTree(character: {
  level: number;
  rank: string;
  str: number;
  agi: number;
  int: number;
  end: number;
  vit: number;
}): Promise<AISkill[]> {
  const dominant = Object.entries({ str: character.str, agi: character.agi, int: character.int, end: character.end, vit: character.vit })
    .sort(([, a], [, b]) => b - a)[0][0];

  const raw = await groqJson([
    {
      role: 'system',
      content: 'Sei il Sistema di Solo Leveling. Generi alberi di abilità per Hunter. Rispondi SOLO con JSON valido.',
    },
    {
      role: 'user',
      content: `Genera un albero di abilità per questo Hunter di Rank ${character.rank}, Livello ${character.level}.
Stat dominante: ${dominant.toUpperCase()} (${character[dominant as keyof typeof character]})

REGOLE:
- Genera esattamente 12 skill in italiano, ispirate a Solo Leveling
- Struttura ad albero: 3 skill radice (parentSkillName null), poi branch da esse
- Le skill radice coprono i 3 aspetti principali del personaggio
- type: "passive" per bonus permanenti, "active" per abilità attivabili
- unlockLevel: livelli realistici basati su livello ${character.level} del personaggio (root = livello attuale o poco sopra, rami = progressivamente più alti)
- statBonus: JSON con chiavi str/agi/int/end/vit, valori 1-4 per le passive, 0 per le active
- parentSkillName: nome ESATTO di una skill già nella lista (per i figli), null per le radici

Rispondi con JSON:
{
  "skills": [
    {"name":"string","description":"string (max 80 caratteri)","type":"passive","unlockLevel":${character.level},"statBonus":{"str":2},"parentSkillName":null},
    ...
  ]
}`,
    },
  ], SkillsResponseSchema);

  return (raw.skills ?? []).slice(0, 15).map((s) => ({
    name: String(s.name ?? '').slice(0, 60),
    description: String(s.description ?? '').slice(0, 120),
    type: s.type === 'active' ? 'active' : 'passive',
    unlockLevel: Math.max(1, Math.round(Number(s.unlockLevel) || character.level)),
    statBonus: typeof s.statBonus === 'object' && s.statBonus !== null ? s.statBonus : {},
    parentSkillName: s.parentSkillName ? String(s.parentSkillName).slice(0, 60) : null,
  }));
}

export async function generateWeeklyBoss(character: {
  level: number;
  rank: string;
  str: number;
  agi: number;
  int: number;
  end: number;
  vit: number;
}): Promise<AIWeeklyBoss> {
  const baseQuestXp = Math.floor(25 + character.level * 1.5);
  const xpReward = Math.round(baseQuestXp * 3);

  const raw = await groqJson([
    {
      role: 'system',
      content:
        'Sei il Sistema di Solo Leveling. Generi boss settimanali epici per un Hunter nel mondo reale. Rispondi SOLO con JSON valido.',
    },
    {
      role: 'user',
      content: `Genera un Boss Settimanale per questo Hunter.

Statistiche:
- Livello ${character.level} | Rank ${character.rank}
- STR ${character.str} | AGI ${character.agi} | INT ${character.int} | END ${character.end} | VIT ${character.vit}

REGOLE:
- name: nome del boss in italiano/inglese stile Solo Leveling (es. "Monarch of Shadows", "Tyrant Beast")
- description: descrizione breve del boss (max 120 caratteri), in italiano
- lore: backstory in italiano, 2-3 frasi epiche, stile Solo Leveling
- difficulty: da 1 a 5, proporzionale al livello ${character.level}
- xpReward: esattamente ${xpReward}
- statRewards: JSON con almeno 3 stat tra str/agi/int/end/vit, valori 2-5
- tasks: array di esattamente 3 sfide settimanali nel mondo reale, proporzionate al livello, mix fitness e mente

Rispondi con JSON:
{
  "name": "string",
  "description": "string",
  "lore": "string",
  "xpReward": ${xpReward},
  "statRewards": {"str": 3, "agi": 2, "end": 2},
  "difficulty": number,
  "tasks": [
    {"title": "string", "description": "string"},
    {"title": "string", "description": "string"},
    {"title": "string", "description": "string"}
  ]
}`,
    },
  ], AIWeeklyBossSchema);

  const stats = normStats(raw.statRewards);
  return {
    name: String(raw.name ?? 'Shadow Monarch').slice(0, 100),
    description: String(raw.description ?? '').slice(0, 255),
    lore: String(raw.lore ?? '').slice(0, 500),
    xpReward,
    statRewards: Object.keys(stats).length > 0 ? stats : { str: 2, agi: 2, int: 2 },
    difficulty: clamp(raw.difficulty, 1, 5, 3),
    tasks: (raw.tasks ?? []).slice(0, 3).map((t) => ({
      title: String(t.title ?? '').slice(0, 100),
      description: String(t.description ?? '').slice(0, 255),
    })),
  };
}

export interface DailyQuestOpts {
  goals?: string[];
  difficultyHint?: 'easier' | 'harder' | null;
  recentQuests?: string[];
}

export async function generateDailyQuests(
  character: {
    level: number;
    rank: string;
    str: number;
    agi: number;
    int: number;
    end: number;
    vit: number;
  },
  opts?: DailyQuestOpts
): Promise<AIQuest[]> {
  const { level, rank, str, agi, int: INT, end, vit } = character;
  const xpMin = Math.floor(25 + level * 1.5);
  const xpMax = Math.floor(xpMin * 2.2);

  const goalsSection = opts?.goals?.length
    ? `\nOBIETTIVI PERSONALI DELL'HUNTER (dichiarati da lui):
${opts.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

REGOLA OBIETTIVI: almeno 1 missione fitness e 1 missione mente devono essere
un passo CONCRETO e MISURABILE verso uno di questi obiettivi. Le altre seguono
le regole standard. Non citare l'obiettivo testualmente: traducilo in azione.\n`
    : '';

  const difficultySection =
    opts?.difficultyHint === 'easier'
      ? `\nCALIBRAZIONE: nell'ultima settimana l'Hunter ha trovato le missioni TROPPO DURE.
Riduci l'intensità di circa il 20% rispetto allo standard del suo livello. La costanza vale più dell'intensità.\n`
      : opts?.difficultyHint === 'harder'
        ? `\nCALIBRAZIONE: nell'ultima settimana l'Hunter ha trovato le missioni TROPPO FACILI.
Aumenta l'intensità di circa il 20% rispetto allo standard del suo livello.\n`
        : '';

  const recentSection = opts?.recentQuests?.length
    ? `\nMISSIONI FITNESS DEI GIORNI SCORSI (non ripeterle):
${opts.recentQuests.map((t) => `- ${t}`).join('\n')}

REGOLA RECUPERO: l'allenamento reale richiede riposo. Se gli ultimi 6 giorni
mostrano solo allenamenti intensi (forza/HIIT/cardio), UNA delle due missioni
fitness di oggi deve essere recupero attivo: stretching, mobilità, camminata,
yoga, foam rolling. Difficulty 1.\n`
    : '';

  const raw = await groqJson([
    {
      role: 'system',
      content:
        'Sei il Sistema di Solo Leveling. Generi missioni giornaliere nel mondo reale per un Hunter. Rispondi SOLO con JSON valido.',
    },
    {
      role: 'user',
      content: `Genera 4 missioni giornaliere personalizzate per questo Hunter.

Statistiche:
- Livello ${level} | Rank ${rank}
- STR ${str} | AGI ${agi} | INT ${INT} | END ${end} | VIT ${vit}
${goalsSection}${difficultySection}${recentSection}
REGOLE FONDAMENTALI:
- 2 missioni category "fitness" + 2 missioni category "mente"
- Titoli in italiano, concisi (max 50 caratteri), stile Solo Leveling epico
- Descrizioni in italiano, precise (max 120 caratteri)
- xpReward tra ${xpMin} e ${xpMax}
- statRewards: chiavi "str","agi","int","end","vit" con valori 1-3

SCALA DI DIFFICOLTÀ IN BASE AL LIVELLO ${level}:
${level <= 9 ? `Livello 1-9 (RANK E — Principiante):
  • difficulty: 1 per entrambe le fitness
  • Esercizi leggeri: 10-15 push-up, 20 squat, 10 min corsa, 20 min studio, 5 min meditazione
  • xpReward: ${xpMin}-${Math.round(xpMin * 1.3)}` : ''}
${level >= 10 && level <= 24 ? `Livello 10-24 (RANK D — Intermedio):
  • difficulty: 1-2, almeno una fitness a 2
  • Esercizi moderati: 25-30 push-up, 50 squat, 20 min corsa, 3 serie circuit, 30 min studio
  • xpReward: ${xpMin}-${Math.round(xpMin * 1.5)}` : ''}
${level >= 25 && level <= 49 ? `Livello 25-49 (RANK C/B — Avanzato):
  • difficulty: 2-3, almeno una fitness a 3
  • Esercizi intensi: 50 push-up, 100 squat, HIIT 20 min, trazioni, 45 min studio concentrato
  • xpReward: ${xpMin}-${Math.round(xpMin * 1.8)}` : ''}
${level >= 50 ? `Livello 50+ (RANK A/S — Elite):
  • difficulty: 3 per tutte le missioni
  • Esercizi da atleta: 100 push-up, muscle-up, corsa 10km, HIIT estremo, 2h studio, meditazione avanzata
  • xpReward: ${xpMin}-${xpMax}` : ''}

VARIETÀ OBBLIGATORIA — le 2 missioni FITNESS devono essere di tipo DIVERSO, scegli da questa lista ruotando ogni giorno:
• Forza: push-up, trazioni, dip, squat, affondi, stacchi, overhead press con manubri
• Resistenza/Cardio: corsa, cyclette, nuoto, salto della corda, camminata veloce
• HIIT / Circuit training: burpees, mountain climber, jumping jack, tabata
• Core / Stabilità: plank, crunch, leg raise, hollow body, russian twist
• Flessibilità / Mobilità: stretching, yoga, foam rolling
• Sport / Attività: basket, calcio, tennis, boxe, arti marziali, arrampicata
• Corpo libero avanzato: muscle-up, handstand, pistol squat, L-sit

NON generare due missioni di corsa o dello stesso tipo nella stessa giornata.
NON usare sempre la corsa — è solo una delle tante opzioni.

Le 2 missioni MENTE devono anch'esse essere di tipo diverso tra loro:
• Studio / Apprendimento: corso online, libro tecnico, lingua straniera
• Meditazione / Mindfulness: respirazione, body scan, visualizzazione
• Journaling / Riflessione: diario, obiettivi, gratitudine
• Creatività: scrittura, disegno, musica, brainstorming
• Disciplina digitale: no social, focus session, deep work
• Lettura: saggio, romanzo, articolo long-form
• Problem solving: puzzle, scacchi, matematica, coding challenge

Rispondi con JSON:
{
  "quests": [
    {
      "title": "string",
      "description": "string",
      "category": "fitness",
      "xpReward": number,
      "statRewards": {"str": 1},
      "difficulty": 1
    }
  ]
}`,
    },
  ], QuestsResponseSchema);

  return (raw.quests ?? []).slice(0, 4).map(normalizeQuest);
}

/** Genera UNA singola quest (per il reroll), evitando i titoli già presenti. */
export async function generateSingleQuest(
  character: { level: number; rank: string; str: number; agi: number; int: number; end: number; vit: number },
  category: 'fitness' | 'mente',
  excludeTitles: string[]
): Promise<AIQuest> {
  const { level, rank } = character;
  const xpMin = Math.floor(25 + level * 1.5);
  const xpMax = Math.floor(xpMin * 2.2);
  const exclude = excludeTitles.length > 0 ? excludeTitles.map((t) => `"${t}"`).join(', ') : 'nessuna';

  const q = await groqJson([
    {
      role: 'system',
      content:
        'Sei il Sistema di Solo Leveling. Generi UNA missione giornaliera nel mondo reale per un Hunter. Rispondi SOLO con JSON valido.',
    },
    {
      role: 'user',
      content: `Genera 1 sola missione di categoria "${category}" per questo Hunter.

Statistiche: Livello ${level} | Rank ${rank}

REGOLE:
- Titolo in italiano, conciso (max 50 caratteri), stile Solo Leveling epico
- Descrizione in italiano, precisa (max 120 caratteri)
- xpReward tra ${xpMin} e ${xpMax}
- statRewards: chiavi "str","agi","int","end","vit" con valori 1-3
- difficulty 1-3 in base al livello
- DEVE essere DIVERSA da queste missioni già presenti oggi: ${exclude}

Rispondi con JSON:
{ "title": "string", "description": "string", "category": "${category}", "xpReward": number, "statRewards": {"str": 1}, "difficulty": 1 }`,
    },
  ], AIQuestSchema);

  // Normalizza e forza la categoria richiesta dal reroll
  return { ...normalizeQuest(q), category };
}
