-- CreateTable
CREATE TABLE "BodyLog" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weight" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "chest" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BodyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BodyLog_characterId_date_key" ON "BodyLog"("characterId", "date");

-- AddForeignKey
ALTER TABLE "BodyLog" ADD CONSTRAINT "BodyLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
