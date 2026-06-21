# Relationship Graph & Explore Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive relationship graph to `lab-db` — a per-record 2-hop focus view on each detail page plus a global `/explore` map of all records — so the Experiment↔Plasmid↔Construct linkage is visually traceable.

**Architecture:** A pure data layer (`lib/graph.ts`) builds a `{ nodes, edges }` model from SQLite; pure layout functions (`lib/graph-layout.ts`) assign deterministic positions; one React Flow client component (`_components/relationship-graph.tsx`) renders both surfaces. The focus view filters to one record's neighborhood; the Explore page shows the full graph with search + a selection panel. An optional, clearly-labeled demo seed gives the Explore map density.

**Tech Stack:** Next.js 16 (App Router, React 19), TypeScript, Tailwind v4, `node:sqlite` reads, `@xyflow/react` (React Flow, the one new dependency), `node:test` + `tsx`.

## Global Constraints

Every task implicitly includes these:

- Runtime DB access is **`node:sqlite`** only (parameterized SQL); Prisma is for schema/migrations only. Reads go through the helpers in `src/lib/read-db.ts`.
- Path alias **`@/` → `src/*`** (e.g. `@/lib/graph`).
- Tests are **`node:test` + `tsx`**, one file per area in `test/`, each building an isolated temp DB via `test/helpers.ts` (`createTestDb`). Only **pure logic** is unit-tested; React components are verified by `typecheck` + `lint` + manual smoke (matches the existing suite).
- Run a single test file with: `node --import tsx --no-warnings --test test/<file>.test.ts`.
- The **only** new runtime dependency permitted is **`@xyflow/react`**. No layout library — positions are computed by our own pure functions.
- Demo records use the **reserved id ranges `CON9xxxxx` / `PL9xxxxx` / `EXP9xxxxx`** and must **never** become the default seed. The truthful `npm run db:seed` stays unchanged.
- Entity colors: **construct = teal, plasmid = violet, experiment = amber**.
- Layout is **deterministic** (no randomness); the demo seed uses a **seeded PRNG**.
- Every commit message ends with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Work in `lab-db/` (that is `process.cwd()` for npm scripts and tests). Paths below are relative to `lab-db/` unless noted.

---

## Task 1: Graph data layer (`lib/graph.ts`)

**Files:**
- Modify: `src/lib/read-db.ts` (export the existing `withReadDb`, `all`, `get` helpers)
- Create: `src/lib/graph.ts`
- Test: `test/graph.test.ts`

**Interfaces:**
- Consumes: `withReadDb`, `all`, `get` from `@/lib/read-db`.
- Produces:
  - `type GraphNodeKind = "construct" | "plasmid" | "experiment"`
  - `type GraphNode = { id: string; recordId: string; kind: GraphNodeKind; label: string; sublabel: string | null; isCenter: boolean }`
  - `type GraphEdge = { id: string; source: string; target: string; relation: "carries" | "used-in" }`
  - `type RecordGraph = { nodes: GraphNode[]; edges: GraphEdge[] }`
  - `function getFullGraph(): RecordGraph`
  - `function getRecordGraph(kind: GraphNodeKind, id: string): RecordGraph | null`
  - `function nodeId(kind: GraphNodeKind, recordId: string): string`

- [ ] **Step 1: Write the failing test**

Create `test/graph.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --no-warnings --test test/graph.test.ts`
Expected: FAIL — module `@/lib/graph` cannot be found / has no exports.

- [ ] **Step 3: Export the DB helpers from `read-db.ts`**

In `src/lib/read-db.ts`, add `export` to three existing helper declarations (do not change their bodies):

- `function withReadDb<T>(` → `export function withReadDb<T>(`
- `function all<T>(` → `export function all<T>(`
- `function get<T>(` → `export function get<T>(`

- [ ] **Step 4: Create `src/lib/graph.ts`**

