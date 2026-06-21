import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import XLSX from "xlsx";

const seedDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(seedDir, "..");
const repoRoot = path.resolve(appDir, "..");

const REQUIRED = {
  constructId: "CON000001",
  plasmidId: "PL000001",
  experimentId: "EXP000001",
};

const FILE_LINKS = {
  plasmid: "../Plasmid Files/Example_PL000001.gb",
  experimentFolder: "../Experiment Folders/EXP000001_mock",
  experimentFile: "../Experiment Folders/EXP000001_mock/EXP1_mock.docx",
};

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error(`Expected a SQLite file: DATABASE_URL, received ${databaseUrl ?? "nothing"}.`);
  }

  const withoutQuery = databaseUrl.slice("file:".length).split("?")[0];
  if (withoutQuery.startsWith("//")) {
    return fileURLToPath(databaseUrl);
  }

  return path.resolve(appDir, withoutQuery);
}

function readSheetRows(relativePath) {
  const workbookPath = path.resolve(repoRoot, relativePath);
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: true });
}

function isBlank(value) {
  return value == null || String(value).trim() === "";
}

function clean(value) {
  return isBlank(value) ? null : String(value).trim();
}

function countPlaceholderRows(rows, idField) {
  return rows.filter((row) => {
    if (isBlank(row[idField])) {
      return false;
    }

    return Object.entries(row).every(([key, value]) => key === idField || isBlank(value));
  }).length;
}

function requiredRow(rows, idField, id) {
  const row = rows.find((candidate) => clean(candidate[idField]) === id);
  if (!row) {
    throw new Error(`Missing required row ${id} in ${idField}.`);
  }

  const isPlaceholder = Object.entries(row).every(
    ([key, value]) => key === idField || isBlank(value),
  );
  if (isPlaceholder) {
    throw new Error(`Required row ${id} is only a blank placeholder row.`);
  }

  return row;
}

function parseBoolean(value) {
  const normalized = clean(value)?.toUpperCase();
  if (normalized == null) {
    return null;
  }
  if (["Y", "YES", "TRUE", "1"].includes(normalized)) {
    return 1;
  }
  if (["N", "NO", "FALSE", "0"].includes(normalized)) {
    return 0;
  }
  throw new Error(`Cannot parse boolean value "${value}".`);
}

function parseInteger(value) {
  if (isBlank(value)) {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Cannot parse integer value "${value}".`);
  }

  return parsed;
}

function parseDateOnly(value) {
  if (isBlank(value)) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    ).toISOString();
  }

  const text = String(value).trim();
  const dayMonthYear = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Cannot parse date value "${value}".`);
  }

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  ).toISOString();
}

function normalizeConstructId(value) {
  const normalized = clean(value);
  if (normalized?.toLowerCase() === "from import") {
    return REQUIRED.constructId;
  }
  return normalized;
}

function normalizeExperimentId(value) {
  const normalized = clean(value);
  if (normalized === "EXP_00001") {
    return REQUIRED.experimentId;
  }
  return normalized;
}

