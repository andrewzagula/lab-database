import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { getFullGraph, getRecordGraph, nodeId } from "@/lib/graph";
import { createTestDb, type TestDb } from "./helpers";

describe("graph data layer", () => {
  let ctx: TestDb;

  before(() => {
    ctx = createTestDb();
    const db = new DatabaseSync(ctx.dbPath);
    db.exec("PRAGMA foreign_keys = ON");
    db.prepare(`INSERT INTO "Construct" ("id","shortName","length","updatedAt") VALUES ('CON000001','Alpha',100,CURRENT_TIMESTAMP)`).run();
    db.prepare(`INSERT INTO "Construct" ("id","shortName","updatedAt") VALUES ('CON000002','Orphan',CURRENT_TIMESTAMP)`).run();
    db.prepare(`INSERT INTO "Plasmid" ("id","name","plasmidType","constructId","updatedAt") VALUES ('PL000001','First','BACTERIAL','CON000001',CURRENT_TIMESTAMP)`).run();
    db.prepare(`INSERT INTO "Plasmid" ("id","name","plasmidType","constructId","updatedAt") VALUES ('PL000002','Second','MAMMALIAN','CON000001',CURRENT_TIMESTAMP)`).run();
    db.prepare(`INSERT INTO "Experiment" ("id","titleAim","type","updatedAt") VALUES ('EXP000001','Test exp','INSILICO',CURRENT_TIMESTAMP)`).run();
    db.prepare(`INSERT INTO "ExperimentPlasmid" ("experimentId","plasmidId") VALUES ('EXP000001','PL000001')`).run();
    db.prepare(`INSERT INTO "ExperimentPlasmid" ("experimentId","plasmidId") VALUES ('EXP000001','PL000002')`).run();
    db.close();
  });

  after(() => ctx.cleanup());

  test("getFullGraph returns every record as a node and every link as an edge", () => {
    const g = getFullGraph();
    assert.equal(g.nodes.length, 5); // 2 constructs + 2 plasmids + 1 experiment
    const ids = g.nodes.map((n) => n.id).sort();
    assert.deepEqual(ids, [
      "construct:CON000001", "construct:CON000002",
      "experiment:EXP000001",
      "plasmid:PL000001", "plasmid:PL000002",
    ]);
    const edgeIds = g.edges.map((e) => e.id).sort();
    assert.deepEqual(edgeIds, [
      "construct:CON000001->plasmid:PL000001",
      "construct:CON000001->plasmid:PL000002",
      "plasmid:PL000001->experiment:EXP000001",
      "plasmid:PL000002->experiment:EXP000001",
    ]);
  });

  test("experiment focus graph expands 2 hops to the construct, de-duplicated", () => {
    const g = getRecordGraph("experiment", "EXP000001");
    assert.ok(g);
    assert.deepEqual(g.nodes.map((n) => n.id).sort(), [
      "construct:CON000001", "experiment:EXP000001",
      "plasmid:PL000001", "plasmid:PL000002",
    ]);
    const center = g.nodes.find((n) => n.id === "experiment:EXP000001");
    assert.equal(center?.isCenter, true);
    assert.equal(g.edges.length, 4); // 2 used-in + 2 carries (shared construct de-duped to one node)
  });

  test("construct focus graph reaches experiments through its plasmids", () => {
    const g = getRecordGraph("construct", "CON000001");
    assert.ok(g);
    assert.deepEqual(g.nodes.map((n) => n.id).sort(), [
      "construct:CON000001", "experiment:EXP000001",
      "plasmid:PL000001", "plasmid:PL000002",
    ]);
    assert.equal(g.nodes.find((n) => n.isCenter)?.id, "construct:CON000001");
  });

  test("plasmid focus graph shows its construct and experiments", () => {
    const g = getRecordGraph("plasmid", "PL000001");
    assert.ok(g);
    assert.deepEqual(g.nodes.map((n) => n.id).sort(), [
      "construct:CON000001", "experiment:EXP000001", "plasmid:PL000001",
    ]);
    assert.equal(g.edges.length, 2);
  });

  test("a record with no links yields just the center node", () => {
    const g = getRecordGraph("construct", "CON000002");
    assert.ok(g);
    assert.equal(g.nodes.length, 1);
    assert.equal(g.edges.length, 0);
    assert.equal(g.nodes[0].isCenter, true);
  });

  test("missing records resolve to null; nodeId namespaces ids", () => {
    assert.equal(getRecordGraph("construct", "CON999999"), null);
    assert.equal(nodeId("plasmid", "PL000001"), "plasmid:PL000001");
  });
});
