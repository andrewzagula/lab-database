import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { RecordGraph } from "@/lib/graph";
import {
  COLUMN_X, ROW_GAP, RING_RADIUS, layoutLayered, layoutRadial,
} from "@/lib/graph-layout";

const sample: RecordGraph = {
  nodes: [
    { id: "construct:CON000001", recordId: "CON000001", kind: "construct", label: "Alpha", sublabel: "100 aa", isCenter: true },
    { id: "plasmid:PL000001", recordId: "PL000001", kind: "plasmid", label: "First", sublabel: "BACTERIAL", isCenter: false },
    { id: "plasmid:PL000002", recordId: "PL000002", kind: "plasmid", label: "Second", sublabel: "MAMMALIAN", isCenter: false },
    { id: "experiment:EXP000001", recordId: "EXP000001", kind: "experiment", label: "Exp", sublabel: "INSILICO", isCenter: false },
  ],
  edges: [
    { id: "construct:CON000001->plasmid:PL000001", source: "construct:CON000001", target: "plasmid:PL000001", relation: "carries" },
    { id: "construct:CON000001->plasmid:PL000002", source: "construct:CON000001", target: "plasmid:PL000002", relation: "carries" },
    { id: "plasmid:PL000001->experiment:EXP000001", source: "plasmid:PL000001", target: "experiment:EXP000001", relation: "used-in" },
    { id: "plasmid:PL000002->experiment:EXP000001", source: "plasmid:PL000002", target: "experiment:EXP000001", relation: "used-in" },
  ],
};

describe("layoutLayered", () => {
  test("places each kind in its column, stacked by recordId", () => {
    const out = layoutLayered(sample);
    const byId = new Map(out.nodes.map((n) => [n.id, n.position]));
    assert.equal(byId.get("experiment:EXP000001")!.x, COLUMN_X.experiment);
    assert.equal(byId.get("plasmid:PL000001")!.x, COLUMN_X.plasmid);
    assert.equal(byId.get("plasmid:PL000002")!.x, COLUMN_X.plasmid);
    assert.equal(byId.get("construct:CON000001")!.x, COLUMN_X.construct);
    // two plasmids stack one ROW_GAP apart, ordered by recordId
    assert.equal(byId.get("plasmid:PL000001")!.y, 0);
    assert.equal(byId.get("plasmid:PL000002")!.y, ROW_GAP);
  });

  test("is deterministic", () => {
    assert.deepEqual(layoutLayered(sample), layoutLayered(sample));
  });
});

describe("layoutRadial", () => {
  test("centers the isCenter node at the origin and rings the rest", () => {
    const out = layoutRadial(sample);
    assert.equal(out.nodes.length, sample.nodes.length);
    const center = out.nodes.find((n) => n.id === "construct:CON000001");
    assert.deepEqual(center!.position, { x: 0, y: 0 });
    // plasmids are one hop from the construct -> inner ring radius
    const p1 = out.nodes.find((n) => n.id === "plasmid:PL000001")!;
    const radius = Math.round(Math.hypot(p1.position.x, p1.position.y));
    assert.ok(Math.abs(radius - RING_RADIUS.inner) <= 1, `radius ${radius}`);
    // experiment is two hops -> outer ring radius
    const e = out.nodes.find((n) => n.id === "experiment:EXP000001")!;
    const eradius = Math.round(Math.hypot(e.position.x, e.position.y));
    assert.ok(Math.abs(eradius - RING_RADIUS.outer) <= 1, `radius ${eradius}`);
  });

  test("is deterministic", () => {
    assert.deepEqual(layoutRadial(sample), layoutRadial(sample));
  });
});
