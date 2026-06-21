import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { createTestDb, openReadOnly, runSeed, type TestDb } from "./helpers";

describe("seed/import", () => {
  let ctx: TestDb;
  let output = "";

  before(() => {
    ctx = createTestDb();
    // Run twice to also exercise idempotency (ON CONFLICT upserts).
    runSeed(ctx.dbPath);
    output = runSeed(ctx.dbPath);
  });

  after(() => ctx.cleanup());

  function column(table: string, col = "id"): unknown[] {
    const db = openReadOnly(ctx.dbPath);
    const rows = db.prepare(`SELECT "${col}" AS v FROM "${table}" ORDER BY 1`).all();
    db.close();
    return rows.map((row) => (row as { v: unknown }).v);
  }

  function count(table: string): number {
    const db = openReadOnly(ctx.dbPath);
    const row = db.prepare(`SELECT count(*) AS c FROM "${table}"`).get() as {
      c: number;
    };
    db.close();
    return row.c;
  }

  test("imports only the three meaningful records", () => {
    assert.deepEqual(column("Construct"), ["CON000001"]);
    assert.deepEqual(column("Plasmid"), ["PL000001"]);
    assert.deepEqual(column("Experiment"), ["EXP000001"]);
  });

  test("normalizes PL000001 CONSTRUCT_ID 'from import' to CON000001", () => {
    assert.deepEqual(column("Plasmid", "constructId"), ["CON000001"]);
  });

  test("links EXP000001 to PL000001 (normalizing EXP_00001)", () => {
    const db = openReadOnly(ctx.dbPath);
    const row = db
      .prepare(`SELECT "experimentId" AS e, "plasmidId" AS p FROM "ExperimentPlasmid"`)
      .get() as { e: string; p: string };
    db.close();
    assert.equal(row.e, "EXP000001");
    assert.equal(row.p, "PL000001");
  });

  test("attaches the GenBank file and experiment document", () => {
    assert.deepEqual(column("PlasmidFile", "fileName"), ["Example_PL000001.gb"]);
    assert.deepEqual(column("ExperimentFile", "fileName"), ["EXP1_mock.docx"]);
  });

  test("is idempotent: no duplicate rows after two runs", () => {
    for (const table of [
      "Construct",
      "Plasmid",
      "Experiment",
      "ExperimentPlasmid",
      "PlasmidFile",
      "ExperimentFile",
    ]) {
      assert.equal(count(table), 1, `${table} should hold exactly one row`);
    }
  });

  test("documents the normalizations it performed", () => {
    assert.match(output, /EXP_00001/);
    assert.match(output, /from import/);
    assert.match(output, /CON000001/);
  });

  test("writes a data-quality report next to the database", () => {
    const reportPath = path.join(path.dirname(ctx.dbPath), "seed-report.json");
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
      imported: { constructId: string };
      normalizations: { field: string }[];
    };
    assert.equal(report.imported.constructId, "CON000001");
    const fields = report.normalizations.map((entry) => entry.field);
    assert.ok(fields.includes("PL000001.CONSTRUCT_ID"));
    assert.ok(fields.includes("PL000001.EXPERIMENT_ID"));
  });
});
