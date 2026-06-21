# Coding Agent Execution Phases

Use this file as a runbook for completing the take-home project with a coding agent. Each phase is designed to be run as a focused agent task with clear acceptance criteria.

The goal is to build a high-quality local web app for viewing, editing, and tracing relationships between constructs, plasmids, experiments, GenBank plasmid files, and experiment notes.

Recommended stack:

- Next.js
- TypeScript
- SQLite
- Prisma
- Tailwind CSS or simple CSS modules
- `xlsx` or `exceljs` for spreadsheet import

If you choose a different stack, keep the same phases and acceptance checks.

## Current Status

Phases 0, 1, 2, 3, 4, 5, 6, and 7 are complete. The runnable app scaffold, Prisma SQLite schema, seed/import workflow, relationship-tracing detail pages, create/edit forms, experiment-plasmid relationship management, and file links with a GenBank metadata preview live in `lab-db/`; the original mock files remain at the repository root.

Verified Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, and Phase 7 state:

- Next.js App Router + TypeScript scaffold exists in `lab-db/`.
- Prisma is initialized for SQLite with `lab-db/prisma/schema.prisma` and `lab-db/prisma.config.ts`.
- Phase 0 shell routes exist for `/`, `/constructs`, `/plasmids`, and `/experiments`.
- `npm run lint`, `npx tsc --noEmit`, and `npx prisma validate` pass from `lab-db/`.
- `npm run dev -- --hostname 127.0.0.1 --port 3000` boots the app, and browser verification passed for the Phase 0 routes.
- Prisma models now exist for constructs, plasmids, experiments, plasmid files, experiment files, and `ExperimentPlasmid`.
- Initial migration `20260620032945_init` was created and applied to local SQLite database `lab-db/dev.db`.
- `npx prisma migrate status` reports one migration and an up-to-date database schema.
- `lab-db/prisma/seed.mjs` imports the meaningful mock records from `CON_mock.xlsx`, `PL_mock.xlsx`, and `EXP_mock.xlsx`.
- `npm run db:seed` runs Prisma generation and the Phase 2 seed import.
- `npx prisma db seed` is wired through `lab-db/prisma.config.ts` and runs the same seed workflow.
- Running `npm run db:seed` twice leaves exactly one construct, plasmid, experiment, experiment-plasmid link, plasmid file, and experiment file in `dev.db`.
- Seeded relationships are `EXP000001 -> PL000001 -> CON000001`, with file links to `../Plasmid Files/Example_PL000001.gb` and `../Experiment Folders/EXP000001_mock/EXP1_mock.docx`.
- Known issue: `npm install` reported dependency audit findings. Do not address these during Phase 3 unless they directly block read-only page work.
- Local toolchain note: plain `npx prisma migrate dev --name init` returned a generic schema-engine error in this environment, but the same migration completed with `env RUST_BACKTRACE=full RUST_LOG=trace npx prisma migrate dev --name init`.
- Phase 3 read-only app pages fetch from `dev.db` through `src/lib/read-db.ts`, using Node 22's built-in `node:sqlite` API with read-only parameterized SQL instead of constructing PrismaClient without an adapter.
- `/` shows counts, quick links, and relationship health checks for seeded records.
- `/constructs`, `/plasmids`, and `/experiments` show real list tables, query-param search controls, seeded records, row links, and empty states.
- `/constructs/[id]`, `/plasmids/[id]`, and `/experiments/[id]` show real read-only detail pages backed by `src/lib/read-db.ts`.
- Seeded relationship tracing works both ways: `/experiments/EXP000001 -> PL000001 -> CON000001` and `/constructs/CON000001 -> PL000001 -> EXP000001`.
- Missing detail records show route-level not-found states.
- Phase 5 create/edit routes exist for constructs, plasmids, and experiments.
- Phase 5 mutations use Server Actions and parameterized Node `node:sqlite` writes in `src/lib/write-db.ts`; the app still does not instantiate `PrismaClient`.
- Phase 5 validation covers required/unique IDs, `CON000001`/`PL000001`/`EXP000001` ID formats, valid dates, letters-only protein sequences, enum-like dropdown values, and existing construct references for plasmids.
- Phase 5 browser verification created and edited `CON000002`, `PL000002`, and `EXP000002`, confirmed persistence after refresh, and confirmed Phase 4 seeded relationship pages still work.
- Phase 6 experiment detail pages link and unlink plasmids through `ExperimentPlasmid`. `src/lib/read-db.ts` adds `listPlasmidsNotInExperiment` (mapped to plain objects for the client selector), and `src/lib/write-db.ts` adds duplicate-safe `linkPlasmidToExperiment` / `unlinkPlasmidFromExperiment`; the add selector only offers plasmids that are not already linked.
- Phase 6 verification linked `EXP000001` to a second plasmid through the real Server Action, confirmed the many-to-many path so `PL000001` appears in multiple experiments, confirmed the selector hides already-linked plasmids, and unlinked back to the seeded `EXP000001 -> PL000001` state.
- Phase 7 plasmid detail parses linked GenBank files (`src/lib/genbank.ts`) and shows locus, definition, length, topology, and de-duplicated feature labels; files download/open through the `GET /files/[kind]/[id]` route handler backed by `src/lib/files.ts`, which is restricted to the repository root and reachable only by database row id.
- Phase 7 verification confirmed `PL000001` shows `Example_PL000001.gb` with `pSpCas9(BB)-2A-G`, `9288 bp`, `circular`, and labels `Cas9`, `EGFP`, `AmpR`, `U6 promoter`, `gRNA scaffold`; `EXP000001` shows `EXP1_mock.docx`; the route serves both files with correct content types and returns `404` for unknown ids, bad kinds, and a file removed from disk, where the page shows a clear missing-file state.
- File upload, delete, and editing remain out of scope; file display is read/download only.

