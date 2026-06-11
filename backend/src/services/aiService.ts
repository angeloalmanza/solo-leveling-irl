import { groqChat } from '../lib/groq';

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
  const content = await groqChat([
    {
      role: 'system',
      content:
        'Sei il Sistema di Solo Leveling. Scrivi rapporti settimanali in italiano epici e motivazionali in stile Solo Leveling. Rispondi SOLO con testo narrativo, senza JSON.',
    },
    {
      role: 'user',
      content: `Scrivi un rapporto settimanale per questo Hunter.

Dati della settimana:
- Quest completate: ${data.questsCompleted}/${data.questsTotal}
- XP guadagnata: ${data.xpGained}
- Stat aumentate: ${Object.entries(data.statsGained).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(', ') || 'nessuna'}
- Streak attuale: ${data.streak} giorni consecutivi
- Boss settimanale sconfitto: ${data.bossDefeated ? 'SÌ' : 'NO'}
- Obiettivi nutrizionali raggiunti: ${data.nutritionDaysOk}/7 giorni
- Livello attuale: ${data.level} | Rank: ${data.rank}

Scrivi un rapporto in italiano di 3-5 paragrafi in stile Solo Leveling:
- Apertura epica tipo "RAPPORTO DI SISTEMA — SETTIMANA [X]"
- Analisi dei progressi con tono drammatico
- Punti di forza della settimana
- Aree di miglioramento (senza essere troppo critico)
- Chiusura motivazionale epica

Usa solo testo narrativo, nessun JSON, nessuna lista puntata.`,
    },
  ]);

  return content;
}

export async function parseFoodWithAI(description: string): Promise<ParsedFood> {
  const content = await groqChat([
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
  ]);

  const raw = JSON.parse(content);
  return {
    name: String(raw.name ?? 'Alimento').slice(0, 100),
    grams: Math.max(1, Math.round(Number(raw.grams) || 100)),
    caloriesPer100g: Math.max(0, Number(raw.caloriesPer100g) || 0),
    proteinPer100g: Math.max(0, Number(raw.proteinPer100g) || 0),
    carbsPer100g: Math.max(0, Number(raw.carbsPer100g) || 0),
    fatPer100g: Math.max(0, Number(raw.fatPer100g) || 0),
    fiberPer100g: Math.max(0, Number(raw.fiberPer100g) || 0),
  };
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

  const content = await groqChat([
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
  ]);

  const raw = JSON.parse(content) as AIWeeklyBoss;

  return {
    name: String(raw.name ?? 'Shadow Monarch').slice(0, 100),
    description: String(raw.description ?? '').slice(0, 255),
    lore: String(raw.lore ?? '').slice(0, 500),
    xpReward,
    statRewards: typeof raw.statRewards === 'object' && raw.statRewards !== null ? raw.statRewards : { str: 2, agi: 2, int: 2 },
    difficulty: Math.min(Math.max(Math.round(Number(raw.difficulty) || 3), 1), 5),
    tasks: (Array.isArray(raw.tasks) ? raw.tasks.slice(0, 3) : []).map((t) => ({
      title: String(t.title ?? '').slice(0, 100),
      description: String(t.description ?? '').slice(0, 255),
    })),
  };
}

export async function generateDailyQuests(character: {
  level: number;
  rank: string;
  str: number;
  agi: number;
  int: number;
  end: number;
  vit: number;
}): Promise<AIQuest[]> {
  const { level, rank, str, agi, int: INT, end, vit } = character;
  const xpMin = Math.floor(25 + level * 1.5);
  const xpMax = Math.floor(xpMin * 2.2);

  const content = await groqChat([
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
  ]);

  const raw = JSON.parse(content) as { quests: AIQuest[] };
  const quests = (raw.quests ?? []).slice(0, 4);

  return quests.map((q) => ({
    title: String(q.title ?? '').slice(0, 100),
    description: String(q.description ?? '').slice(0, 255),
    category: q.category === 'fitness' ? 'fitness' : 'mente',
    xpReward: Math.min(Math.max(Math.round(Number(q.xpReward) || xpMin), 10), 300),
    statRewards: typeof q.statRewards === 'object' && q.statRewards !== null ? q.statRewards : {},
    difficulty: Math.min(Math.max(Math.round(Number(q.difficulty) || 1), 1), 3),
  }));
}
