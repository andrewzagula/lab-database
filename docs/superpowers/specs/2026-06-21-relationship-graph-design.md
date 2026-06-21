# Relationship Graph & Explore Map — Design

- **Date:** 2026-06-21
- **Project:** `lab-db` (molecular-biology lab database web app)
- **Status:** Approved design, pending implementation plan
- **Author:** Andrew Zagula (with Claude)

## Summary

Add a visual, interactive relationship graph to `lab-db` with two surfaces that
share one engine:

1. **Explore map** (`/explore`) — a pannable, zoomable canvas of the entire
   dataset: every construct, plasmid, and experiment with the links between
   them. Users search to find a node and click to select it.
2. **Focus view** — the same canvas embedded on each detail page, filtered to
   that record's 2-hop neighborhood and centered on it.

Both render the same `{ nodes, edges }` model through the same React Flow
component; only the data source and layout mode differ. This directly serves the
original `readme.docx` requirement to *"trace the connection between entries"* and
reinforces the "convenient web viewer over many data sources" goal.

## Background

The app already stores the domain in SQLite and reads it through `node:sqlite`
(`src/lib/read-db.ts`). The relevant relationships are:

```
Construct ──< Plasmid >── ExperimentPlasmid ──< Experiment
```

- A plasmid carries zero or one construct (`Plasmid.constructId`).
- An experiment uses one or more plasmids (`ExperimentPlasmid` join table).
- Experiments are not linked to constructs directly; a construct is reached
  through a plasmid (a 2-hop path).

The detail pages (`src/app/{constructs,plasmids,experiments}/[id]/page.tsx`)
already fetch most of this relationship data per record, but present it as
tables only. There is currently no graph visualization and no graph library in
the dependency list.

## Decisions (resolved during brainstorming)

| Decision | Choice |
|---|---|
| Focus-view depth | Full 2-hop Experiment↔Plasmid↔Construct chain from any entry point |
| Rendering | React Flow (`@xyflow/react`) for **both** surfaces; node positions computed by us (no layout dependency) |
| Explore data | Optional, clearly-labeled demo seed; the truthful import remains the default |
| Explore route | `/explore` |
| Explore layout | Layered columns (Experiments → Plasmids → Constructs) |
| Focus layout | Radial (center node in the middle, 1-hop inner ring, 2-hop outer ring) |
| Node dragging | Allowed but not persisted |
| Selection | Single selection (no multi-select) |
| Editing from canvas | None — read-only visualization |

## Architecture

Two surfaces, one engine:

```
                ┌──────────────────────────────┐
                │  lib/graph.ts                 │
                │   getFullGraph()              │  ← Explore map data
                │   getRecordGraph(kind, id)    │  ← Focus view data
                └──────────────┬───────────────┘
                               │  { nodes, edges }  (plain objects)
                ┌──────────────▼───────────────┐
                │  lib/graph-layout.ts          │
                │   layoutLayered(graph)        │  ← Explore positions
                │   layoutRadial(graph, center) │  ← Focus positions
                └──────────────┬───────────────┘
                               │  positioned nodes
                ┌──────────────▼───────────────┐
                │  _components/relationship-    │
                │  graph.tsx  (React Flow)      │
                └───────┬───────────────┬───────┘
                        │               │
            /explore page          detail pages
         (search + side panel)    (focus mode)
```

### Component boundaries

- **`lib/graph.ts`** — pure data access (the only piece touching SQLite).
  Returns plain serializable objects. No React, no layout, no rendering.
- **`lib/graph-layout.ts`** — pure functions: graph → positioned graph.
  Deterministic, no randomness, no I/O. Fully unit-testable.
- **`_components/relationship-graph.tsx`** — the React Flow canvas. Stateless
  about data; receives nodes/edges/positions and renders. Owns only view state
  (hover, selection callbacks).
- **`/explore`** — composes the canvas with search and a selection side panel.

## Data layer (`src/lib/graph.ts`)

Shared types:

```ts
export type GraphNodeKind = "construct" | "plasmid" | "experiment";

export type GraphNode = {
  id: string;          // namespaced, e.g. "plasmid:PL000001"
  recordId: string;    // bare id, e.g. "PL000001"
  kind: GraphNodeKind;
  label: string;       // primary display (name / title / id)
  sublabel: string | null; // secondary (type, length, owner…)
  isCenter?: boolean;  // focus view only
};

export type GraphEdge = {
  id: string;          // `${source}->${target}`
  source: string;      // node id
  target: string;      // node id
  relation: "carries" | "used-in";
};

export type RecordGraph = { nodes: GraphNode[]; edges: GraphEdge[] };
```

