import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  emptyConstructValues,
  emptyExperimentValues,
  emptyPlasmidValues,
} from "@/lib/form-options";
import {
  createConstruct,
  createExperiment,
  createPlasmid,
  linkPlasmidToExperiment,
} from "@/lib/write-db";
import { createTestDb, type TestDb } from "./helpers";

describe("validation and write behavior", () => {
  let ctx: TestDb;

  before(() => {
    ctx = createTestDb();
  });

  after(() => ctx.cleanup());

  test("creates a valid construct", () => {
    const result = createConstruct({
      ...emptyConstructValues,
      id: "CON000001",
      shortName: "Test construct",
    });
    assert.equal(result.ok, true);
  });

  test("rejects a duplicate construct id", () => {
    const result = createConstruct({ ...emptyConstructValues, id: "CON000001" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.state.errors.id);
    }
  });

  test("rejects a malformed construct id", () => {
    const result = createConstruct({ ...emptyConstructValues, id: "NOT-AN-ID" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.state.errors.id);
    }
  });

  test("rejects an experiment with an invalid date", () => {
    const result = createExperiment({
      ...emptyExperimentValues,
      id: "EXP000001",
      startDate: "2026-13-40",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.state.errors.startDate);
    }
  });

  test("rejects a plasmid that references a non-existent construct", () => {
    const result = createPlasmid({
      ...emptyPlasmidValues,
      id: "PL000001",
      constructId: "CON999999",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.state.errors.constructId);
    }
  });

  test("blocks duplicate experiment-plasmid links", () => {
    assert.equal(
      createExperiment({ ...emptyExperimentValues, id: "EXP000002" }).ok,
      true,
    );
    assert.equal(
      createPlasmid({ ...emptyPlasmidValues, id: "PL000002" }).ok,
      true,
    );
    assert.equal(linkPlasmidToExperiment("EXP000002", "PL000002").ok, true);

    const duplicate = linkPlasmidToExperiment("EXP000002", "PL000002");
    assert.equal(duplicate.ok, false);
  });
});
