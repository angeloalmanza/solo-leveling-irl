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
- Difficoltà (1=facile, 2=medio, 3=difficile): scala con il livello
- xpReward tra ${xpMin} e ${xpMax}
- statRewards: chiavi "str","agi","int","end","vit" con valori 1-3
- Titoli in italiano, concisi (max 50 caratteri), stile Solo Leveling epico
- Descrizioni in italiano, precise (max 120 caratteri)

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
