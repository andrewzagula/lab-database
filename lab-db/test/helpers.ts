import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const appDir = process.cwd();

/** Read the initial migration's SQL so tests can build a fresh schema. */
export function getMigrationSql(): string {
  const migrationsDir = path.join(appDir, "prisma", "migrations");
  const entry = readdirSync(migrationsDir, { withFileTypes: true }).find(
    (dirent) =>
      dirent.isDirectory() &&
      existsSync(path.join(migrationsDir, dirent.name, "migration.sql")),
  );
  if (!entry) {
    throw new Error("Could not find a migration.sql to build the test schema.");
  }
  return readFileSync(
    path.join(migrationsDir, entry.name, "migration.sql"),
    "utf8",
  );
}

export type TestDb = {
  dbPath: string;
  cleanup: () => void;
};

/**
 * Create an isolated SQLite database in a temp directory, apply the schema, and
 * point DATABASE_URL at it so the app's read/write modules use it instead of
 * the developer's dev.db. Each test file runs in its own process, so setting
 * the env var here does not leak between files.
 */
export function createTestDb(): TestDb {
  const dir = mkdtempSync(path.join(tmpdir(), "labdb-test-"));
  const dbPath = path.join(dir, "test.db");

  const db = new DatabaseSync(dbPath);
  db.exec(getMigrationSql());
  db.close();

  process.env.DATABASE_URL = `file:${dbPath}`;

  return {
    dbPath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/** Run the real seed script against a specific database file. */
export function runSeed(dbPath: string): string {
  return execFileSync("node", ["--no-warnings", "prisma/seed.mjs"], {
    cwd: appDir,
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    encoding: "utf8",
  });
}

export function openReadOnly(dbPath: string): DatabaseSync {
  return new DatabaseSync(dbPath, { readOnly: true });
}
