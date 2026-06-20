# Take-Home Project Guide

For a phase-by-phase coding-agent runbook, use `CODING_AGENT_PHASES.md`. That file breaks this project into executable stages with prompts, acceptance criteria, and verification commands.

## What This Project Is

This repository is a mock specification for a small lab database application. It is not an existing app yet. The provided Excel, Word, and GenBank files define the domain, sample data, and expected relationships.

Your goal is to build a runnable web application that lets users view, edit, create, and trace relationships between:

- Constructs: protein designs represented by amino-acid sequences.
- Plasmids: physical DNA vehicles that contain constructs.
- Experiments: lab records that use one or more plasmids.
- Plasmid files: GenBank sequence files linked to plasmids.
- Experiment folders/files: notes and data linked to experiments.

The most important user workflow is relationship tracing:

```text
Experiment -> Plasmids used -> Construct carried by each plasmid
Construct -> Plasmids containing it -> Experiments where those plasmids appear
Plasmid -> Construct + Experiments + GenBank file
```

## What The README Is Asking For

The `readme.docx` asks for:

> a compressed folder we can run and open the frontend in a browser to view and edit anything in the mock database, and trace the connection between entries.

In practical terms, this means the final submission should include:

- A frontend that can be opened in a browser.
- A backend or database layer that stores records.
- A way to load the mock data.
- CRUD functionality for constructs, plasmids, and experiments.
- Relationship navigation between entries.
- Clear instructions for installing and running the project.

Do not treat this as merely a spreadsheet viewer. The stronger interpretation is: use the spreadsheets as seed data, then build a real application around the inferred data model.

## Recommended Technology Stack

A strong, practical stack for a take-home project:

- Next.js with TypeScript for frontend and backend routes.
- SQLite for local persistence.
- Prisma as the ORM.
- Tailwind CSS or plain CSS modules for styling.
- `xlsx` or `exceljs` for importing the Excel files.
- Basic file handling for GenBank and experiment document paths.

This stack is easy to run locally, easy to package, and does not require a hosted database.

Alternative acceptable stacks:

- React + Express + SQLite.
- Django + SQLite.
- FastAPI + React + SQLite.
- Rails + SQLite.

Pick the stack you can finish confidently. A complete, polished small app is better than an ambitious unfinished one.

## Source Files And Their Meaning

### `CON_mock.xlsx`

Construct database.

Important fields:

- `CONSTRUCT_ID`
- `SHORT_NAME`
- `PROTEIN_SEQUENCE`
- `LENGTH`

Only `CON000001` is meaningfully populated. Other rows are mostly preallocated IDs.

The `LENGTH` field is derived from the protein sequence.

### `PL_mock.xlsx`

Plasmid database.

Important fields:

- `PLASMID_ID`
- `PLASMID_NAME`
- `EMPTY_VECTOR`
- `Plasmid Prep`
- `Glycerol Stock`
- `Vector backbone`
- `INSERT`
- `Guide RNA`
- `PLASMID_TYPE`
- `BACTERIAL_ANTIBIOTIC`
- `MAMMALIAN_ANTIBIOTIC`
- `SOURCE`
- `MAMMALIAN_PROMOTER`
- `BACTERIAL_ORI`
- `CREATED_BY`
- `CREATED_ON`
- `CONSTRUCT_ID`
- `EXPERIMENT_ID`
- `HYPERLINK_TO_GB_FILE`
- `COMMENTS`
- `DESCRIPTION`

Only `PL000001` is meaningfully populated.

There are a couple mock-data inconsistencies you should normalize during import:

- `CONSTRUCT_ID` is `"from import"` but should probably map to `CON000001`.
- `EXPERIMENT_ID` is `"EXP_00001"` but should map to `EXP000001`.
- `HYPERLINK_TO_GB_FILE` is empty, but the repository contains `Plasmid Files/Example_PL000001.gb`, which should be linked to `PL000001`.

### `EXP_mock.xlsx`

Experiment database.

Important fields:

- `Experiment_ID`
- `EXPERIMENT_OWNER`
- `EXPERIMENT_TYPE`
- `EXPERIMENT_SOURCE`
- `EXTERNAL_PARTY`
- `EXPERIMENT_TITLE_AIM`
- `START_DATE`
- `END_DATE`
- `LINK_TO_FOLDER`
- `COMMENTS`

Only `EXP000001` is meaningfully populated.

The mock experiment folder is:

```text
Experiment Folders/EXP000001_mock/
```

