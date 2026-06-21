# Lab Database

A small web application for a molecular-biology lab to view, edit, create, and
trace the relationships between **constructs** (protein designs), **plasmids**
(DNA vehicles that carry constructs), and **experiments** (lab records that use
plasmids), along with their associated GenBank and document files.

The mock data lives in spreadsheets and files at the repository root; this app
imports the meaningful records into SQLite and presents them as a browsable,
editable, relationship-aware interface.

## What you can do

- Browse searchable lists of constructs, plasmids, and experiments.
- Open a detail page for any record and **trace its relationships** in either
  direction:
  - `Experiment → Plasmids used → Construct carried by each plasmid`
  - `Construct → Plasmids containing it → Experiments those plasmids appear in`
- Create and edit constructs, plasmids, and experiments with validation.
- Link and unlink plasmids to experiments (the many-to-many relationship).
- Open or download linked files, with a lightweight GenBank metadata preview
  (locus, length, topology, feature labels) for plasmid sequence files.
- Review a **data-quality summary** of what the seed imported and which messy
  values it normalized.
- Explore the entire dataset as an interactive relationship graph (pan, zoom,
  search, select) at **`/explore`**, and see a focused relationship map on every
  construct, plasmid, and experiment detail page.

## Tech stack

- **Next.js 16** (App Router, React 19) with **TypeScript**
- **Tailwind CSS v4** for styling
- **SQLite** for local persistence
- **Prisma 7** for the schema and migrations
- **`node:sqlite`** (Node 22's built-in driver) for runtime reads/writes
- **`xlsx`** for importing the mock spreadsheets
- **React Flow** (`@xyflow/react`) for the relationship graph — the one new
  runtime dependency; node positions come from our own deterministic layout, so
  no layout dependency is needed
- **`node:test` + `tsx`** for the test suite

### Why `node:sqlite` instead of the Prisma client

Prisma 7's generated client requires a driver adapter to construct
`PrismaClient` directly. Rather than add that dependency, the app keeps Prisma
for schema definition and migrations only, and reads/writes the database through
Node 22's built-in `node:sqlite` API with parameterized SQL
(`src/lib/read-db.ts` for reads, `src/lib/write-db.ts` for writes via Server
Actions). This keeps the runtime dependency footprint small.

## Data model

```
Construct ──< Plasmid >── ExperimentPlasmid ──< Experiment
                │                                     │
                └──< PlasmidFile          ExperimentFile >──┘
```

- **Construct** — `id`, short name, protein sequence, derived length.
- **Plasmid** — metadata plus an optional `constructId` (a plasmid carries zero
  or one construct).
- **Experiment** — metadata plus owner, type, dates, folder path.
- **ExperimentPlasmid** — a join table giving experiments a many-to-many
  relationship with plasmids.
- **PlasmidFile / ExperimentFile** — file metadata (name, path, type, notes)
  linked to a plasmid or experiment.

The full schema is in [`prisma/schema.prisma`](prisma/schema.prisma).

## Getting started

From this `lab-db/` folder:

```bash
npm install
cp .env.example .env        # sets DATABASE_URL to a local SQLite file
npx prisma migrate dev      # applies the migration and creates dev.db
npm run db:seed             # imports the mock data
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Then open <http://127.0.0.1:3000>.

> **Optional demo data:** run `npm run db:seed:demo` to load ~120 clearly-labeled
> synthetic records (ids `CON9*/PL9*/EXP9*`) so the `/explore` map has density.
> Remove them anytime with `npm run db:seed:demo -- --reset`. The real import is
> left untouched.

> **Note:** the app uses `node:sqlite`, which prints a one-line experimental
> warning on Node 22 — this is expected. If `npx prisma migrate dev` reports a
> generic schema-engine error in a sandboxed environment, re-run it with
> `env RUST_BACKTRACE=full RUST_LOG=trace npx prisma migrate dev`.

## Testing

```bash
npm test          # node:test suite (seed, relationships, validation, GenBank)
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

`npm test` runs four files in `test/`:

- `seed.test.ts` — runs the real seed against a throwaway database and asserts
  the imported records, normalizations, file links, idempotency, and report.
- `relationships.test.ts` — construct → plasmids, plasmid → construct/experiments,
  experiment → plasmids and their constructs.
- `validation.test.ts` — duplicate/malformed IDs, invalid dates, bad construct
  references, and duplicate links.
- `genbank.test.ts` — the GenBank parser, including the bundled sample file.

Each test file builds its own temporary SQLite database, so running the tests
never touches your `dev.db`.

## Project structure

```
lab-db/
├── prisma/
│   ├── schema.prisma        # domain schema
│   ├── migrations/          # initial SQLite migration
│   ├── seed.mjs             # idempotent mock-data import + data-quality report
│   └── seed-demo.mjs        # optional labeled synthetic data for the Explore map
├── src/
│   ├── app/                 # routes (lists, details, forms, /explore, /data-quality, /files)
│   │   ├── _components/      # shared form/nav/empty-state/graph components
│   │   └── actions.ts        # Server Actions for create/edit/link
│   └── lib/
│       ├── read-db.ts        # node:sqlite reads
│       ├── graph.ts          # graph model (full graph + per-record neighborhoods)
│       ├── graph-layout.ts   # deterministic layered + radial layouts
│       ├── write-db.ts       # node:sqlite writes + validation
│       ├── files.ts          # safe file resolution/serving
│       ├── genbank.ts        # GenBank metadata parser
│       └── seed-report.ts    # data-quality report reader
└── test/                    # node:test suite
```

## Assumptions

- Only one construct (`CON000001`), one plasmid (`PL000001`), and one experiment
  (`EXP000001`) are meaningfully populated in the mock spreadsheets.
- Rows that contain only a preallocated ID are placeholders and are **not**
  imported as real records.
- `PL000001` is assumed to contain `CON000001`.
- `EXP_00001` is normalized to `EXP000001`.
- The GenBank file `Example_PL000001.gb` is linked to `PL000001`.
- The document `EXP1_mock.docx` is linked to `EXP000001`.
- Experiment folders/files are represented as linked local paths.
- The app previews GenBank metadata and serves files; it does not replace
  specialist tools like SnapGene.

## Known mock-data normalizations

The seed cleans up known inconsistencies and records them in a git-ignored
`seed-report.json`, surfaced in the app at **`/data-quality`**:

- `PL000001.CONSTRUCT_ID` `"from import"` → `CON000001`
- `PL000001.EXPERIMENT_ID` `"EXP_00001"` → `EXP000001`
- Blank placeholder rows are counted and skipped.
- The GenBank and document files are attached to their records.

## Future improvements

- File **upload** and record **deletion** (the current scope is view/edit/link
  and read-only file serving).
- Migrate runtime data access to a Prisma driver adapter if the dependency is
  acceptable, replacing the direct `node:sqlite` layer.
- Richer GenBank rendering (feature map / sequence viewer) and in-browser
  document preview.
- A global search across IDs, names, titles, and comments.
- Authentication and per-user audit history.
```