function assertFileExists(relativePath) {
  const absolutePath = path.resolve(appDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Required linked file is missing: ${relativePath}`);
  }
}

function runTransaction(db, callback) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("BEGIN IMMEDIATE TRANSACTION");
  try {
    callback();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function countTable(db, tableName) {
  return db.prepare(`SELECT count(*) AS count FROM "${tableName}"`).get().count;
}

const env = { ...readEnvFile(path.join(appDir, ".env")), ...process.env };
const dbPath = resolveSqlitePath(env.DATABASE_URL);

const constructRows = readSheetRows("CON_mock.xlsx");
const plasmidRows = readSheetRows("PL_mock.xlsx");
const experimentRows = readSheetRows("EXP_mock.xlsx");

const constructRow = requiredRow(constructRows, "CONSTRUCT_ID", REQUIRED.constructId);
const plasmidRow = requiredRow(plasmidRows, "PLASMID_ID", REQUIRED.plasmidId);
const experimentRow = requiredRow(experimentRows, "Experiment_ID", REQUIRED.experimentId);

const normalizedConstructId = normalizeConstructId(plasmidRow.CONSTRUCT_ID);
const normalizedExperimentId = normalizeExperimentId(plasmidRow.EXPERIMENT_ID);

if (normalizedConstructId !== REQUIRED.constructId) {
  throw new Error(`PL000001 must link to CON000001, received ${normalizedConstructId}.`);
}
if (normalizedExperimentId !== REQUIRED.experimentId) {
  throw new Error(`PL000001 must link to EXP000001, received ${normalizedExperimentId}.`);
}

assertFileExists(FILE_LINKS.plasmid);
assertFileExists(FILE_LINKS.experimentFile);

const construct = {
  id: REQUIRED.constructId,
  shortName: clean(constructRow.SHORT_NAME),
  proteinSequence: clean(constructRow.PROTEIN_SEQUENCE),
  length: parseInteger(constructRow.LENGTH),
};

const experiment = {
  id: REQUIRED.experimentId,
  owner: clean(experimentRow.EXPERIMENT_OWNER),
  type: clean(experimentRow.EXPERIMENT_TYPE),
  source: clean(experimentRow.EXPERIMENT_SOURCE),
  externalParty: clean(experimentRow.EXTERNAL_PARTY),
  titleAim: clean(experimentRow.EXPERIMENT_TITLE_AIM),
  startDate: parseDateOnly(experimentRow.START_DATE),
  endDate: parseDateOnly(experimentRow.END_DATE),
  folderPath: FILE_LINKS.experimentFolder,
  comments: clean(experimentRow.COMMENTS),
};

const plasmid = {
  id: REQUIRED.plasmidId,
  name: clean(plasmidRow.PLASMID_NAME),
  emptyVector: parseBoolean(plasmidRow.EMPTY_VECTOR),
  placeholderOnly: parseBoolean(plasmidRow.PLACEHOLDER_ONLY),
  hasPlasmidPrep: parseBoolean(plasmidRow["Plasmid Prep"]),
  hasGlycerolStock: parseBoolean(plasmidRow["Glycerol Stock"]),
  vectorBackbone: clean(plasmidRow["Vector backbone"]),
  insertDescription: clean(plasmidRow.INSERT),
  guideRna: clean(plasmidRow["Guide RNA"]),
  plasmidType: clean(plasmidRow.PLASMID_TYPE),
  bacterialAntibiotic: clean(plasmidRow.BACTERIAL_ANTIBIOTIC),
  mammalianAntibiotic: clean(plasmidRow.MAMMALIAN_ANTIBIOTIC),
  source: clean(plasmidRow.SOURCE),
  mammalianPromoter: clean(plasmidRow.MAMMALIAN_PROMOTER),
  bacterialOri: clean(plasmidRow.BACTERIAL_ORI),
  createdBy: clean(plasmidRow.CREATED_BY),
  createdOn: parseDateOnly(plasmidRow.CREATED_ON),
  comments: clean(plasmidRow.COMMENTS),
  description: clean(plasmidRow.DESCRIPTION),
  constructId: normalizedConstructId,
};

const db = new DatabaseSync(dbPath);

runTransaction(db, () => {
  db.prepare(`
    INSERT INTO "Construct" ("id", "shortName", "proteinSequence", "length", "updatedAt")
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT("id") DO UPDATE SET
      "shortName" = excluded."shortName",
      "proteinSequence" = excluded."proteinSequence",
      "length" = excluded."length",
      "updatedAt" = CURRENT_TIMESTAMP
  `).run(construct.id, construct.shortName, construct.proteinSequence, construct.length);

  db.prepare(`
    INSERT INTO "Experiment" (
      "id", "owner", "type", "source", "externalParty", "titleAim",
      "startDate", "endDate", "folderPath", "comments", "updatedAt"
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT("id") DO UPDATE SET
      "owner" = excluded."owner",
      "type" = excluded."type",
      "source" = excluded."source",
      "externalParty" = excluded."externalParty",
      "titleAim" = excluded."titleAim",
      "startDate" = excluded."startDate",
      "endDate" = excluded."endDate",
      "folderPath" = excluded."folderPath",
      "comments" = excluded."comments",
      "updatedAt" = CURRENT_TIMESTAMP
  `).run(
    experiment.id,
    experiment.owner,
    experiment.type,
    experiment.source,
    experiment.externalParty,
    experiment.titleAim,
    experiment.startDate,
    experiment.endDate,
    experiment.folderPath,
    experiment.comments,
  );

  db.prepare(`
    INSERT INTO "Plasmid" (
      "id", "name", "emptyVector", "placeholderOnly", "hasPlasmidPrep",
      "hasGlycerolStock", "vectorBackbone", "insertDescription", "guideRna",
      "plasmidType", "bacterialAntibiotic", "mammalianAntibiotic", "source",
      "mammalianPromoter", "bacterialOri", "createdBy", "createdOn",
      "comments", "description", "constructId", "updatedAt"
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT("id") DO UPDATE SET
      "name" = excluded."name",
      "emptyVector" = excluded."emptyVector",
      "placeholderOnly" = excluded."placeholderOnly",
      "hasPlasmidPrep" = excluded."hasPlasmidPrep",
      "hasGlycerolStock" = excluded."hasGlycerolStock",
      "vectorBackbone" = excluded."vectorBackbone",
      "insertDescription" = excluded."insertDescription",
      "guideRna" = excluded."guideRna",
      "plasmidType" = excluded."plasmidType",
      "bacterialAntibiotic" = excluded."bacterialAntibiotic",
      "mammalianAntibiotic" = excluded."mammalianAntibiotic",
      "source" = excluded."source",
      "mammalianPromoter" = excluded."mammalianPromoter",
      "bacterialOri" = excluded."bacterialOri",
      "createdBy" = excluded."createdBy",
      "createdOn" = excluded."createdOn",
      "comments" = excluded."comments",
      "description" = excluded."description",
      "constructId" = excluded."constructId",
      "updatedAt" = CURRENT_TIMESTAMP
  `).run(
    plasmid.id,
    plasmid.name,
    plasmid.emptyVector,
    plasmid.placeholderOnly,
    plasmid.hasPlasmidPrep,
    plasmid.hasGlycerolStock,
    plasmid.vectorBackbone,
    plasmid.insertDescription,
    plasmid.guideRna,
    plasmid.plasmidType,
    plasmid.bacterialAntibiotic,
    plasmid.mammalianAntibiotic,
    plasmid.source,
    plasmid.mammalianPromoter,
    plasmid.bacterialOri,
    plasmid.createdBy,
    plasmid.createdOn,
    plasmid.comments,
    plasmid.description,
    plasmid.constructId,
  );

  db.prepare(`
    INSERT INTO "ExperimentPlasmid" ("experimentId", "plasmidId")
    VALUES (?, ?)
    ON CONFLICT("experimentId", "plasmidId") DO NOTHING
  `).run(experiment.id, plasmid.id);

  db.prepare(`
    INSERT INTO "PlasmidFile" ("plasmidId", "fileName", "filePath", "fileType", "notes")
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT("plasmidId", "filePath") DO UPDATE SET
      "fileName" = excluded."fileName",
      "fileType" = excluded."fileType",
      "notes" = excluded."notes"
  `).run(
    plasmid.id,
    path.basename(FILE_LINKS.plasmid),
    FILE_LINKS.plasmid,
    "genbank",
    "Linked during Phase 2 seed import.",
  );

  db.prepare(`
    INSERT INTO "ExperimentFile" ("experimentId", "fileName", "filePath", "fileType", "notes")
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT("experimentId", "filePath") DO UPDATE SET
      "fileName" = excluded."fileName",
      "fileType" = excluded."fileType",
      "notes" = excluded."notes"
  `).run(
    experiment.id,
    path.basename(FILE_LINKS.experimentFile),
    FILE_LINKS.experimentFile,
    "docx",
    "Linked during Phase 2 seed import.",
  );
});

const counts = {
  constructs: countTable(db, "Construct"),
  plasmids: countTable(db, "Plasmid"),
  experiments: countTable(db, "Experiment"),
  experimentPlasmids: countTable(db, "ExperimentPlasmid"),
  plasmidFiles: countTable(db, "PlasmidFile"),
  experimentFiles: countTable(db, "ExperimentFile"),
};

db.close();

const seedReport = {
  generatedAt: new Date().toISOString(),
  databaseFile: path.relative(appDir, dbPath),
  imported: {
    constructId: construct.id,
    plasmidId: plasmid.id,
    experimentId: experiment.id,
  },
  skippedPlaceholderRows: {
    constructs: countPlaceholderRows(constructRows, "CONSTRUCT_ID"),
    plasmids: countPlaceholderRows(plasmidRows, "PLASMID_ID"),
    experiments: countPlaceholderRows(experimentRows, "Experiment_ID"),
  },
  normalizations: [
    {
      field: "PL000001.CONSTRUCT_ID",
      from: clean(plasmidRow.CONSTRUCT_ID),
      to: normalizedConstructId,
      note: "Linked the plasmid to its construct.",
    },
    {
      field: "PL000001.EXPERIMENT_ID",
      from: clean(plasmidRow.EXPERIMENT_ID),
      to: normalizedExperimentId,
      note: "Linked the plasmid usage to its experiment.",
    },
  ],
  fileLinks: [
    { record: plasmid.id, file: FILE_LINKS.plasmid },
    { record: experiment.id, file: FILE_LINKS.experimentFile },
  ],
  counts,
};

const reportPath = path.join(path.dirname(dbPath), "seed-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(seedReport, null, 2)}\n`);

console.log("Phase 2 seed import complete.");
console.log(
  `Imported ${construct.id}, ${plasmid.id}, and ${experiment.id}; skipped placeholder rows: ` +
    `CON=${countPlaceholderRows(constructRows, "CONSTRUCT_ID")}, ` +
    `PL=${countPlaceholderRows(plasmidRows, "PLASMID_ID")}, ` +
    `EXP=${countPlaceholderRows(experimentRows, "Experiment_ID")}.`,
);
console.log(`Normalized PL000001 CONSTRUCT_ID "from import" -> ${normalizedConstructId}.`);
console.log(`Normalized PL000001 EXPERIMENT_ID "EXP_00001" -> ${normalizedExperimentId}.`);
console.log(`Linked ${plasmid.id} to ${FILE_LINKS.plasmid}.`);
console.log(`Linked ${experiment.id} to ${FILE_LINKS.experimentFile}.`);
console.log(`Current counts: ${JSON.stringify(counts)}.`);
console.log(`Wrote data-quality report to ${path.relative(appDir, reportPath)}.`);
