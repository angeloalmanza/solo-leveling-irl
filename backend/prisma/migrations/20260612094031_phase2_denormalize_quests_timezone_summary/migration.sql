-- DropForeignKey
ALTER TABLE "DailyQuest" DROP CONSTRAINT "DailyQuest_questTemplateId_fkey";

-- DropIndex
DROP INDEX "DailyQuest_characterId_questTemplateId_date_key";

-- AlterTable
ALTER TABLE "DailyQuest" ADD COLUMN     "category" "QuestCategory" NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "statRewards" JSONB NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "xpReward" INTEGER NOT NULL,
ALTER COLUMN "questTemplateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome';

-- CreateTable
CREATE TABLE "WeeklySummary" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySummary_characterId_weekStart_key" ON "WeeklySummary"("characterId", "weekStart");

-- CreateIndex
CREATE INDEX "DailyQuest_characterId_date_idx" ON "DailyQuest"("characterId", "date");

-- CreateIndex
CREATE INDEX "MealLog_characterId_date_idx" ON "MealLog"("characterId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MealLog_characterId_date_mealType_key" ON "MealLog"("characterId", "date", "mealType");

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_questTemplateId_fkey" FOREIGN KEY ("questTemplateId") REFERENCES "QuestTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySummary" ADD CONSTRAINT "WeeklySummary_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