Next coding-agent task: start with Phase 8 only. Add a test runner with focused tests and surface seed-time data-quality normalizations. Do not build upload flows or record deletion yet.

## Phase 0: Repository And Stack Setup

**Status:** Complete as of the Phase 0 run. Keep this section as historical context.

### Goal

Create a runnable application skeleton inside this repository without losing the original mock files.

### Agent Prompt

```text
Create a new Next.js TypeScript app for this take-home project inside this repository. Keep the existing mock database files intact. Use SQLite with Prisma for persistence. Add a clean project structure, install needed dependencies, and make sure the app runs locally.

Do not implement the full product yet. Focus on setup, app boot, Prisma initialization, and basic layout scaffolding.
```

### Expected Work

- Create app files.
- Add `package.json`.
- Add Next.js TypeScript setup.
- Add Prisma setup using SQLite.
- Add basic app shell/navigation.
- Preserve:
  - `CON_mock.xlsx`
  - `PL_mock.xlsx`
  - `EXP_mock.xlsx`
  - `readme.docx`
  - `Plasmid Files/`
  - `Experiment Folders/`

### Suggested Commands

```bash
npx create-next-app@latest lab-db --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm
cd lab-db
npm install prisma @prisma/client xlsx
npx prisma init --datasource-provider sqlite
npm run dev -- --hostname 127.0.0.1 --port 3000
```

If you create the app at the repository root instead of `lab-db/`, make sure the mock files remain available and your README explains the layout.

### Acceptance Criteria

- `npm install` succeeds.
- `npm run dev` starts the app.
- Browser opens to a working app page.
- Prisma is configured for SQLite.
- Original mock files are still present.

### Stop Point

Stop after the app boots. Do not start schema/import work until the setup is verified.

## Phase 1: Database Schema

**Status:** Complete as of the Phase 1 run. Keep this section as historical context.

### Starting Context

Begin in `lab-db/`. The app uses Prisma 7, so `prisma.config.ts` supplies `DATABASE_URL` from `.env`; the Prisma schema keeps the existing SQLite datasource and now contains the real data models for this phase.

Use the schema from `TAKE_HOME_PROJECT_GUIDE.md` as the starting point. Phase 1 replaced the generated placeholder schema with real models and ran the initial migration.

### Handoff Prompt

