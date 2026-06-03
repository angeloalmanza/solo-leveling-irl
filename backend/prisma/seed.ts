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

  const commonFoods = [
    { name: 'Petto di pollo', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, source: 'seed' },
    { name: 'Riso bianco cotto', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, source: 'seed' },
    { name: 'Pasta cotta', calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, source: 'seed' },
    { name: 'Uovo intero', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, source: 'seed' },
    { name: 'Latte intero', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, source: 'seed' },
    { name: "Latte d'avena", calories: 47, protein: 1, carbs: 6.6, fat: 1.5, fiber: 0.8, source: 'seed' },
    { name: 'Latte di soia', calories: 43, protein: 3.3, carbs: 2.9, fat: 1.9, fiber: 0.6, source: 'seed' },
    { name: 'Latte di mandorla', calories: 17, protein: 0.6, carbs: 1.4, fat: 1.1, fiber: 0.3, source: 'seed' },
    { name: 'Yogurt greco 0%', calories: 57, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, source: 'seed' },
    { name: 'Yogurt bianco intero', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, source: 'seed' },
    { name: 'Avena fiocchi', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, source: 'seed' },
    { name: 'Pane integrale', calories: 247, protein: 9, carbs: 41, fat: 3.5, fiber: 7, source: 'seed' },
    { name: 'Pane bianco', calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, source: 'seed' },
    { name: 'Salmone', calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, source: 'seed' },
    { name: 'Tonno in scatola al naturale', calories: 116, protein: 26, carbs: 0, fat: 1, fiber: 0, source: 'seed' },
    { name: 'Manzo magro', calories: 193, protein: 26, carbs: 0, fat: 9, fiber: 0, source: 'seed' },
    { name: 'Tacchino petto', calories: 135, protein: 30, carbs: 0, fat: 1, fiber: 0, source: 'seed' },
    { name: 'Fagioli borlotti cotti', calories: 110, protein: 8, carbs: 20, fat: 0.5, fiber: 6, source: 'seed' },
    { name: 'Lenticchie cotte', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, source: 'seed' },
    { name: 'Ceci cotti', calories: 164, protein: 9, carbs: 27, fat: 2.6, fiber: 8, source: 'seed' },
    { name: 'Tofu', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, source: 'seed' },
    { name: 'Mozzarella', calories: 254, protein: 18, carbs: 2.2, fat: 20, fiber: 0, source: 'seed' },
    { name: 'Parmigiano Reggiano', calories: 431, protein: 36, carbs: 0, fat: 29, fiber: 0, source: 'seed' },
    { name: 'Ricotta', calories: 146, protein: 11, carbs: 3, fat: 10, fiber: 0, source: 'seed' },
    { name: 'Burro', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, source: 'seed' },
    { name: 'Olio di oliva', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, source: 'seed' },
    { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, source: 'seed' },
    { name: 'Mela', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, source: 'seed' },
    { name: 'Pera', calories: 57, protein: 0.4, carbs: 15, fat: 0.1, fiber: 3.1, source: 'seed' },
    { name: 'Arancia', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, source: 'seed' },
    { name: 'Fragole', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, source: 'seed' },
    { name: 'Mirtilli', calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, source: 'seed' },
    { name: 'Uva', calories: 67, protein: 0.6, carbs: 17, fat: 0.4, fiber: 0.9, source: 'seed' },
    { name: 'Kiwi', calories: 61, protein: 1.1, carbs: 15, fat: 0.5, fiber: 3, source: 'seed' },
    { name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, source: 'seed' },
    { name: 'Pomodoro', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, source: 'seed' },
    { name: 'Insalata mista', calories: 17, protein: 1.2, carbs: 2.9, fat: 0.3, fiber: 1.3, source: 'seed' },
    { name: 'Spinaci', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, source: 'seed' },
    { name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, source: 'seed' },
    { name: 'Carote', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, source: 'seed' },
    { name: 'Zucchine', calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, source: 'seed' },
    { name: 'Patate lesse', calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, source: 'seed' },
    { name: 'Patate dolci', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, source: 'seed' },
    { name: 'Mandorle', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, source: 'seed' },
    { name: 'Noci', calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, source: 'seed' },
    { name: 'Nocciole', calories: 628, protein: 15, carbs: 17, fat: 61, fiber: 9.7, source: 'seed' },
    { name: 'Burro di arachidi', calories: 589, protein: 25, carbs: 20, fat: 50, fiber: 6, source: 'seed' },
    { name: 'Miele', calories: 304, protein: 0.3, carbs: 82, fat: 0, fiber: 0.2, source: 'seed' },
    { name: 'Cioccolato fondente 70%', calories: 598, protein: 7.8, carbs: 46, fat: 43, fiber: 10.9, source: 'seed' },
    { name: 'Proteina del siero di latte (whey)', calories: 400, protein: 80, carbs: 8, fat: 5, fiber: 0, source: 'seed' },
    { name: 'Caffè espresso', calories: 2, protein: 0.1, carbs: 0.3, fat: 0, fiber: 0, source: 'seed' },
    { name: 'Succo di arancia', calories: 45, protein: 0.7, carbs: 10, fat: 0.2, fiber: 0.2, source: 'seed' },
    { name: 'Acqua', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, source: 'seed' },
  ];

  let foodsAdded = 0;
  for (const f of commonFoods) {
    const exists = await prisma.food.findFirst({ where: { name: { equals: f.name, mode: 'insensitive' } } });
    if (!exists) {
      await prisma.food.create({ data: f });
      foodsAdded++;
    }
  }
  console.log(`Seeded ${foodsAdded} common foods`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
