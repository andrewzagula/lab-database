# Lab Database

A small web application for a molecular-biology lab to **browse, edit, create, and
visually trace the relationships** between **constructs** (protein designs),
**plasmids** (the DNA vehicles that carry them), and **experiments** — imported
from the provided mock spreadsheets and files.

> **The application lives in [`lab-db/`](lab-db).** The mock source data
> (`CON_mock.xlsx`, `PL_mock.xlsx`, `EXP_mock.xlsx`, `Plasmid Files/`,
> `Experiment Folders/`) sits at the repository root, where the importer reads it.

## Prerequisites

- **Node.js 22** — the app reads and writes SQLite through Node's built-in
  `node:sqlite`, which ships with Node 22. (You'll see a one-line "SQLite is an
  experimental feature" warning on run; that's expected.)
- npm

## Run it

```bash
cd lab-db
npm install
cp .env.example .env          # sets DATABASE_URL to a local SQLite file
npx prisma migrate dev        # creates dev.db from the schema
npm run db:seed               # imports the mock spreadsheets + files
npm run dev                   # serves http://localhost:3000
```

Then open <http://localhost:3000>.

> If `npx prisma migrate dev` reports a generic schema-engine error in a
> sandboxed shell, re-run it with
> `env RUST_BACKTRACE=full RUST_LOG=trace npx prisma migrate dev`.

### Optional — populate the Explore map

The real mock data is intentionally only **3 records** (one construct, one
plasmid, one experiment; the remaining spreadsheet rows are blank placeholders).
To see the global graph with some density:

```bash
npm run db:seed:demo              # ~120 clearly-labeled synthetic records (CON9*/PL9*/EXP9*)
npm run db:seed:demo -- --reset   # remove them again
```

These synthetic records use a reserved id range so they're never confused with
the real data, and the real import stays the default.

## Test it

```bash
cd lab-db
npm test          # node:test suite: seed/import, relationship queries, validation,
                  #   GenBank parser, and the graph + layout logic
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

Each test builds its own throwaway SQLite database, so the suite never touches
your `dev.db`.

## What to look at

- **Dashboard (`/`)** — record counts, relationship-health checks, quick links.
- **Lists** (`/constructs`, `/plasmids`, `/experiments`) — searchable tables.
- **Detail pages** — metadata, a **Relationship map** centered on the record, and
  two-way tracing: from an experiment → the plasmids it uses → the construct each
  plasmid carries, and back the other way.
- **Create / edit** — forms with validation for all three record types.
- **Files** — GenBank (`.gb`) metadata preview (locus, length, topology,
  features) with open/download, plus linked experiment documents.
- **Explore (`/explore`)** — the entire dataset as an interactive graph: pan and
  zoom, search to find a record, click a node to highlight its connections and
  open an info popup, and an **Enlarge** (fullscreen) view.
- **Data quality (`/data-quality`)** — what the seed imported, which blank
  placeholder rows it skipped, and the messy identifiers it normalized.

## More detail

See **[`lab-db/README.md`](lab-db/README.md)** for the data model, tech-stack
rationale, project structure, assumptions, and the known mock-data
normalizations.
