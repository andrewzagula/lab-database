-- CreateTable
CREATE TABLE "Construct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortName" TEXT,
    "proteinSequence" TEXT,
    "length" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Plasmid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "emptyVector" BOOLEAN,
    "placeholderOnly" BOOLEAN,
    "hasPlasmidPrep" BOOLEAN,
    "hasGlycerolStock" BOOLEAN,
    "vectorBackbone" TEXT,
    "insertDescription" TEXT,
    "guideRna" TEXT,
    "plasmidType" TEXT,
    "bacterialAntibiotic" TEXT,
    "mammalianAntibiotic" TEXT,
    "source" TEXT,
    "mammalianPromoter" TEXT,
    "bacterialOri" TEXT,
    "createdBy" TEXT,
    "createdOn" DATETIME,
    "comments" TEXT,
    "description" TEXT,
    "constructId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plasmid_constructId_fkey" FOREIGN KEY ("constructId") REFERENCES "Construct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner" TEXT,
    "type" TEXT,
    "source" TEXT,
    "externalParty" TEXT,
    "titleAim" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "folderPath" TEXT,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExperimentPlasmid" (
    "experimentId" TEXT NOT NULL,
    "plasmidId" TEXT NOT NULL,

    PRIMARY KEY ("experimentId", "plasmidId"),
    CONSTRAINT "ExperimentPlasmid_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExperimentPlasmid_plasmidId_fkey" FOREIGN KEY ("plasmidId") REFERENCES "Plasmid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlasmidFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plasmidId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "notes" TEXT,
    CONSTRAINT "PlasmidFile_plasmidId_fkey" FOREIGN KEY ("plasmidId") REFERENCES "Plasmid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperimentFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experimentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "notes" TEXT,
    CONSTRAINT "ExperimentFile_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Plasmid_constructId_idx" ON "Plasmid"("constructId");

-- CreateIndex
CREATE INDEX "ExperimentPlasmid_plasmidId_idx" ON "ExperimentPlasmid"("plasmidId");

-- CreateIndex
CREATE INDEX "PlasmidFile_plasmidId_idx" ON "PlasmidFile"("plasmidId");

-- CreateIndex
CREATE UNIQUE INDEX "PlasmidFile_plasmidId_filePath_key" ON "PlasmidFile"("plasmidId", "filePath");

-- CreateIndex
CREATE INDEX "ExperimentFile_experimentId_idx" ON "ExperimentFile"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentFile_experimentId_filePath_key" ON "ExperimentFile"("experimentId", "filePath");
