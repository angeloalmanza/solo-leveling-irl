import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.unlockedAchievement.deleteMany();
  await prisma.unlockedShadow.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.shadow.deleteMany();
  await prisma.questTemplate.deleteMany();

  const fitnessQuests = [
    { title: 'Esegui 20 flessioni', description: 'Completa 20 push-up con buona forma', xpReward: 30, statRewards: { str: 1 }, difficulty: 1 },
    { title: 'Corri per 20 minuti', description: 'Mantieni un ritmo costante per almeno 20 minuti', xpReward: 40, statRewards: { agi: 1 }, difficulty: 1 },
    { title: 'Esegui 30 squat', description: 'Scendi con le cosce parallele al pavimento', xpReward: 30, statRewards: { str: 1 }, difficulty: 1 },
    { title: 'Fai 10 trazioni', description: 'Pull-up con presa prona, braccia completamente estese', xpReward: 50, statRewards: { str: 2 }, difficulty: 2 },
    { title: 'Cammina 8.000 passi', description: 'Raggiungi 8.000 passi durante la giornata', xpReward: 35, statRewards: { agi: 1 }, difficulty: 1 },
    { title: 'Plank 3 minuti totali', description: 'Dividi come preferisci, mantieni il core attivo', xpReward: 35, statRewards: { end: 1 }, difficulty: 2 },
    { title: 'Esegui 50 addominali', description: 'Crunch o varianti a tua scelta', xpReward: 30, statRewards: { str: 1 }, difficulty: 1 },
    { title: 'Salta la corda 10 minuti', description: 'Continua o a intervalli, totalizza 10 minuti', xpReward: 40, statRewards: { agi: 1 }, difficulty: 2 },
    { title: 'Stretching 15 minuti', description: 'Dedica 15 minuti allo stretching dei principali gruppi muscolari', xpReward: 25, statRewards: { agi: 1 }, difficulty: 1 },
    { title: '3 serie di burpees (x10)', description: 'Esegui 3 serie da 10 burpees con 60 sec di riposo', xpReward: 55, statRewards: { str: 1, agi: 1 }, difficulty: 3 },
  ];

  const menteQuests = [
    { title: 'Medita 10 minuti', description: 'Sessione di meditazione guidata o in silenzio', xpReward: 30, statRewards: { int: 1 }, difficulty: 1 },
    { title: 'Leggi per 30 minuti', description: 'Leggi un libro fisico o ebook, niente social', xpReward: 35, statRewards: { int: 1 }, difficulty: 1 },
    { title: 'Scrivi 3 obiettivi del giorno', description: 'Prima di iniziare, scrivi i 3 obiettivi principali', xpReward: 20, statRewards: { int: 1 }, difficulty: 1 },
    { title: 'Studia qualcosa di nuovo (30 min)', description: 'Corso online, articolo tecnico, nuova skill', xpReward: 45, statRewards: { int: 2 }, difficulty: 2 },
    { title: 'Niente social per 2 ore', description: 'Nessuna app social per un blocco di 2 ore consecutive', xpReward: 30, statRewards: { end: 1 }, difficulty: 2 },
    { title: 'Risolvi un puzzle logico', description: 'Sudoku, scacchi, problema di logica o coding challenge', xpReward: 35, statRewards: { int: 1 }, difficulty: 2 },
    { title: 'Scrivi nel diario 15 minuti', description: 'Rifletti sulla giornata e sulle emozioni', xpReward: 25, statRewards: { int: 1 }, difficulty: 1 },
    { title: 'Respirazione consapevole 5 min', description: '4-7-8 o box breathing per 5 minuti', xpReward: 20, statRewards: { vit: 1 }, difficulty: 1 },
    { title: 'Pianifica la settimana', description: 'Organizza le attività dei prossimi 7 giorni', xpReward: 30, statRewards: { int: 1 }, difficulty: 1 },
    { title: 'Guarda un documentario', description: 'Documentario educativo su natura, scienza o storia', xpReward: 30, statRewards: { int: 1 }, difficulty: 1 },
  ];

  for (const q of fitnessQuests) {
    await prisma.questTemplate.create({ data: { ...q, category: 'fitness' } });
  }
  for (const q of menteQuests) {
    await prisma.questTemplate.create({ data: { ...q, category: 'mente' } });
  }

  console.log(`Seeded ${fitnessQuests.length} fitness + ${menteQuests.length} mente quest templates`);

  const shadows = [
    { name: 'Iron', description: 'Un soldato di ferro forgiato dalla costanza fisica.', unlockCondition: 'fitness_quests_10', rank: 'E' },
    { name: 'Tank', description: 'Guerriero corazzato, resistente e inarrestabile.', unlockCondition: 'level_10', rank: 'D' },
    { name: 'Igris', description: 'Il cavaliere scarlatto. Leale e letale.', unlockCondition: 'rank_D', rank: 'D' },
    { name: 'Kaisel', description: 'Il drago alato, veloce come il pensiero.', unlockCondition: 'fitness_quests_30', rank: 'C' },
    { name: 'Tusk', description: 'La bestia primordiale, forza bruta incarnata.', unlockCondition: 'str_30', rank: 'C' },
    { name: 'Iron (Elite)', description: 'La versione potenziata del primo soldato.', unlockCondition: 'rank_C', rank: 'B' },
    { name: 'Beru', description: 'Il re delle formiche. Velocità e veleno.', unlockCondition: 'rank_B', rank: 'A' },
    { name: 'Greed', description: "L'avido serpente che divora la debolezza.", unlockCondition: 'level_50', rank: 'A' },
    { name: 'Bellion', description: 'Il grande maresciallo delle ombre.', unlockCondition: 'rank_A', rank: 'S' },
    { name: 'Shadow Sovereign', description: "L'ombra suprema. Nata dalla piena padronanza di sé.", unlockCondition: 'rank_S', rank: 'S' },
  ];

  const achievements = [
    { name: 'Arise', titleReward: 'Arise', description: 'La prima ombra è sorta.', condition: 'shadows_1' },
    { name: 'Iron Body', titleReward: 'Iron Body', description: 'STR raggiunge 30.', condition: 'str_30' },
    { name: 'Quick Step', titleReward: 'Quick Step', description: 'AGI raggiunge 30.', condition: 'agi_30' },
    { name: 'Scholar', titleReward: 'Scholar', description: 'INT raggiunge 30.', condition: 'int_30' },
    { name: 'Well Nourished', titleReward: 'Well Nourished', description: 'VIT raggiunge 30.', condition: 'vit_30' },
    { name: 'Endurance King', titleReward: 'Endurance King', description: 'END raggiunge 30.', condition: 'end_30' },
    { name: 'Hunter', titleReward: 'Hunter', description: 'Raggiunto il livello 10.', condition: 'level_10' },
    { name: 'Veteran', titleReward: 'Veteran Hunter', description: 'Raggiunto il livello 25.', condition: 'level_25' },
    { name: 'Elite', titleReward: 'Elite Hunter', description: 'Raggiunto il C-Rank.', condition: 'rank_C' },
    { name: 'Commander', titleReward: 'Commander', description: 'Raggiunto il B-Rank.', condition: 'rank_B' },
    { name: 'Shadow Warrior', titleReward: 'Shadow Warrior', description: '3 ombre sbloccate.', condition: 'shadows_3' },
    { name: 'Diligent', titleReward: 'Diligent', description: '20 quest completate in totale.', condition: 'total_quests_20' },
    { name: 'Shadow Monarch', titleReward: 'Shadow Monarch', description: 'Tutte le ombre sbloccate.', condition: 'all_shadows' },
    { name: 'Supreme', titleReward: 'Supreme Hunter', description: 'Raggiunto il S-Rank.', condition: 'rank_S' },
    { name: 'Perfect Body', titleReward: 'Perfect Body', description: 'Tutte le stat raggiungono 50.', condition: 'all_stats_50' },
  ];

  for (const s of shadows) {
    await prisma.shadow.create({ data: { ...s, rank: s.rank as any } });
  }
  for (const a of achievements) {
    await prisma.achievement.create({ data: a });
  }

  console.log(`Seeded ${shadows.length} shadows + ${achievements.length} achievements`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