```text
Read TAKE_HOME_PROJECT_GUIDE.md and CODING_AGENT_PHASES.md. Phase 0 is already complete in lab-db/. Complete Phase 1 only.

In lab-db/, implement the Prisma schema for constructs, plasmids, experiments, plasmid files, experiment files, and the ExperimentPlasmid join table. Preserve the existing Next.js scaffold and root mock files. Use SQLite with the existing Prisma 7 config. Run prisma format and the initial migration. Verify the relations are present and the SQLite database is created. Stop after Phase 1; do not write seed/import code or UI data pages yet.

Before finishing, summarize changed files, commands run, verification results, and any remaining issues.
```

### Goal

Create the real data model for constructs, plasmids, experiments, files, and many-to-many experiment-plasmid links.

### Agent Prompt

```text
Implement the Prisma schema for the lab database. Model constructs, plasmids, experiments, plasmid files, experiment files, and a many-to-many join table between experiments and plasmids.

Use the mock spreadsheets and README interpretation as the source of truth. Experiments should link to plasmids, not directly to constructs. A plasmid may link to one construct. Add practical timestamps and relations. Then create and run the initial migration.
```

### Required Models

- `Construct`
- `Plasmid`
- `Experiment`
- `ExperimentPlasmid`
- `PlasmidFile`
- `ExperimentFile`

### Relationship Rules

```text
Construct 1 -> many Plasmids
Experiment many -> many Plasmids
Plasmid 1 -> many PlasmidFiles
Experiment 1 -> many ExperimentFiles
```

### Acceptance Criteria

- Prisma schema exists and formats cleanly.
- Migration runs successfully.
- SQLite database is created.
- Relations support:
  - construct to plasmids
  - plasmid to construct
  - plasmid to experiments
  - experiment to plasmids
  - plasmid to files
  - experiment to files

### Verification Commands

```bash
npx prisma format
env RUST_BACKTRACE=full RUST_LOG=trace npx prisma migrate dev --name init
npx prisma validate
npm run lint
npx tsc --noEmit
npx prisma migrate status
sqlite3 dev.db ".tables"
```

### Stop Point

Stop after the schema is migrated and verified. Prisma Studio was not launched during the Phase 1 handoff because non-interactive verification covered the migration and relations.

## Phase 2: Seed And Import Mock Data

**Status:** Complete as of the Phase 2 run. Keep this section as historical context.

### Goal

Write a reliable seed script that imports the meaningful mock records and normalizes known inconsistencies.

### Agent Prompt

```text
Write a seed script that imports the meaningful records from CON_mock.xlsx, PL_mock.xlsx, and EXP_mock.xlsx into the Prisma SQLite database.

Only import rows with real data, not blank placeholder ID rows. Normalize the known mock inconsistencies: map the plasmid construct reference to CON000001, normalize EXP_00001 to EXP000001, link PL000001 to the GenBank file in Plasmid Files/Example_PL000001.gb, and link EXP000001 to the experiment note in Experiment Folders/EXP000001_mock/EXP1_mock.docx.

Make the seed script idempotent so it can be run more than once.
```

### Required Import Behavior

- Import `CON000001`.
- Import `PL000001`.
- Import `EXP000001`.
- Link `PL000001` to `CON000001`.
- Link `EXP000001` to `PL000001`.
- Link GenBank file to `PL000001`.
- Link experiment note file to `EXP000001`.
- Skip empty placeholder rows.

### Known Data Normalizations

```text
PL_mock.xlsx CONSTRUCT_ID "from import" -> CON000001
PL_mock.xlsx EXPERIMENT_ID "EXP_00001" -> EXP000001
empty HYPERLINK_TO_GB_FILE -> Plasmid Files/Example_PL000001.gb
EXP000001 folder -> Experiment Folders/EXP000001_mock/
```

### Acceptance Criteria

- `npm run db:seed` works.
- Seed can be run repeatedly without duplicating records.
- Database contains one meaningful construct, plasmid, and experiment.
- Relationships are populated correctly.
- Seed script logs what it imported and normalized.

### Verification Commands