Node ids are namespaced by kind (`"construct:CON000001"`) so the three id spaces
never collide. Edges:

- `carries`: construct → plasmid (from `Plasmid.constructId`).
- `used-in`: plasmid → experiment (from `ExperimentPlasmid`).

### `getFullGraph(): RecordGraph`

- Nodes: `SELECT` all rows from `Construct`, `Plasmid`, `Experiment`.
- Edges:
  - construct↔plasmid from `Plasmid` where `constructId IS NOT NULL`.
  - plasmid↔experiment from `ExperimentPlasmid`.
- One `withReadDb` call, a handful of queries, mapped to plain objects.

### `getRecordGraph(kind, id): RecordGraph | null`

Builds the 2-hop ego graph around the center record; returns `null` if the
center does not exist. Sets `isCenter: true` on the center node. De-duplicates
nodes and edges (a construct can be reached via several plasmids).

- **center = experiment:** experiment → its plasmids (`ExperimentPlasmid`) →
  each plasmid's construct (`Plasmid.constructId`).
- **center = plasmid:** plasmid → its construct (1) + its experiments (N).
- **center = construct:** construct → its plasmids → the experiments those
  plasmids appear in. (This is the only path that adds a query the detail page
  does not already run.)

All queries are parameterized and run through the existing `withReadDb` /
`all` / `get` helpers.

## Layout (`src/lib/graph-layout.ts`)

Pure, deterministic functions. Input: `RecordGraph`. Output: the same nodes
plus `{ position: { x, y } }`. No randomness → stable across renders and
unit-testable.

```ts
export type PositionedNode = GraphNode & { position: { x: number; y: number } };
export type PositionedGraph = { nodes: PositionedNode[]; edges: GraphEdge[] };

export function layoutRadial(graph: RecordGraph, centerId: string): PositionedGraph;
export function layoutLayered(graph: RecordGraph): PositionedGraph;
```

- **`layoutRadial`** (focus view): center node at origin; direct neighbors
  spread evenly on an inner ring (radius `r1`); 2-hop nodes on an outer ring
  (radius `r2`). Ring membership derived by BFS distance from `centerId`.
- **`layoutLayered`** (Explore map): three fixed columns by kind — Experiments
  (x=0), Plasmids (x=W), Constructs (x=2W) — each column's nodes stacked
  vertically at a fixed pitch, ordered by `recordId` for stability. This reads
  left-to-right as the Experiment→Plasmid→Construct chain. React Flow supplies
  pan/zoom/fit on top, so column height is unbounded without harming usability.

Layout constants (ring radii, column width, row pitch) live at the top of the
module as named values.

## Canvas component (`src/app/_components/relationship-graph.tsx`)

`"use client"`. Wraps `@xyflow/react`.

- **Props:** `{ nodes: PositionedNode[]; edges: GraphEdge[]; mode: "focus" | "explore"; onSelect?(node): void; selectedId?: string }`.
- **Node rendering:** one custom node type, colored by `kind`
  (construct = teal, plasmid = violet, experiment = amber), showing `label` and
  `sublabel`. The center node (focus) and the selected node (explore) get an
  emphasis ring.
- **Edges:** default React Flow edges, subtly styled; optional relation label
  on hover.
- **Controls:** `<Controls>` (zoom/fit), `<MiniMap>` (explore only), `fitView`
  on mount.
- **Interaction:** `nodesDraggable` on but positions are not persisted;
  `nodesConnectable={false}`, `edgesFocusable={false}` (read-only). `onNodeClick`
  → `onSelect` (explore) or navigate to `/<kind>s/<recordId>` (focus, via the
  node acting as a link). Center node in focus mode is the current page, so it
  does not navigate.
- **Empty state:** if a focus graph has only the center node, render a compact
  "No linked records yet" message instead of a lone node.
- **Accessibility:** container `role="application"` with an `aria-label`; nodes
  expose their label/sublabel as accessible text; keyboard focus follows React
  Flow defaults.
- **Responsiveness:** fixed-height container (e.g. `h-[28rem]`), full width,
  `fitView` keeps content framed.

## Explore page (`src/app/explore/page.tsx`)

- Server component calls `getFullGraph()` and `layoutLayered(...)`, passes the
  positioned graph to a client wrapper.
- **Client wrapper** owns:
  - **Search box** — filters by `recordId`, `label`, and `sublabel`
    (case-insensitive). Matching nodes are highlighted and the first match is
    selected/centered; non-matches dimmed.
  - **Selection side panel** — when a node is selected, shows its key fields, a
    **View detail** link (`/<kind>s/<recordId>`), and a **Focus neighborhood**
    action (navigates to the detail page, whose focus view recenters on it).
  - The `RelationshipGraph` in `mode="explore"`.