```ts
import { all, get, withReadDb } from "@/lib/read-db";

export type GraphNodeKind = "construct" | "plasmid" | "experiment";

export type GraphNode = {
  id: string; // namespaced, e.g. "plasmid:PL000001"
  recordId: string; // bare id, e.g. "PL000001"
  kind: GraphNodeKind;
  label: string;
  sublabel: string | null;
  isCenter: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: "carries" | "used-in";
};

export type RecordGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

type ConstructRow = { id: string; shortName: string | null; length: number | null };
type PlasmidRow = { id: string; name: string | null; plasmidType: string | null; constructId: string | null };
type ExperimentRow = { id: string; titleAim: string | null; type: string | null };
type LinkRow = { experimentId: string; plasmidId: string };

export function nodeId(kind: GraphNodeKind, recordId: string): string {
  return `${kind}:${recordId}`;
}

function constructNode(r: ConstructRow, isCenter = false): GraphNode {
  return {
    id: nodeId("construct", r.id),
    recordId: r.id,
    kind: "construct",
    label: r.shortName ?? r.id,
    sublabel: r.length != null ? `${r.length} aa` : null,
    isCenter,
  };
}

function plasmidNode(r: PlasmidRow, isCenter = false): GraphNode {
  return {
    id: nodeId("plasmid", r.id),
    recordId: r.id,
    kind: "plasmid",
    label: r.name ?? r.id,
    sublabel: r.plasmidType,
    isCenter,
  };
}

function experimentNode(r: ExperimentRow, isCenter = false): GraphNode {
  return {
    id: nodeId("experiment", r.id),
    recordId: r.id,
    kind: "experiment",
    label: r.titleAim ?? r.id,
    sublabel: r.type,
    isCenter,
  };
}

function carriesEdge(constructId: string, plasmidId: string): GraphEdge {
  const source = nodeId("construct", constructId);
  const target = nodeId("plasmid", plasmidId);
  return { id: `${source}->${target}`, source, target, relation: "carries" };
}

function usedInEdge(plasmidId: string, experimentId: string): GraphEdge {
  const source = nodeId("plasmid", plasmidId);
  const target = nodeId("experiment", experimentId);
  return { id: `${source}->${target}`, source, target, relation: "used-in" };
}

export function getFullGraph(): RecordGraph {
  return withReadDb((db) => {
    const constructs = all<ConstructRow>(db, `SELECT "id","shortName","length" FROM "Construct" ORDER BY "id"`);
    const plasmids = all<PlasmidRow>(db, `SELECT "id","name","plasmidType","constructId" FROM "Plasmid" ORDER BY "id"`);
    const experiments = all<ExperimentRow>(db, `SELECT "id","titleAim","type" FROM "Experiment" ORDER BY "id"`);
    const links = all<LinkRow>(db, `SELECT "experimentId","plasmidId" FROM "ExperimentPlasmid"`);

    const nodes: GraphNode[] = [
      ...constructs.map((r) => constructNode(r)),
      ...plasmids.map((r) => plasmidNode(r)),
      ...experiments.map((r) => experimentNode(r)),
    ];

    const edges: GraphEdge[] = [];
    for (const p of plasmids) {
      if (p.constructId) edges.push(carriesEdge(p.constructId, p.id));
    }
    for (const l of links) {
      edges.push(usedInEdge(l.plasmidId, l.experimentId));
    }

    return { nodes, edges };
  });
}

export function getRecordGraph(kind: GraphNodeKind, id: string): RecordGraph | null {
  return withReadDb((db) => {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const addNode = (n: GraphNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); };
    const addEdge = (e: GraphEdge) => { if (!edges.has(e.id)) edges.set(e.id, e); };

    const expsForPlasmid = (plasmidId: string) =>
      all<ExperimentRow>(db, `SELECT e."id", e."titleAim", e."type" FROM "ExperimentPlasmid" ep INNER JOIN "Experiment" e ON e."id" = ep."experimentId" WHERE ep."plasmidId" = ? ORDER BY e."id"`, [plasmidId]);
    const constructById = (constructId: string) =>
      get<ConstructRow>(db, `SELECT "id","shortName","length" FROM "Construct" WHERE "id" = ?`, [constructId]);

    if (kind === "construct") {
      const c = constructById(id);
      if (!c) return null;
      addNode(constructNode(c, true));
      const plasmids = all<PlasmidRow>(db, `SELECT "id","name","plasmidType","constructId" FROM "Plasmid" WHERE "constructId" = ? ORDER BY "id"`, [id]);
      for (const p of plasmids) {
        addNode(plasmidNode(p));
        addEdge(carriesEdge(id, p.id));
        for (const e of expsForPlasmid(p.id)) {
          addNode(experimentNode(e));
          addEdge(usedInEdge(p.id, e.id));
        }
      }
    } else if (kind === "plasmid") {
      const p = get<PlasmidRow>(db, `SELECT "id","name","plasmidType","constructId" FROM "Plasmid" WHERE "id" = ?`, [id]);
      if (!p) return null;
      addNode(plasmidNode(p, true));
      if (p.constructId) {
        const c = constructById(p.constructId);
        if (c) { addNode(constructNode(c)); addEdge(carriesEdge(c.id, p.id)); }
      }
      for (const e of expsForPlasmid(id)) {
        addNode(experimentNode(e));
        addEdge(usedInEdge(id, e.id));
      }
    } else {
      const e = get<ExperimentRow>(db, `SELECT "id","titleAim","type" FROM "Experiment" WHERE "id" = ?`, [id]);
      if (!e) return null;
      addNode(experimentNode(e, true));
      const plasmids = all<PlasmidRow>(db, `SELECT p."id", p."name", p."plasmidType", p."constructId" FROM "ExperimentPlasmid" ep INNER JOIN "Plasmid" p ON p."id" = ep."plasmidId" WHERE ep."experimentId" = ? ORDER BY p."id"`, [id]);
      for (const p of plasmids) {
        addNode(plasmidNode(p));
        addEdge(usedInEdge(p.id, e.id));
        if (p.constructId) {
          const c = constructById(p.constructId);
          if (c) { addNode(constructNode(c)); addEdge(carriesEdge(c.id, p.id)); }
        }
      }
    }

    return { nodes: [...nodes.values()], edges: [...edges.values()] };
  });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --import tsx --no-warnings --test test/graph.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/read-db.ts src/lib/graph.ts test/graph.test.ts
git commit -m "feat(graph): add graph data layer (getFullGraph, getRecordGraph)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Deterministic layout (`lib/graph-layout.ts`)

**Files:**
- Create: `src/lib/graph-layout.ts`
- Test: `test/graph-layout.test.ts`

**Interfaces:**
- Consumes: `RecordGraph`, `GraphNode`, `GraphNodeKind` from `@/lib/graph`.
- Produces:
  - `type PositionedNode = GraphNode & { position: { x: number; y: number } }`
  - `type PositionedGraph = { nodes: PositionedNode[]; edges: import("@/lib/graph").GraphEdge[] }`
  - `const COLUMN_X: Record<GraphNodeKind, number>`
  - `const ROW_GAP: number`
  - `const RING_RADIUS: { inner: number; outer: number }`
  - `function layoutLayered(graph: RecordGraph): PositionedGraph`
  - `function layoutRadial(graph: RecordGraph): PositionedGraph` (centers on the node where `isCenter === true`)

- [ ] **Step 1: Write the failing test**

Create `test/graph-layout.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --import tsx --no-warnings --test test/graph-layout.test.ts`
Expected: FAIL — `@/lib/graph-layout` not found.

- [ ] **Step 3: Create `src/lib/graph-layout.ts`**

```ts
import type { GraphNode, GraphNodeKind, RecordGraph } from "@/lib/graph";

