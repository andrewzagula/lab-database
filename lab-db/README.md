# Lab Database App

Phase 5 CRUD interface for the mock lab database take-home project.

This app has the Next.js shell, Prisma SQLite schema, initial migration, idempotent mock-data seed import, dashboard/list pages, relationship-tracing detail pages, and create/edit forms backed by the local seeded SQLite database.

## Current Status

Complete:

- Next.js App Router with TypeScript in `src/app/`
- Tailwind CSS and ESLint
- Prisma initialized for SQLite
- Prisma domain models for constructs, plasmids, experiments, plasmid files, experiment files, and `ExperimentPlasmid`
- Initial SQLite migration in `prisma/migrations/20260620032945_init/`
- Idempotent seed/import script in `prisma/seed.mjs`
- `npm run db:seed` imports `CON000001`, `PL000001`, and `EXP000001` with required links
- Data-backed read-only routes for `/`, `/constructs`, `/plasmids`, and `/experiments`
- Query-param search controls and empty states on list pages
- Relationship-tracing detail routes for `/constructs/[id]`, `/plasmids/[id]`, and `/experiments/[id]`
- Create and edit routes for constructs, plasmids, and experiments
- Server Action mutations through parameterized Node `node:sqlite` writes
- Form validation for required/unique IDs, ID formats, dates, protein sequences, dropdown values, and plasmid construct references
- Route-level not-found states for missing detail records
- Link and unlink plasmids to experiments through the `ExperimentPlasmid` join table from the experiment detail page, with duplicate-safe linking and construct context kept visible
- Root mock files preserved outside this app folder

Not started yet:

- Upload flows
- File previews/rendering
- Delete actions for records

## Run Locally

From this folder:

```bash
npm install
env RUST_BACKTRACE=full RUST_LOG=trace npx prisma migrate dev
npm run db:seed
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

## Verification Commands

```bash
npx prisma format
npx prisma migrate status
npm run db:seed
npx prisma db seed
npm run lint
npx tsc --noEmit
npx prisma validate
```

Phase 0 browser verification passed for `/`, `/constructs`, `/plasmids`, and `/experiments`.

Phase 1 schema verification passed with:

```bash
env RUST_BACKTRACE=full RUST_LOG=trace npx prisma migrate dev --name init
npx prisma validate
npm run lint
npx tsc --noEmit
npx prisma migrate status
sqlite3 dev.db ".tables"
```

The local SQLite database is created as `dev.db` from the generated `.env` value `DATABASE_URL="file:./dev.db"`. Local database files are ignored by git. In this environment, plain `npx prisma migrate dev --name init` returned a generic schema-engine error, while the same command completed with `RUST_BACKTRACE` and `RUST_LOG` set as shown above.

Phase 2 seed verification passed with:

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

The repeated seed run leaves one row in each seeded table and links `EXP000001 -> PL000001 -> CON000001`. It also links `PL000001` to `../Plasmid Files/Example_PL000001.gb` and `EXP000001` to `../Experiment Folders/EXP000001_mock/EXP1_mock.docx`.

Data access note: Prisma 7's generated `prisma-client` output requires a driver adapter when constructing `PrismaClient` directly. The Phase 2 seed avoided adding dependencies by writing to the Prisma-managed SQLite database through Node's built-in SQLite API. Phase 3 chose and documented the same read path for app queries before Phase 4 replaced placeholder pages with real data.

Phase 3 data-access decision: read-only app pages intentionally do not instantiate `PrismaClient` and do not add a Prisma driver adapter dependency. `src/lib/read-db.ts` resolves `DATABASE_URL="file:./dev.db"` and uses Node 22's built-in `node:sqlite` `DatabaseSync` API with `readOnly: true`, `PRAGMA query_only = ON`, and parameterized SQL. This keeps Phase 3 aligned with the existing seed approach while leaving a future Prisma adapter migration as a deliberate later decision.

Phase 3 verification passed with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Browser verification passed for `/`, `/constructs`, `/plasmids`, and `/experiments`. The dashboard showed one construct, one plasmid, and one experiment. The list pages showed `CON000001` with plasmid count `1`, `PL000001` linked to `CON000001` with experiment count `1`, and `EXP000001` with plasmid count `1`. An unmatched search on `/constructs?q=not-a-real-record` showed the empty state, and the detail routes loaded Phase 4 placeholders before the Phase 4 implementation.

Phase 4 verification passed with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Browser verification passed for `/constructs/CON000001`, `/plasmids/PL000001`, `/experiments/EXP000001`, and missing route `/constructs/CON999999`. The seeded relationship path works both ways: `/experiments/EXP000001 -> PL000001 -> CON000001` and `/constructs/CON000001 -> PL000001 -> EXP000001`. The missing route returned the custom not-found UI with a 404 response. File rows remain metadata/path display only; no file preview or rendering behavior was added.

Local environment notes: the sandboxed first dev-server start returned `listen EPERM` for `127.0.0.1:3000`; rerunning the same command with approved port-binding permissions succeeded. Node also logs an expected experimental warning for `node:sqlite`.

Phase 5 verification passed with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Browser verification passed for create/edit forms and validation. The flow created and edited `CON000002`, created and edited `PL000002` linked to `CON000002`, created and edited `EXP000002`, refreshed detail pages to confirm persistence, verified invalid submission errors, confirmed seeded Phase 4 relationship paths still work, and confirmed file metadata remains display-only with no upload controls. Final browser run reported no console errors or page errors.

Phase 5 data-access decision: the app still does not instantiate `PrismaClient` because Prisma 7's generated client requires a driver adapter. Reads stay in `src/lib/read-db.ts`; writes use Server Actions and parameterized `node:sqlite` statements in `src/lib/write-db.ts`.

Phase 6 verification passed with:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npm run dev -- --hostname 127.0.0.1 --port 3000
```

The experiment detail page now manages `ExperimentPlasmid` links. `listPlasmidsNotInExperiment` feeds an add-plasmid selector that only offers plasmids not already linked, and each linked row has a remove control. The `linkPlasmidToExperiment` / `unlinkPlasmidFromExperiment` writes normalize IDs, block duplicate links, validate that both records exist, and revalidate the experiment, plasmid, list, and dashboard routes so relationship tables update immediately. Browser/action verification linked `EXP000001` to a second plasmid (`PL000001` + `PL000002`), confirmed the many-to-many path so `PL000001` appears in multiple experiments, confirmed the selector hides already-linked plasmids, and unlinked back to the seeded state. The plasmid detail page continues to list every linked experiment.

Phase 6 data-access decision: relationship reads and writes follow the existing `node:sqlite` pattern; `ExperimentPlasmid` rows returned to the client selector are mapped to plain objects, matching `listConstructOptions`, because `node:sqlite` rows have a null prototype and cannot cross the Server/Client Component boundary.

## Next Handoff

Complete Phase 7 only:

1. Add file links and a basic GenBank metadata preview for plasmid files.
2. Show download links and parsed summary fields without building a full sequence editor.
3. Keep upload flows and record deletion out of Phase 7 unless explicitly requested.

Note: Prisma 7 uses `prisma.config.ts` to load `DATABASE_URL` from `.env` and to configure `npx prisma db seed`; keep that generated config pattern.
