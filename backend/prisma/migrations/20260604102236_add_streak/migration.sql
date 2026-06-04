-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "bestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastQuestDate" DATE,
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;