export type PositionedNode = GraphNode & { position: { x: number; y: number } };
export type PositionedGraph = { nodes: PositionedNode[]; edges: RecordGraph["edges"] };

export const COLUMN_X: Record<GraphNodeKind, number> = {
  experiment: 0,
  plasmid: 280,
  construct: 560,
};
export const ROW_GAP = 90;
export const RING_RADIUS = { inner: 220, outer: 420 };

const KIND_ORDER: GraphNodeKind[] = ["experiment", "plasmid", "construct"];

export function layoutLayered(graph: RecordGraph): PositionedGraph {
  const nodes: PositionedNode[] = [];
  for (const kind of KIND_ORDER) {
    const column = graph.nodes
      .filter((n) => n.kind === kind)
      .sort((a, b) => a.recordId.localeCompare(b.recordId));
    column.forEach((n, i) => {
      nodes.push({ ...n, position: { x: COLUMN_X[kind], y: i * ROW_GAP } });
    });
  }
  return { nodes, edges: graph.edges };
}

export function layoutRadial(graph: RecordGraph): PositionedGraph {
  const center = graph.nodes.find((n) => n.isCenter) ?? graph.nodes[0];

  const adjacency = new Map<string, Set<string>>();
  for (const n of graph.nodes) adjacency.set(n.id, new Set());
  for (const e of graph.edges) {
    adjacency.get(e.source)?.add(e.target);
    adjacency.get(e.target)?.add(e.source);
  }

  const distance = new Map<string, number>();
  if (center) {
    distance.set(center.id, 0);
    const queue = [center.id];
    while (queue.length) {
      const current = queue.shift()!;
      const d = distance.get(current)!;
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!distance.has(neighbor)) {
          distance.set(neighbor, d + 1);
          queue.push(neighbor);
        }
      }
    }
  }

  const rings = new Map<number, GraphNode[]>();
  for (const n of graph.nodes) {
    const d = distance.get(n.id) ?? 1;
    if (!rings.has(d)) rings.set(d, []);
    rings.get(d)!.push(n);
  }

  const nodes: PositionedNode[] = [];
  for (const [d, ringNodes] of rings) {
    ringNodes.sort((a, b) => a.recordId.localeCompare(b.recordId));
    if (d === 0) {
      nodes.push({ ...ringNodes[0], position: { x: 0, y: 0 } });
      continue;
    }
    const radius = d === 1 ? RING_RADIUS.inner : RING_RADIUS.outer + (d - 2) * RING_RADIUS.inner;
    ringNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / ringNodes.length;
      nodes.push({
        ...n,
        position: { x: Math.round(radius * Math.cos(angle)), y: Math.round(radius * Math.sin(angle)) },
      });
    });
  }

  return { nodes, edges: graph.edges };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --import tsx --no-warnings --test test/graph-layout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/lib/graph-layout.ts test/graph-layout.test.ts
