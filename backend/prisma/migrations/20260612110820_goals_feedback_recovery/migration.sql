-- CreateEnum
CREATE TYPE "QuestFeedback" AS ENUM ('easy', 'ok', 'hard');

-- AlterTable
ALTER TABLE "DailyQuest" ADD COLUMN     "feedback" "QuestFeedback",
ADD COLUMN     "isRecovery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recoveryBonusXp" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "goals" TEXT[] DEFAULT ARRAY[]::TEXT[];