```bash
npm run db:seed
npm run db:seed
npx prisma db seed
sqlite3 dev.db 'select "Construct", count(*) from Construct union all select "Plasmid", count(*) from Plasmid union all select "Experiment", count(*) from Experiment union all select "ExperimentPlasmid", count(*) from ExperimentPlasmid union all select "PlasmidFile", count(*) from PlasmidFile union all select "ExperimentFile", count(*) from ExperimentFile;'
sqlite3 dev.db 'select p.id, p.constructId, ep.experimentId, pf.filePath, ef.filePath from Plasmid p join ExperimentPlasmid ep on ep.plasmidId = p.id join PlasmidFile pf on pf.plasmidId = p.id join ExperimentFile ef on ef.experimentId = ep.experimentId;'
npx prisma validate
npm run lint
npx tsc --noEmit
```

Verified Phase 2 results:

```text
Construct|1
Plasmid|1
Experiment|1
ExperimentPlasmid|1
PlasmidFile|1
ExperimentFile|1

PL000001|CON000001|EXP000001|../Plasmid Files/Example_PL000001.gb|../Experiment Folders/EXP000001_mock/EXP1_mock.docx
```

### Stop Point

Stop after the database contains the correctly linked sample data.

## Phase 3: Read-Only App Shell And List Pages

**Status:** Complete as of the Phase 3 run. Keep this section as historical context.

### Goal

Build the first usable read-only interface.

### Agent Prompt

```text
Build the read-only app interface for the lab database. Add navigation and list pages for constructs, plasmids, and experiments. Each page should fetch real data from the seeded SQLite database and display useful columns, search/filter controls, empty states, and links to detail pages.

Keep the design clean, operational, and scientific. Avoid a marketing landing page.
```

### Data Access Decision

Prisma 7's generated `prisma-client` output requires a driver adapter when constructing `PrismaClient` directly. Phase 3 did not add a Prisma SQLite adapter dependency. The app uses `src/lib/read-db.ts` to resolve `DATABASE_URL="file:./dev.db"` and execute read-only parameterized SQL through Node 22's built-in `node:sqlite` API with `readOnly: true` and `PRAGMA query_only = ON`.

### Required Routes

```text
/
/constructs
/plasmids
/experiments
```

### Recommended Dashboard

The home page should show:

- Construct count.
- Plasmid count.
- Experiment count.
- Quick links to seeded records.
- Records missing key relationships, if any.

### List Page Columns

Constructs:

- ID
- Short name
- Length
- Plasmid count

Plasmids:

- ID
- Name
- Type
- Source
- Construct
- Experiment count

Experiments:

- ID
- Title/aim
- Owner
- Type
- Start date
- Plasmid count

### Acceptance Criteria

- List pages load from the database.
- Search/filter works at least client-side or via query parameters.
- Seeded records are visible.
- Clicking a row navigates to the intended detail route, even if detail pages are placeholders.
- Empty states exist.

### Verification

Verified with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Browser verification passed:

- `/` showed counts of one construct, one plasmid, and one experiment, plus quick links to `CON000001`, `PL000001`, and `EXP000001`.
- `/constructs` showed `CON000001`, short name `example`, length `1447`, and plasmid count `1`.
- `/plasmids` showed `PL000001`, name `example`, type `MAMMALIAN`, source `ADDGENE`, linked construct `CON000001`, and experiment count `1`.
- `/experiments` showed `EXP000001`, title `Example Experiment`, owner `Nick, Martyn`, type `INSILICO`, start date `2026-06-15`, and plasmid count `1`.
- `/constructs?q=not-a-real-record` showed the no-match empty state.
- `/constructs/CON000001`, `/plasmids/PL000001`, and `/experiments/EXP000001` loaded Phase 4 placeholder detail pages.
- Browser console verification reported no errors.

Local environment notes: the first sandboxed dev-server start returned `listen EPERM` for `127.0.0.1:3000`; rerunning the same command with approved local port-binding permissions succeeded. Node logs an expected experimental warning for `node:sqlite`.

### Stop Point

Stop after list pages are complete and readable.

## Phase 4: Detail Pages And Relationship Tracing

