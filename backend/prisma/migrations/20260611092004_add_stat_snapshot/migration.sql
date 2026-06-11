-- CreateTable
CREATE TABLE "StatSnapshot" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "str" INTEGER NOT NULL,
    "agi" INTEGER NOT NULL,
    "int" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "vit" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,

    CONSTRAINT "StatSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StatSnapshot_characterId_date_key" ON "StatSnapshot"("characterId", "date");

-- AddForeignKey
ALTER TABLE "StatSnapshot" ADD CONSTRAINT "StatSnapshot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
