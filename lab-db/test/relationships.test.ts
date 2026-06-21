import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  getConstructDetail,
  getExperimentDetail,
  getPlasmidDetail,
} from "@/lib/read-db";
import { createTestDb, type TestDb } from "./helpers";

describe("relationship queries", () => {
  let ctx: TestDb;

  before(() => {
    ctx = createTestDb();
    const db = new DatabaseSync(ctx.dbPath);
    db.exec("PRAGMA foreign_keys = ON");
    db.prepare(
      `INSERT INTO "Construct" ("id","shortName","updatedAt") VALUES ('CON000001','Test construct',CURRENT_TIMESTAMP)`,
    ).run();
    db.prepare(
      `INSERT INTO "Plasmid" ("id","name","constructId","updatedAt") VALUES ('PL000001','First plasmid','CON000001',CURRENT_TIMESTAMP)`,
    ).run();
    db.prepare(
      `INSERT INTO "Plasmid" ("id","name","constructId","updatedAt") VALUES ('PL000002','Second plasmid','CON000001',CURRENT_TIMESTAMP)`,
    ).run();
    db.prepare(
      `INSERT INTO "Experiment" ("id","titleAim","updatedAt") VALUES ('EXP000001','Test experiment',CURRENT_TIMESTAMP)`,
    ).run();
    db.prepare(
      `INSERT INTO "ExperimentPlasmid" ("experimentId","plasmidId") VALUES ('EXP000001','PL000001')`,
    ).run();
    db.prepare(
      `INSERT INTO "ExperimentPlasmid" ("experimentId","plasmidId") VALUES ('EXP000001','PL000002')`,
    ).run();
    db.close();
  });

  after(() => ctx.cleanup());

  test("a construct returns the plasmids that carry it", () => {
    const construct = getConstructDetail("CON000001");
    assert.ok(construct);
    assert.deepEqual(
      construct.plasmids.map((plasmid) => plasmid.id).sort(),
      ["PL000001", "PL000002"],
    );
  });

  test("a plasmid returns its construct and the experiments using it", () => {
    const plasmid = getPlasmidDetail("PL000001");
    assert.ok(plasmid);
    assert.equal(plasmid.constructId, "CON000001");
    assert.deepEqual(
      plasmid.experiments.map((experiment) => experiment.id),
      ["EXP000001"],
    );
  });

  test("an experiment returns its plasmids and each plasmid's construct", () => {
    const experiment = getExperimentDetail("EXP000001");
    assert.ok(experiment);
    assert.deepEqual(
      experiment.plasmids.map((plasmid) => plasmid.id).sort(),
      ["PL000001", "PL000002"],
    );
    for (const plasmid of experiment.plasmids) {
      assert.equal(plasmid.constructId, "CON000001");
    }
  });

  test("missing records resolve to null", () => {
    assert.equal(getConstructDetail("CON999999"), null);
    assert.equal(getPlasmidDetail("PL999999"), null);
    assert.equal(getExperimentDetail("EXP999999"), null);
  });
});