**Status:** Complete as of the Phase 4 run. Keep this section as historical context.

### Goal

Implement the core user workflow: click through connected records.

### Agent Prompt

```text
Implement detail pages for constructs, plasmids, and experiments. The main focus is relationship tracing.

Construct detail should show construct metadata, protein sequence, and all plasmids containing it. Plasmid detail should show plasmid metadata, linked construct, linked experiments, comments, description, and GenBank file. Experiment detail should show experiment metadata, linked plasmids, each plasmid's construct, and experiment files.

Make linked records clickable and show human-readable names alongside IDs.
```

### Required Routes

```text
/constructs/[id]
/plasmids/[id]
/experiments/[id]
```

### Detail Page Requirements

Construct detail:

- ID.
- Short name.
- Length.
- Protein sequence in a wrapped monospaced block.
- Related plasmids table.

Plasmid detail:

- ID.
- Name.
- Type.
- Source.
- Antibiotics.
- Promoter.
- Origin.
- Linked construct.
- Linked experiments.
- GenBank file link.
- Comments.
- Description.

Experiment detail:

- ID.
- Title/aim.
- Owner.
- Type.
- Source.
- Dates.
- Linked plasmids.
- Linked construct per plasmid.
- Experiment files/folder.
- Comments.

### Acceptance Criteria

- From an experiment, a user can click to plasmids used.
- From a plasmid, a user can click to its construct.
- From a plasmid, a user can click to experiments using it.
- From a construct, a user can click to plasmids containing it.
- Detail pages handle missing records with a clear 404 or not-found state.

### Verification

Verified with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Browser verification passed for:

```text
/constructs/CON000001
/plasmids/PL000001
/experiments/EXP000001
/constructs/CON999999
```

The seeded relationship paths work both ways:

```text
/experiments/EXP000001 -> PL000001 -> CON000001
/constructs/CON000001 -> PL000001 -> EXP000001
```

The missing route returned the custom not-found UI with a 404 response. The verified pages had content, no Next.js error overlay, and no browser page errors. File rows remain metadata/path display only; no file preview or rendering behavior was added.

### Stop Point

Stop after relationship tracing works end to end.

## Phase 5: Create And Edit Forms

**Status:** Complete as of the Phase 5 run. Keep this section as historical context.

### Goal

Add CRUD functionality for the main database objects.

### Agent Prompt

```text
Add create and edit forms for constructs, plasmids, and experiments. Use server actions or API routes consistently. Add validation for required IDs, valid dates, enum-like fields, and relationship IDs.

After creating or editing a record, navigate back to the relevant detail page and show the updated data.
```

### Required Routes Or UI

```text
/constructs/new
/constructs/[id]/edit
/plasmids/new
/plasmids/[id]/edit
/experiments/new
/experiments/[id]/edit
```

### Validation Rules

- Construct ID required and unique.
- Plasmid ID required and unique.
- Experiment ID required and unique.
- IDs should follow expected patterns:
  - `CON000001`
  - `PL000001`
  - `EXP000001`
- Dates must be valid.
- Protein sequence should be letters only, if provided.
- Enum-like fields should use dropdowns where possible.

### Dropdown Values

Experiment owners:

```text
Jeff, Steven, Li-Yao, Nick, Martyn
```

Experiment types:

```text
MOLBIOL, INSILICO, CELL
```

Experiment sources:

```text
INTERNAL, EXTERNAL
```

Plasmid types:

```text
BACTERIAL, MAMMALIAN, LENTIVECTOR, AAV
```

Plasmid sources:

```text
IN_HOUSE, ADDGENE, THERMOFISHER, EXTERNAL
```

Bacterial antibiotics:

```text
AMPICILLIN, KANAMYCIN, CHLORAMPHENICOL
```

Mammalian antibiotics:

```text
PUROMYCIN, G418
```

Promoters:

```text
CMV, CAG, UBC
```

### Acceptance Criteria

- User can create a construct.
- User can edit a construct.
- User can create a plasmid and choose a construct.
- User can edit a plasmid.
- User can create an experiment.
- User can edit an experiment.
- Invalid form submissions show useful errors.
- Data persists after refresh.