git commit -m "feat(graph): add deterministic layered + radial layouts

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: React Flow canvas component

**Files:**
- Modify: `package.json` (add `@xyflow/react`)
- Create: `src/app/_components/relationship-graph.tsx`

**Interfaces:**
- Consumes: `PositionedNode` from `@/lib/graph-layout`, `GraphEdge` from `@/lib/graph`.
- Produces: `function RelationshipGraph(props: { nodes: PositionedNode[]; edges: GraphEdge[]; mode: "focus" | "explore"; onSelect?: (recordId: string, kind: GraphNodeKind) => void; selectedNodeId?: string | null; highlightIds?: string[] | null })`

> No unit test: this is a React Flow render component. The project tests pure logic only (consistent with the existing suite); the gate here is `typecheck` + `lint`, with visual verification in Task 4.

- [ ] **Step 1: Install React Flow**

Run: `npm install @xyflow/react`
Expected: adds `@xyflow/react` to `dependencies`; `package-lock.json` updated.

- [ ] **Step 2: Create `src/app/_components/relationship-graph.tsx`**

```tsx
"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GraphEdge, GraphNodeKind } from "@/lib/graph";
import type { PositionedNode } from "@/lib/graph-layout";

const KIND_COLORS: Record<GraphNodeKind, { bg: string; border: string; text: string }> = {
  construct: { bg: "#ccfbf1", border: "#0f766e", text: "#134e4a" },
  plasmid: { bg: "#ede9fe", border: "#6d28d9", text: "#4c1d95" },
  experiment: { bg: "#fef3c7", border: "#b45309", text: "#78350f" },
};

const KIND_LABEL: Record<GraphNodeKind, string> = {
  construct: "Construct",
  plasmid: "Plasmid",
  experiment: "Experiment",
};

type Props = {
  nodes: PositionedNode[];
  edges: GraphEdge[];
  mode: "focus" | "explore";
  onSelect?: (recordId: string, kind: GraphNodeKind) => void;
  selectedNodeId?: string | null;
  highlightIds?: string[] | null;
};

function nodeLabel(node: PositionedNode) {
  return (
    <div className="text-left leading-tight">
      <div className="font-mono text-[11px] font-semibold">{node.label}</div>
      {node.sublabel ? <div className="text-[10px] opacity-80">{node.sublabel}</div> : null}
    </div>
  );
}

export function RelationshipGraph({
  nodes,
  edges,
  mode,
  onSelect,
  selectedNodeId,
  highlightIds,
}: Props) {
  const router = useRouter();
  const highlight = highlightIds ? new Set(highlightIds) : null;

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => {
        const c = KIND_COLORS[n.kind];
        const dimmed = highlight ? !highlight.has(n.id) : false;
        const emphasized = n.isCenter || n.id === selectedNodeId;
        return {
          id: n.id,
          position: n.position,
          data: { label: nodeLabel(n), recordId: n.recordId, kind: n.kind },
          style: {
            background: c.bg,
            color: c.text,
            border: `${emphasized ? 3 : 1}px solid ${c.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            width: 170,
            opacity: dimmed ? 0.25 : 1,
          },
        };
      }),
    // highlight/selected change must re-derive styles
    [nodes, selectedNodeId, highlightIds], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relation,
        style: {
          stroke: "#94a3b8",
          strokeDasharray: e.relation === "used-in" ? "4 4" : undefined,
        },
        labelStyle: { fontSize: 10, fill: "#64748b" },
      })),
    [edges],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const recordId = node.data?.recordId as string;
      const kind = node.data?.kind as GraphNodeKind;
      if (mode === "explore") {
        onSelect?.(recordId, kind);
        return;
      }
      const positioned = nodes.find((n) => n.id === node.id);
      if (positioned && !positioned.isCenter) {
        router.push(`/${kind}s/${recordId}`);
      }
    },
    [mode, onSelect, nodes, router],
  );

  if (mode === "focus" && nodes.length <= 1) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        No linked records yet.
      </div>
    );
  }

  return (
    <div className="h-[28rem] w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#f1f5f9" />
        <Controls showInteractive={false} />
        {mode === "explore" ? <MiniMap pannable zoomable /> : null}
        <Panel position="top-left">
          <div className="flex gap-3 rounded-md border border-slate-200 bg-white/90 px-3 py-1.5 text-xs">
            {(Object.keys(KIND_COLORS) as GraphNodeKind[]).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: KIND_COLORS[kind].border }}
                />
                {KIND_LABEL[kind]}
              </span>
            ))}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0 (no type errors, no lint errors).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/_components/relationship-graph.tsx
