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

## Phase 0: Repository And Stack Setup

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
npx create-next-app@latest lab-db --ts
cd lab-db
npm install prisma @prisma/client xlsx
npx prisma init --datasource-provider sqlite
npm run dev
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
npx prisma migrate dev --name init
npx prisma studio
```

### Stop Point

Stop after the schema is migrated and visible in Prisma Studio.

## Phase 2: Seed And Import Mock Data

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
npx prisma studio
```

Optional verification query:

```bash
npx prisma db seed
```

### Stop Point

Stop after the database contains the correctly linked sample data.

## Phase 3: Read-Only App Shell And List Pages

### Goal

Build the first usable read-only interface.

### Agent Prompt

```text
Build the read-only app interface for the lab database. Add navigation and list pages for constructs, plasmids, and experiments. Each page should fetch real data from Prisma and display useful columns, search/filter controls, empty states, and links to detail pages.

Keep the design clean, operational, and scientific. Avoid a marketing landing page.
```

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

- Run `npm run dev`.
- Open the app in a browser.
- Visit each list page.
- Confirm seeded data appears.

### Stop Point

Stop after list pages are complete and readable.

## Phase 4: Detail Pages And Relationship Tracing

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

Manually verify:

```text
/experiments/EXP000001 -> PL000001 -> CON000001
/constructs/CON000001 -> PL000001 -> EXP000001
```

### Stop Point

Stop after relationship tracing works end to end.

## Phase 5: Create And Edit Forms

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

Create a second construct, plasmid, and experiment manually through the UI. Refresh the app and confirm they persist.

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