### Verification

Verified with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Browser verification passed:

- `/constructs/new` showed useful errors for bad construct ID, duplicate construct ID, and invalid protein sequence.
- `CON000002` was created, edited on `/constructs/CON000002/edit`, refreshed, and remained persisted.
- `/plasmids/new` showed useful errors for invalid construct references and invalid dropdown values.
- `PL000002` was created linked to `CON000002`, edited on `/plasmids/PL000002/edit`, refreshed, and remained persisted.
- `/experiments/new` showed useful errors for invalid dates and invalid dropdown values.
- `EXP000002` was created, edited on `/experiments/EXP000002/edit`, refreshed, and remained persisted.
- Seeded Phase 4 relationship tracing still worked: `/experiments/EXP000001 -> PL000001 -> CON000001` and `/constructs/CON000001 -> PL000001 -> EXP000001`.
- Existing file metadata remained display-only with no upload controls.
- Final browser run reported no console errors or page errors.

### Stop Point

Stop after CRUD works for the three primary models.

## Phase 6: Relationship Management

### Goal

Allow users to manage which plasmids are used in each experiment.

### Agent Prompt

```text
Add UI for linking and unlinking plasmids from experiments. The relationship should use the ExperimentPlasmid join table. On the experiment detail page, users should be able to add an existing plasmid to the experiment and remove linked plasmids. On the plasmid detail page, users should see all linked experiments.
```

### Required Features

- Add plasmid to experiment.
- Remove plasmid from experiment.
- Prevent duplicate links.
- Show linked construct information for each plasmid on experiment detail.
- Show linked experiment information on plasmid detail.

### Acceptance Criteria

- An experiment can have multiple plasmids.
- A plasmid can appear in multiple experiments.
- Duplicate links are blocked or ignored safely.
- Relationship changes persist.
- Relationship tables update immediately after changes.

### Verification

Create:

```text
EXP000002
PL000002
```

Then verify:

- `EXP000002` can link to `PL000001` and `PL000002`.
- `PL000001` can appear in both `EXP000001` and `EXP000002`.

### Stop Point

Stop after many-to-many linking is usable.

## Phase 7: File Links And GenBank Preview

### Goal

Make the file-related parts of the mock project visible and useful.

### Agent Prompt

```text
Add file display and lightweight GenBank metadata preview. Plasmid detail should show linked GenBank files with download/open links and parsed metadata where possible. Experiment detail should show linked experiment documents/folders.

Do not build a full GenBank editor. Keep this lightweight and reliable.
```

### Required Features

Plasmid file display:

- File name.
- File path.
- File type.
- Download/open link.

GenBank preview:

- Locus.
- Definition.
- Sequence length.
- Circular/linear if available.
- Selected feature labels.

Experiment file display:

- File name.
- File path.
- File type.
- Download/open link if served by the app.

### Acceptance Criteria

- `PL000001` shows `Example_PL000001.gb`.
- GenBank metadata is visible for `Example_PL000001.gb`.
- `EXP000001` shows `EXP1_mock.docx`.
- Missing files are handled clearly.

### Verification

Open `PL000001` and confirm it shows:

```text
pSpCas9(BB)-2A-G
9288 bp
Cas9
EGFP
AmpR
U6 promoter
gRNA scaffold
```

### Stop Point

Stop after files are visible and useful. Do not overbuild sequence editing.

## Phase 8: Tests And Data Quality

### Goal

Add targeted tests and data quality visibility.

### Agent Prompt

```text
Add focused tests for the seed/import logic, relationship queries, and validation behavior. Also add a small import summary or data quality view/log that documents the normalizations performed during seeding.

Keep tests practical. Prioritize the behavior most relevant to the prompt.
```

### Recommended Tests

Seed/import:

- Imports `CON000001`.
- Imports `PL000001`.
- Imports `EXP000001`.
- Skips placeholder rows.
- Normalizes `EXP_00001` to `EXP000001`.
- Links `PL000001` to `CON000001`.
- Links `EXP000001` to `PL000001`.

