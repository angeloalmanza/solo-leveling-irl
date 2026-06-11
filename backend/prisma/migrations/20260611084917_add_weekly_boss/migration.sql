-- CreateTable
CREATE TABLE "WeeklyBoss" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lore" TEXT NOT NULL,
    "xpReward" INTEGER NOT NULL,
    "statRewards" JSONB NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "defeatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyBoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyBossTask" (
    "id" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WeeklyBossTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyBoss_characterId_weekStart_key" ON "WeeklyBoss"("characterId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyBoss" ADD CONSTRAINT "WeeklyBoss_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyBossTask" ADD CONSTRAINT "WeeklyBossTask_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "WeeklyBoss"("id") ON DELETE CASCADE ON UPDATE CASCADE;
