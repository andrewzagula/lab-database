import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const seedDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(seedDir, "..");

const COUNT = 40;
const PLASMID_TYPES = ["BACTERIAL", "MAMMALIAN", "LENTIVIRAL", "AAV"];
const EXPERIMENT_TYPES = ["INSILICO", "INVITRO", "INVIVO"];

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8").split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        let v = l.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return [l.slice(0, i).trim(), v];
      }),
  );
}

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error(`Expected a SQLite file: DATABASE_URL, received ${databaseUrl ?? "nothing"}.`);
  }
  const withoutQuery = databaseUrl.slice("file:".length).split("?")[0];
  if (withoutQuery.startsWith("//")) return fileURLToPath(databaseUrl);
  return path.resolve(appDir, withoutQuery);
}

// Deterministic PRNG (mulberry32) so the demo data is stable + idempotent.
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const env = { ...readEnvFile(path.join(appDir, ".env")), ...process.env };
const dbPath = resolveSqlitePath(env.DATABASE_URL);
const reset = process.argv.includes("--reset");

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

if (reset) {
  db.exec(`DELETE FROM "ExperimentPlasmid" WHERE "experimentId" LIKE 'EXP9%' OR "plasmidId" LIKE 'PL9%'`);
  db.exec(`DELETE FROM "Experiment" WHERE "id" LIKE 'EXP9%'`);
  db.exec(`DELETE FROM "Plasmid" WHERE "id" LIKE 'PL9%'`);
  db.exec(`DELETE FROM "Construct" WHERE "id" LIKE 'CON9%'`);
  db.close();
  console.log("Removed demo records (CON9*/PL9*/EXP9*).");
  process.exit(0);
}

const rng = makeRng(20260621);
const pad = (n) => String(900000 + n).padStart(6, "0");
const constructId = (n) => `CON${pad(n)}`;
const plasmidId = (n) => `PL${pad(n)}`;
const experimentId = (n) => `EXP${pad(n)}`;
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

const upConstruct = db.prepare(`INSERT INTO "Construct" ("id","shortName","length","updatedAt") VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT("id") DO UPDATE SET "shortName"=excluded."shortName","length"=excluded."length"`);
const upPlasmid = db.prepare(`INSERT INTO "Plasmid" ("id","name","plasmidType","constructId","updatedAt") VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT("id") DO UPDATE SET "name"=excluded."name","plasmidType"=excluded."plasmidType","constructId"=excluded."constructId"`);
const upExperiment = db.prepare(`INSERT INTO "Experiment" ("id","titleAim","type","updatedAt") VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT("id") DO UPDATE SET "titleAim"=excluded."titleAim","type"=excluded."type"`);
const upLink = db.prepare(`INSERT INTO "ExperimentPlasmid" ("experimentId","plasmidId") VALUES (?,?) ON CONFLICT("experimentId","plasmidId") DO NOTHING`);

db.exec("BEGIN");
for (let i = 1; i <= COUNT; i++) {
  upConstruct.run(constructId(i), `Demo construct ${i}`, 100 + Math.floor(rng() * 1400));
}
for (let i = 1; i <= COUNT; i++) {
  const c = constructId(1 + Math.floor(rng() * COUNT));
  upPlasmid.run(plasmidId(i), `Demo plasmid ${i}`, pick(PLASMID_TYPES), c);
}
for (let i = 1; i <= COUNT; i++) {
  upExperiment.run(experimentId(i), `Demo experiment ${i}`, pick(EXPERIMENT_TYPES));
  const links = 1 + Math.floor(rng() * 3);
  const used = new Set();
  for (let k = 0; k < links; k++) used.add(plasmidId(1 + Math.floor(rng() * COUNT)));
  for (const pid of used) upLink.run(experimentId(i), pid);
}
db.exec("COMMIT");
db.close();

console.log(`Demo seed complete: ${COUNT} constructs, ${COUNT} plasmids, ${COUNT} experiments (CON9*/PL9*/EXP9*). Run with --reset to remove.`);