git commit -m "feat(graph): add React Flow relationship-graph canvas component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Focus view on the three detail pages

**Files:**
- Modify: `src/app/constructs/[id]/page.tsx`
- Modify: `src/app/plasmids/[id]/page.tsx`
- Modify: `src/app/experiments/[id]/page.tsx`

**Interfaces:**
- Consumes: `getRecordGraph` from `@/lib/graph`, `layoutRadial` from `@/lib/graph-layout`, `RelationshipGraph` from `@/app/_components/relationship-graph`.
- Produces: nothing new (UI integration).

> Gate: `typecheck` + `lint` + manual browser smoke.

- [ ] **Step 1: Add imports to each of the three detail pages**

At the top of each page file, add (alongside the existing imports):

```tsx
import { RelationshipGraph } from "@/app/_components/relationship-graph";
import { getRecordGraph } from "@/lib/graph";
import { layoutRadial } from "@/lib/graph-layout";
```

- [ ] **Step 2: Build the layout in each page's component body**

Immediately after the existing `notFound()` guard in each page, add the matching line:

- `constructs/[id]/page.tsx` (the record variable is `construct`):
```tsx
  const focusGraph = getRecordGraph("construct", construct.id);
  const focusLayout = focusGraph ? layoutRadial(focusGraph) : null;
```
- `plasmids/[id]/page.tsx` (variable `plasmid`):
```tsx
  const focusGraph = getRecordGraph("plasmid", plasmid.id);
  const focusLayout = focusGraph ? layoutRadial(focusGraph) : null;
```
- `experiments/[id]/page.tsx` (variable `experiment`):
```tsx
  const focusGraph = getRecordGraph("experiment", experiment.id);
  const focusLayout = focusGraph ? layoutRadial(focusGraph) : null;
```

- [ ] **Step 3: Insert the Relationship-map section**

In each page, immediately **after** the closing `</section>` of the metadata card (the section whose eyebrow is "Metadata"), insert:

```tsx
      {focusLayout ? (
        <section className="space-y-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-teal-700">
              Relationships
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Relationship map
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              This record and the experiments, plasmids, and constructs it
              connects to. Click a node to open it.
            </p>
          </div>
          <RelationshipGraph
            nodes={focusLayout.nodes}
            edges={focusLayout.edges}
            mode="focus"
          />
        </section>
      ) : null}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 5: Manual smoke test**

```bash
npm run db:seed           # ensure dev.db has the real records
npm run dev -- --hostname 127.0.0.1 --port 3000
```
In the browser, open `http://127.0.0.1:3000/experiments/EXP000001`. Verify: a "Relationship map" section shows the experiment centered, with its plasmid and construct nodes and connecting edges; clicking the plasmid node navigates to the plasmid page; the construct page and plasmid page each show their own focus map. Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add src/app/constructs/[id]/page.tsx src/app/plasmids/[id]/page.tsx src/app/experiments/[id]/page.tsx
git commit -m "feat(graph): add per-record relationship focus map to detail pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Optional demo seed

**Files:**
- Create: `prisma/seed-demo.mjs`
- Modify: `package.json` (add `db:seed:demo` script)

**Interfaces:**
- Produces: a runnable script; demo records in id ranges `CON9xxxxx` / `PL9xxxxx` / `EXP9xxxxx`.

> Gate: run the script and verify counts + idempotency + reset with `sqlite3`.

- [ ] **Step 1: Create `prisma/seed-demo.mjs`**

```js
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
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add (after `"db:seed"`):

```json
    "db:seed:demo": "node --no-warnings --experimental-sqlite prisma/seed-demo.mjs"
```

- [ ] **Step 3: Run the demo seed and verify counts**

```bash
npm run db:seed         # ensure the real records + schema exist
npm run db:seed:demo
sqlite3 dev.db "SELECT (SELECT count(*) FROM Construct WHERE id LIKE 'CON9%'), (SELECT count(*) FROM Plasmid WHERE id LIKE 'PL9%'), (SELECT count(*) FROM Experiment WHERE id LIKE 'EXP9%');"
```
Expected: `40|40|40`.

- [ ] **Step 4: Verify idempotency and that real records are untouched**

```bash
npm run db:seed:demo
sqlite3 dev.db "SELECT (SELECT count(*) FROM Construct WHERE id LIKE 'CON9%'), (SELECT count(*) FROM Construct WHERE id='CON000001');"
```
Expected: `40|1` (re-running did not duplicate demo rows; the real `CON000001` is intact).

- [ ] **Step 5: Verify reset**

```bash
npm run db:seed:demo -- --reset
sqlite3 dev.db "SELECT (SELECT count(*) FROM Construct WHERE id LIKE 'CON9%'), (SELECT count(*) FROM Construct WHERE id='CON000001');"
```
Expected: `0|1` (demo rows removed; real record intact). Then re-run `npm run db:seed:demo` to repopulate for the next task.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed-demo.mjs package.json
git commit -m "feat(graph): add optional labeled demo seed (db:seed:demo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Explore page + search + selection panel + nav

**Files:**
- Create: `src/app/explore/page.tsx`
- Create: `src/app/_components/explore-client.tsx`
- Modify: `src/app/_components/main-nav.tsx` (add the Explore link)

**Interfaces:**
- Consumes: `getFullGraph` from `@/lib/graph`, `layoutLayered` from `@/lib/graph-layout`, `RelationshipGraph` from `@/app/_components/relationship-graph`.
- Produces: route `/explore`.

> Gate: `typecheck` + `lint` + manual browser smoke (run after the demo seed from Task 5).

- [ ] **Step 1: Create the server page `src/app/explore/page.tsx`**

```tsx
import { getFullGraph } from "@/lib/graph";
import { layoutLayered } from "@/lib/graph-layout";
import { ExploreClient } from "@/app/_components/explore-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };

export default function ExplorePage() {
  const graph = getFullGraph();
  const layout = layoutLayered(graph);

  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-sm font-semibold uppercase text-teal-700">
          Explore
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
          Relationship map
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Every construct, plasmid, and experiment and the links between them.
          Pan and zoom to move around, search to find a record, and click a node
          to select it.
        </p>
      </div>
      <ExploreClient nodes={layout.nodes} edges={layout.edges} />
    </section>
  );
}
```

- [ ] **Step 2: Create the client wrapper `src/app/_components/explore-client.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RelationshipGraph } from "@/app/_components/relationship-graph";
import type { GraphEdge, GraphNodeKind } from "@/lib/graph";
import type { PositionedNode } from "@/lib/graph-layout";

