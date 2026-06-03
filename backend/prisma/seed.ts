import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
}

main().catch(console.error).finally(() => prisma.$disconnect());