### `Plasmid Files/Example_PL000001.gb`

This is a GenBank file for a circular 9,288 bp plasmid, `pSpCas9(BB)-2A-G`.

The file contains useful plasmid annotations such as:

- Cas9
- EGFP
- AmpR
- U6 promoter
- gRNA scaffold
- origins of replication
- primer binding sites

For the MVP, you do not need to build a full GenBank editor. A high-quality MVP can:

- Link the file to the plasmid.
- Show filename, size, and basic metadata.
- Allow download.
- Optionally show a text preview or parsed summary.

### `Experiment Folders/EXP000001_mock/EXP1_mock.docx`

This is an example experiment note. It represents the kind of lab note or ELN-style document that should be associated with an experiment.

For the MVP, you can display it as an attached file path/download link. You do not need to parse and render the full Word document in the browser unless you have extra time.

## Suggested Database Schema

Use this as the starting point.

```prisma
model Construct {
  id              String    @id
  shortName       String?
  proteinSequence String?
  length          Int?
  plasmids        Plasmid[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Plasmid {
  id                    String               @id
  name                  String?
  emptyVector           Boolean?
  placeholderOnly       Boolean?
  hasPlasmidPrep        Boolean?
  hasGlycerolStock      Boolean?
  vectorBackbone        String?
  insertDescription     String?
  guideRna              String?
  plasmidType           String?
  bacterialAntibiotic   String?
  mammalianAntibiotic   String?
  source                String?
  mammalianPromoter     String?
  bacterialOri          String?
  createdBy             String?
  createdOn             DateTime?
  comments              String?
  description           String?

  constructId           String?
  construct             Construct?           @relation(fields: [constructId], references: [id])

  experimentLinks       ExperimentPlasmid[]
  files                 PlasmidFile[]

  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt
}

model Experiment {
  id              String               @id
  owner           String?
  type            String?
  source          String?
  externalParty   String?
  titleAim        String?
  startDate       DateTime?
  endDate         DateTime?
  folderPath      String?
  comments        String?

  plasmidLinks    ExperimentPlasmid[]
  files           ExperimentFile[]

  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
}

model ExperimentPlasmid {
  experimentId String
  plasmidId    String

  experiment   Experiment @relation(fields: [experimentId], references: [id], onDelete: Cascade)
  plasmid      Plasmid    @relation(fields: [plasmidId], references: [id], onDelete: Cascade)

  @@id([experimentId, plasmidId])
}

model PlasmidFile {
  id        Int      @id @default(autoincrement())
  plasmidId String
  fileName  String
  filePath  String
  fileType  String?
  notes     String?

  plasmid   Plasmid @relation(fields: [plasmidId], references: [id], onDelete: Cascade)
}

model ExperimentFile {
  id           Int        @id @default(autoincrement())
  experimentId String
  fileName     String
  filePath     String
  fileType     String?
  notes        String?

  experiment   Experiment @relation(fields: [experimentId], references: [id], onDelete: Cascade)
}
```

The `ExperimentPlasmid` join table is important. The README says experiments reference one or more plasmids. Even though the mock spreadsheet places an experiment ID on the plasmid row, a many-to-many relationship is the cleaner model.

## MVP Feature Set

Build these first.

### 1. Data Import

Create a seed script that:

- Reads the three Excel files.
- Imports only rows with meaningful data.
- Creates `CON000001`, `PL000001`, and `EXP000001`.
- Links `PL000001` to `CON000001`.
- Links `EXP000001` to `PL000001`.
- Links `PL000001` to `Plasmid Files/Example_PL000001.gb`.
- Links `EXP000001` to `Experiment Folders/EXP000001_mock/EXP1_mock.docx`.

Avoid importing hundreds of blank placeholder rows. They are not useful records.

### 2. List Pages

Create these routes:

```text
/constructs
/plasmids
/experiments
```

Each list page should include:

- Search.
- Sortable or at least clearly organized table columns.
- Empty state.
- Link to detail page.
- Button to create a new record.

Suggested table columns:

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

### 3. Detail Pages

Create these routes:

```text
/constructs/[id]
/plasmids/[id]
/experiments/[id]
```

Construct detail should show:

- Construct metadata.
- Protein sequence in a readable monospaced block.
- Derived sequence length.
- All plasmids containing the construct.

Plasmid detail should show:

- Plasmid metadata.
- Linked construct.
- Linked experiments.
- Linked GenBank file.
- Comments and description.

Experiment detail should show:

- Experiment metadata.
- Linked plasmids.
- For each plasmid, show its linked construct.
- Linked experiment folder/files.
- Notes/comments.

### 4. Edit Forms

Add create/edit forms for:

- Constructs.
- Plasmids.
- Experiments.
- Linking plasmids to experiments.

Use dropdowns for known enum-like fields:

Experiment owner:

- Jeff
- Steven
- Li-Yao
- Nick
- Martyn

Experiment type:

- MOLBIOL
- INSILICO
- CELL

Experiment source:

- INTERNAL
- EXTERNAL

Plasmid type:

- BACTERIAL
- MAMMALIAN
- LENTIVECTOR
- AAV

Plasmid source:

- IN_HOUSE
- ADDGENE
- THERMOFISHER
- EXTERNAL

Bacterial antibiotic:

- AMPICILLIN
- KANAMYCIN
- CHLORAMPHENICOL

Mammalian antibiotic:

- PUROMYCIN
- G418

Promoter:

- CMV
- CAG
- UBC

### 5. Relationship Navigation

This is the feature that should make the app feel aligned with the prompt.

Make sure users can:

- Click from an experiment to each plasmid used.
- Click from a plasmid to its construct.
- Click from a plasmid to all experiments using it.
- Click from a construct to all plasmids that contain it.
- See enough linked context without having to open every page.

A good detail page should include relationship cards or tables, not just raw IDs.

## High-Quality Enhancements

Once the MVP works, these additions can make the project stand out.

### GenBank Metadata Preview

Parse a few basic fields from `.gb` files:

- Locus name.
- Sequence length.
- Circular vs linear.
- Definition.
- Selected feature labels.

For `Example_PL000001.gb`, this could show:

- Locus: `pSpCas9(BB)-2A-G`
- Length: `9288 bp`
- Top features: `Cas9`, `EGFP`, `AmpR`, `U6 promoter`, `gRNA scaffold`

Do not overbuild this into a full sequence editor.

### Data Quality Banner

Because the mock data contains inconsistencies, show a small data quality section or seed-log output:

- Normalized `EXP_00001` to `EXP000001`.
- Linked `PL000001` to `CON000001`.
- Attached GenBank file to `PL000001`.

This demonstrates that you noticed real-world messy data.

### Import Review Page

Optional but impressive:

```text
/admin/import-summary
```

Show:

- Source files imported.
- Record counts.
- Warnings.
- Normalizations performed.

### Protein Sequence Display

For construct detail:

- Use a monospaced sequence viewer.
- Wrap long sequences cleanly.
- Show length.
- Optionally group amino acids every 10 characters.

### Better Search

Global search can be a strong finishing touch:

```text
/search?q=cas9
```

Search across:

- Construct IDs and names.
- Plasmid IDs and names.
- Experiment titles.
- Comments/descriptions.

## Suggested UI Structure

Use a simple operational interface, not a marketing landing page.

Recommended layout:

- Left sidebar or top nav.
- Main routes: Dashboard, Constructs, Plasmids, Experiments.
- Clean tables.
- Detail pages with related-record sections.
- Forms in dedicated pages or dialogs.

Dashboard ideas:

- Total constructs.
- Total plasmids.
- Total experiments.
- Recently created records.
- Records missing links.
- Quick links to the sample construct, plasmid, and experiment.

Visual style should be restrained and scientific:

- Clear typography.
- Compact but readable tables.
- Good spacing.
- Subtle status badges.
- Avoid decorative hero sections.

## Suggested Implementation Plan

### Milestone 1: Project Setup

Deliverable:

- App boots locally.
- Database schema exists.
- Basic layout exists.

Tasks:

1. Create the app.
2. Add Prisma and SQLite.
3. Define schema.
4. Add migrations.
5. Add a basic navigation layout.

Commands might look like:

```bash
npx create-next-app@latest lab-db --ts
cd lab-db
npm install prisma @prisma/client xlsx
npx prisma init --datasource-provider sqlite
```

### Milestone 2: Seed Data

Deliverable:

- Running `npm run db:seed` imports the mock data.

Tasks:

1. Read `CON_mock.xlsx`.
2. Read `PL_mock.xlsx`.
3. Read `EXP_mock.xlsx`.
4. Normalize known mock inconsistencies.
5. Create relationships.
6. Attach file paths.

Add scripts:

```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "dev": "next dev"
  }
}
```

### Milestone 3: Read-Only UI

Deliverable:

- Users can browse and click through all seeded data.

Tasks:

1. Build list pages.
2. Build detail pages.
3. Add relationship tables.
4. Add file links.
5. Add search filters.

At this point, the app already satisfies a large part of the prompt.

### Milestone 4: Editing

Deliverable:

- Users can create and edit records.

Tasks:

1. Add create/edit construct form.
2. Add create/edit plasmid form.
3. Add create/edit experiment form.
4. Add link/unlink plasmids on experiment detail.
5. Add validation and useful error messages.

Use server actions or API routes. Keep the implementation consistent.

### Milestone 5: Polish And Packaging

Deliverable:

- Submission is easy to run and feels complete.

Tasks:

1. Write a clear project README.
2. Include screenshots if useful.
3. Add tests for seed/import logic and key API/database functions.
4. Verify a fresh install works.
5. Zip the app folder.

## Testing Strategy

At minimum, test the parts most likely to break:

- Excel import maps fields correctly.
- Mock data normalization works.
- Plasmid links to construct.
- Experiment links to plasmid.
- Record creation validates required IDs.
- Record updates persist.

Good tests to include:

```text
seed.test.ts
  imports CON000001
  imports PL000001
  imports EXP000001
  normalizes EXP_00001 to EXP000001
  links PL000001 to CON000001
  links EXP000001 to PL000001

relationships.test.ts
  returns plasmids for a construct
  returns experiments for a plasmid
  returns plasmids and constructs for an experiment
```

Even a few focused tests will make the submission stronger.

## Validation Rules

Implement basic validation rather than allowing arbitrary bad records.

Examples:

- IDs are required and unique.
- Construct IDs follow `CON000001` style.
- Plasmid IDs follow `PL000001` style.
- Experiment IDs follow `EXP000001` style.
- Protein sequence contains amino-acid characters.
- Date fields must be valid dates.
- Dropdown fields use known values when possible.
- A plasmid can have zero or one construct.
- An experiment can have many plasmids.

Do not make validation so strict that existing mock data cannot be imported. Normalize known bad values during seed.

## What To Put In Your Final README

Your submitted app should have its own `README.md` with:

- Project summary.
- Tech stack.
- Data model explanation.
- Setup instructions.
- Seed instructions.
- Run instructions.
- Test instructions.
- Known assumptions.
- Future improvements.

Example run instructions:

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Then:

```text
Open http://localhost:3000
```

## Assumptions To State Clearly

Include these in your final project README:

- Only one construct, one plasmid, and one experiment are meaningfully populated in the mock files.
- Placeholder ID rows are not imported as real records.
- `PL000001` is assumed to contain `CON000001`.
- `EXP_00001` is normalized to `EXP000001`.
- The GenBank file is linked to `PL000001`.
- Experiment folders are represented as linked local files/folders.
- The app previews metadata and file links, but does not replace specialist tools like SnapGene.

Clear assumptions are a sign of good engineering judgment.

## Common Pitfalls

Avoid these:

- Importing hundreds of blank placeholder rows as real records.
- Treating experiments as directly linked to constructs.
- Ignoring the many-to-many relationship between experiments and plasmids.
- Building only static pages with no persistence.
- Skipping edit functionality.
- Hiding relationships behind raw IDs only.
- Spending too much time on GenBank visualization before CRUD and relationships work.
- Submitting without run instructions.

## What A Strong Submission Looks Like

A strong take-home submission should let a reviewer:

1. Install dependencies.
2. Seed the database.
3. Run the app.
4. Open the browser.
5. See the seeded construct, plasmid, and experiment.
6. Click from experiment to plasmid.
7. Click from plasmid to construct.
8. Edit a record.
9. Create a new record.
10. Understand your schema and assumptions from the README.

That is the core project. Polish matters, but the most important thing is making the biological relationships understandable and editable.

## Suggested Time Allocation

If you have limited time, prioritize like this:

```text
20% schema and import
30% list/detail pages
25% edit forms and relationship linking
15% tests and validation
10% README, polish, packaging
```

If time gets tight, cut optional GenBank parsing before cutting relationship navigation or edit functionality.

## Recommended Build Order

1. Create the database schema.
2. Write the seed script.
3. Build read-only list pages.
4. Build detail pages with relationships.
5. Add edit/create forms.
6. Add relationship linking UI.
7. Add file links/previews.
8. Add tests.
9. Write final README.
10. Run the project from a clean checkout/folder to verify setup instructions.

The first real coding task should be the schema plus seed script. Once the mock data is cleanly represented in SQLite, the rest of the project becomes a standard CRUD app with relationship navigation.