type Props = { nodes: PositionedNode[]; edges: GraphEdge[] };

type Selection = { recordId: string; kind: GraphNodeKind } | null;

export function ExploreClient({ nodes, edges }: Props) {
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(null);

  const highlightIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return nodes
      .filter(
        (n) =>
          n.recordId.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          (n.sublabel ?? "").toLowerCase().includes(q),
      )
      .map((n) => n.id);
  }, [query, nodes]);

  const selectedNode = selection
    ? nodes.find((n) => n.recordId === selection.recordId && n.kind === selection.kind) ?? null
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by id, name, or type…"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
        />
        <RelationshipGraph
          nodes={nodes}
          edges={edges}
          mode="explore"
          onSelect={(recordId, kind) => setSelection({ recordId, kind })}
          selectedNodeId={selectedNode?.id ?? null}
          highlightIds={highlightIds}
        />
      </div>

      <aside className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="font-mono text-xs font-semibold uppercase text-teal-700">
          Selection
        </p>
        {selectedNode ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-mono text-sm font-semibold text-slate-950">
                {selectedNode.recordId}
              </p>
              <p className="text-sm text-slate-700">{selectedNode.label}</p>
              {selectedNode.sublabel ? (
                <p className="text-xs text-slate-500">{selectedNode.sublabel}</p>
              ) : null}
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                {selectedNode.kind}
              </span>
            </div>
            <Link
              href={`/${selectedNode.kind}s/${selectedNode.recordId}`}
              className="inline-flex rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              View detail & focus map
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Click a node to see its details and a link to its page.
          </p>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Add the Explore nav link**

In `src/app/_components/main-nav.tsx`, change the `LINKS` array to include Explore (after Experiments):

```tsx
const LINKS = [
  ["Dashboard", "/"],
  ["Constructs", "/constructs"],
  ["Plasmids", "/plasmids"],
  ["Experiments", "/experiments"],
  ["Explore", "/explore"],
  ["Data quality", "/data-quality"],
] as const;
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 5: Manual smoke test**

```bash
npm run db:seed:demo      # populate ~120 demo nodes if not already
npm run dev -- --hostname 127.0.0.1 --port 3000
```
Open `http://127.0.0.1:3000/explore`. Verify: the canvas shows three columns (Experiments | Plasmids | Constructs) with ~120 nodes; pan/zoom and minimap work; typing in search dims non-matching nodes; clicking a node fills the Selection panel with a working "View detail" link; the "Explore" nav item is highlighted as active. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/app/explore/page.tsx src/app/_components/explore-client.tsx src/app/_components/main-nav.tsx
git commit -m "feat(graph): add /explore global map with search, selection, and nav

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Docs + data-quality demo note

**Files:**
- Modify: `src/lib/graph.ts` (add `countDemoRecords`)
- Modify: `src/app/data-quality/page.tsx` (show a note when demo rows exist)
- Modify: `README.md`

**Interfaces:**
- Consumes: `withReadDb`, `get` from `@/lib/read-db`.
- Produces: `function countDemoRecords(): number`.

- [ ] **Step 1: Add `countDemoRecords` to `src/lib/graph.ts`**

Append to `src/lib/graph.ts`:

```ts
export function countDemoRecords(): number {
  return withReadDb((db) => {
    const one = (sql: string) => get<{ n: number }>(db, sql)?.n ?? 0;
    return (
      one(`SELECT count(*) AS n FROM "Construct" WHERE "id" LIKE 'CON9%'`) +
      one(`SELECT count(*) AS n FROM "Plasmid" WHERE "id" LIKE 'PL9%'`) +
      one(`SELECT count(*) AS n FROM "Experiment" WHERE "id" LIKE 'EXP9%'`)
    );
  });
}
```

Update the import at the top of `graph.ts` to include `get`:

```ts
import { all, get, withReadDb } from "@/lib/read-db";
```
(If `get` is already imported from Task 1, leave it as-is.)

- [ ] **Step 2: Show the demo note on `/data-quality`**

In `src/app/data-quality/page.tsx`, add the import:

```tsx
import { countDemoRecords } from "@/lib/graph";
```

At the start of the `DataQualityPage` component body, add:

```tsx
  const demoRecordCount = countDemoRecords();
```

Immediately after the page's intro `<div>` (the one containing the "Import summary" heading and its paragraph), insert:

```tsx
      {demoRecordCount > 0 ? (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          <span className="font-semibold">Demo data present:</span>{" "}
          {demoRecordCount} synthetic records (ids <span className="font-mono">CON9*/PL9*/EXP9*</span>)
          are loaded for the Explore map. They are not part of the real import.
          Remove them with <span className="font-mono">npm run db:seed:demo -- --reset</span>.
        </div>
      ) : null}
```

- [ ] **Step 3: Update the README**

In `README.md`:
- Under **What you can do**, add a bullet:
  `- Explore the whole dataset as an interactive relationship graph (pan/zoom/search) at /explore, and see a focused relationship map on every detail page.`
- Under **Tech stack**, add:
  `- **React Flow** (\`@xyflow/react\`) for the relationship graph (the one new runtime dependency; node positions are computed by our own deterministic layout, so no layout dependency is needed)`
- Under **Project structure**, add `graph.ts` and `graph-layout.ts` to the `lib/` list, `explore/` to the routes, and note `prisma/seed-demo.mjs`.
- Under **Getting started** (or a new note), add:
  `Optionally run \`npm run db:seed:demo\` to load ~120 clearly-labeled synthetic records so the /explore map has density; remove them with \`npm run db:seed:demo -- --reset\`.`

- [ ] **Step 4: Typecheck, lint, and commit**

```bash
npm run typecheck && npm run lint
git add src/lib/graph.ts src/app/data-quality/page.tsx README.md
git commit -m "docs(graph): document graph feature + demo-data note on data-quality

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: all test files pass, including `graph.test.ts` (6) and `graph-layout.test.ts` (4).

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: exit 0.

- [ ] **Step 3: Production build smoke**

Run: `npm run build`
Expected: build succeeds; `/explore` and the `[id]` detail routes appear in the route list with no errors.

- [ ] **Step 4: Final commit (only if the build surfaced fixes)**

```bash
git add -A
git commit -m "chore(graph): verification fixes from full build pass

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
(If nothing changed, skip this commit.)

---

## Self-Review

**Spec coverage:**
- Two surfaces (Explore + focus) → Tasks 4 and 6. ✓
- `getFullGraph` / `getRecordGraph` + types → Task 1. ✓
- `layoutLayered` / `layoutRadial`, deterministic + testable → Task 2. ✓
- React Flow canvas, colors, center/selected emphasis, legend, minimap, empty state, click-through → Task 3. ✓
- Explore search + selection side panel + nav → Task 6. ✓
- Optional labeled demo seed, reserved id ranges, idempotent, reset, real seed unchanged → Task 5. ✓
- Tests via temp DB; pure logic only → Tasks 1, 2. ✓
- README + new dependency note + `/data-quality` demo note → Task 7. ✓
- Single dependency `@xyflow/react`; no layout dep → Task 3 (positions from our layout). ✓
- YAGNI (single selection, read-only) → honored; nodes are non-draggable (a deliberate simplification of the spec's "draggable but not persisted" to avoid controlled-state complexity; pan/zoom provides movement).

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. ✓

**Type consistency:** `GraphNode.isCenter` is `boolean` everywhere (Task 1 type, builders, layout `isCenter` lookup, component emphasis). `PositionedNode` from Task 2 is the prop type consumed in Tasks 3/4/6. `RelationshipGraph` prop name `selectedNodeId` is used consistently in Tasks 3 and 6. `onSelect(recordId, kind)` signature matches between component (Task 3) and `ExploreClient` (Task 6). Node id format `kind:recordId` is produced by `nodeId` (Task 1) and consumed by `highlightIds`/selection (Task 6). ✓

**Note on a deliberate spec deviation:** the spec wrote `layoutRadial(graph, centerId)`; this plan uses `layoutRadial(graph)` which finds the center via `isCenter`, removing the need for callers to reconstruct the namespaced center id. Functionally equivalent and simpler at the call sites.