Relationships:

- Construct returns plasmids.
- Plasmid returns construct.
- Plasmid returns experiments.
- Experiment returns plasmids and their constructs.

Validation:

- Duplicate IDs fail.
- Invalid dates fail.
- Bad relationship IDs fail.

### Acceptance Criteria

- Tests run with one command.
- Key import and relationship behavior is covered.
- Test database does not corrupt development data.
- Data normalizations are documented in logs or UI.

### Suggested Commands

```bash
npm test
npm run lint
npm run typecheck
```

If those scripts do not exist yet, ask the coding agent to add them.

### Stop Point

Stop after the tests pass and the import behavior is documented.

## Phase 9: Product Polish

### Goal

Make the app feel complete, readable, and reviewer-friendly.

### Agent Prompt

```text
Polish the application for a take-home submission. Improve layout, loading states, empty states, errors, navigation, table readability, and form usability. Keep the interface operational and scientific, not marketing-like. Ensure all text fits and relationship navigation is easy to understand.
```

### Polish Checklist

- Clear navigation.
- Consistent page titles.
- Readable tables.
- Good empty states.
- Good error states.
- Form labels and validation messages.
- Relationship sections are obvious.
- Long protein sequence wraps correctly.
- Long comments/descriptions do not break layout.
- Mobile or narrow viewport is usable enough.
- No console errors during normal use.

### Acceptance Criteria

- App is understandable without oral explanation.
- Core workflow is obvious:

```text
Experiment -> Plasmid -> Construct
Construct -> Plasmids -> Experiments
```

- UI does not look like raw database dumps.
- Reviewer can complete core tasks in a few clicks.

### Stop Point

Stop after the app is comfortable to use.

## Phase 10: Final README And Packaging

### Goal

Prepare the project for submission.

### Agent Prompt

```text
Write the final project README for the take-home submission. Include project summary, tech stack, setup instructions, seed instructions, run instructions, test instructions, data model explanation, assumptions, known normalizations, and future improvements.

Then verify the project from a clean install flow and fix any missing steps.
```

### README Must Include

- What the app does.
- Tech stack.
- How to install.
- How to migrate/create the database.
- How to seed mock data.
- How to run locally.
- How to run tests.
- Data model explanation.
- Assumptions.
- Known mock-data fixes.
- Future improvements.

### Required Assumptions To State

- Only one construct, one plasmid, and one experiment are meaningfully populated in the mock files.
- Placeholder ID rows are skipped.
- `PL000001` is assumed to contain `CON000001`.
- `EXP_00001` is normalized to `EXP000001`.
- `Example_PL000001.gb` is linked to `PL000001`.
- `EXP1_mock.docx` is linked to `EXP000001`.
- The app previews GenBank metadata but does not replace SnapGene.

### Final Verification Commands

Run these from a clean checkout or after deleting local generated state:

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run lint
npm run typecheck
npm test
npm run dev
```

If a command is not available, either add it or document why it is not needed.

### Acceptance Criteria

- README instructions work.
- App runs locally.
- Database seeds correctly.
- Tests pass.
- No obvious console/runtime errors.
- Submission folder contains everything needed to run.

### Stop Point

Stop after a clean run-through succeeds.

## Suggested Agent Workflow

Run one phase per agent session or prompt. After each phase, ask the agent for:

- Files changed.
- Commands run.
- Verification result.
- Known issues.
- Whether the acceptance criteria are met.

Use this short follow-up after every phase:

```text
Before moving on, verify the acceptance criteria for this phase. Summarize what changed, what commands you ran, and any known issues. Do not start the next phase yet.
```

This keeps the project controlled and avoids a coding agent trying to do too much at once.

## Best First Prompt

Start with this:

```text
Read TAKE_HOME_PROJECT_GUIDE.md and CODING_AGENT_PHASES.md. Then complete Phase 0 only. Create the app scaffold, initialize Prisma with SQLite, preserve the mock files, and verify the app boots locally. Stop after Phase 0 and summarize changed files, commands run, and remaining issues.
```

Then continue phase by phase.