- Added to the primary nav (`_components/main-nav.tsx`) as **Explore**.

## Optional demo data (`prisma/seed-demo.mjs`, `npm run db:seed:demo`)

- Generates ~40 of each type (constructs, plasmids, experiments — roughly 120
  nodes total) with realistic interlinks: every demo plasmid is assigned a demo
  construct; every demo experiment links to 1–3 demo plasmids.
- IDs use a reserved synthetic range — `CON9xxxxx`, `PL9xxxxx`, `EXP9xxxxx` —
  so demo rows are visually distinct from and never collide with the real
  `…000001` records.
- Uses a seeded PRNG so output is deterministic and the script is idempotent
  (upserts; re-running does not duplicate).
- Supports clearing only the demo rows (e.g. `npm run db:seed:demo -- --reset`),
  leaving the real records untouched.
- The truthful `npm run db:seed` remains the default and is unchanged.
- `/data-quality` notes when demo rows are present so the distinction stays
  explicit.

## Styling / visual encoding

- Reuse the existing slate/teal palette.
- Entity hues: construct = teal, plasmid = violet, experiment = amber, each with
  a matching legend entry.
- Center (focus) / selected (explore) nodes emphasized with a ring and slightly
  larger radius.
- Edge relations distinguished subtly (e.g. solid for `carries`, dashed for
  `used-in`) with a legend.

## Testing

Using the existing `node:test` + temp-DB approach (`test/helpers.ts`):

- **`test/graph.test.ts`**
  - `getRecordGraph` for each center kind: correct 2-hop expansion, node/edge
    de-duplication, `isCenter` flag, `null` for a missing id.
  - `getFullGraph`: node count matches table counts; every `carries`/`used-in`
    edge is present; ids are namespaced and unique.
- **`test/graph-layout.test.ts`**
  - `layoutRadial`: center at origin; every node positioned; ring assignment by
    hop distance; deterministic across runs.
  - `layoutLayered`: kind → column mapping; deterministic ordering; every node
    positioned.

All graph and layout logic is in pure functions, so the suite covers the
feature without rendering React Flow. The component itself is verified by
`typecheck`, `lint`, and manual smoke testing in the browser.

## Documentation updates

- **README:** add the graph to "What you can do" (Explore map + per-record focus
  view), add `/explore` and the new files to the structure section, document the
  new `@xyflow/react` dependency with a one-line rationale, and document the
  optional `npm run db:seed:demo` command.

## Dependencies

- **New:** `@xyflow/react` (React Flow). This is the single new runtime
  dependency and is justified: an interactive pan/zoom/select graph explorer is
  its core use case, and hand-rolling a smooth infinite canvas is materially
  more code and risk. Node positions are computed by our own pure layout
  functions, so no second (layout) dependency is added.

## Scope / non-goals (YAGNI)

- Single node selection only — no multi-select, no box-select.
- No editing from the canvas (no creating/deleting nodes or edges).
- No persistence of dragged node positions.
- No clustering/force-simulation algorithm beyond the layered/radial layouts.
- No server-side graph pagination/virtualization — unnecessary at the expected
  scale (real data: 3 nodes; demo data: ~120 nodes).
- Demo data stays optional and clearly labeled; it never becomes the default.

## Risks & mitigations

- **React Flow + Next 16 / React 19 + server components:** the canvas must be a
  client component; data fetching and layout stay on the server. Mitigation:
  strict server/client boundary (data + layout server-side, render client-side).
- **Sparse real data:** the Explore map shows only 3 nodes without the demo
  seed. Mitigation: the optional demo seed; the focus view is meaningful even
  with the real data.
- **Determinism of layout:** required for stable rendering and tests.
  Mitigation: no randomness in layout; demo seed uses a seeded PRNG.

## Implementation order (for the plan)

1. `lib/graph.ts` — `getFullGraph` + `getRecordGraph` (+ tests).
2. `lib/graph-layout.ts` — `layoutLayered` + `layoutRadial` (+ tests).
3. `@xyflow/react` install; `_components/relationship-graph.tsx` canvas.
4. Focus view wired into the three detail pages.
5. `/explore` page: search + selection side panel + nav entry.
6. `prisma/seed-demo.mjs` + `db:seed:demo` script.
7. README + `/data-quality` demo-data note.
8. Final `npm test` / `typecheck` / `lint` pass.
