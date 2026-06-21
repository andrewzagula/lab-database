import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

type SqlValue = string | number | null;

type CountRow = {
  count: number;
};

export type DashboardCountKey = "constructs" | "plasmids" | "experiments";

export type QuickRecord = {
  id: string;
  label: string;
  href: string;
  detail: string;
};

export type RelationshipCheck = {
  label: string;
  count: number;
  href: string;
  description: string;
};

export type DashboardData = {
  counts: Record<DashboardCountKey, number>;
  quickRecords: {
    constructs: QuickRecord[];
    plasmids: QuickRecord[];
    experiments: QuickRecord[];
  };
  relationshipChecks: RelationshipCheck[];
};

export type ConstructListRow = {
  id: string;
  shortName: string | null;
  length: number | null;
  plasmidCount: number;
};

export type PlasmidListRow = {
  id: string;
  name: string | null;
  plasmidType: string | null;
  source: string | null;
  constructId: string | null;
  constructName: string | null;
  experimentCount: number;
};

export type ExperimentListRow = {
  id: string;
  titleAim: string | null;
  owner: string | null;
  type: string | null;
  startDate: string | null;
  plasmidCount: number;
};

export type ConstructDetailPlasmidRow = {
  id: string;
  name: string | null;
  plasmidType: string | null;
  source: string | null;
  experimentCount: number;
};

export type ConstructDetail = {
  id: string;
  shortName: string | null;
  proteinSequence: string | null;
  length: number | null;
  plasmids: ConstructDetailPlasmidRow[];
};

export type PlasmidDetailExperimentRow = {
  id: string;
  titleAim: string | null;
  owner: string | null;
  type: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type PlasmidDetailFileRow = {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string | null;
  notes: string | null;
};

export type PlasmidDetail = {
  id: string;
  name: string | null;
  plasmidType: string | null;
  source: string | null;
  bacterialAntibiotic: string | null;
  mammalianAntibiotic: string | null;
  mammalianPromoter: string | null;
  bacterialOri: string | null;
  createdBy: string | null;
  createdOn: string | null;
  comments: string | null;
  description: string | null;
  constructId: string | null;
  constructName: string | null;
  experiments: PlasmidDetailExperimentRow[];
  files: PlasmidDetailFileRow[];
};

export type ExperimentDetailPlasmidRow = {
  id: string;
  name: string | null;
  plasmidType: string | null;
  source: string | null;
  constructId: string | null;
  constructName: string | null;
};

export type ExperimentDetailFileRow = {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string | null;
  notes: string | null;
};

export type ExperimentDetail = {
  id: string;
  owner: string | null;
  type: string | null;
  source: string | null;
  externalParty: string | null;
  titleAim: string | null;
  startDate: string | null;
  endDate: string | null;
  folderPath: string | null;
  comments: string | null;
  plasmids: ExperimentDetailPlasmidRow[];
  files: ExperimentDetailFileRow[];
};

export type StoredFileRow = {
  fileName: string;
  filePath: string;
  fileType: string | null;
};

export type ConstructOption = {
  id: string;
  label: string | null;
};

export type PlasmidLinkOption = {
  id: string;
  name: string | null;
  constructId: string | null;
};

export type ConstructFormRecord = {
  id: string;
  shortName: string | null;
  proteinSequence: string | null;
};

export type PlasmidFormRecord = {
  id: string;
  name: string | null;
  emptyVector: number | null;
  placeholderOnly: number | null;
  hasPlasmidPrep: number | null;
  hasGlycerolStock: number | null;
  vectorBackbone: string | null;
  insertDescription: string | null;
  guideRna: string | null;
  plasmidType: string | null;
  bacterialAntibiotic: string | null;
  mammalianAntibiotic: string | null;
  source: string | null;
  mammalianPromoter: string | null;
  bacterialOri: string | null;
  createdBy: string | null;
  createdOn: string | null;
  comments: string | null;
  description: string | null;
  constructId: string | null;
};

export type ExperimentFormRecord = {
  id: string;
  owner: string | null;
  type: string | null;
  source: string | null;
  externalParty: string | null;
  titleAim: string | null;
  startDate: string | null;
  endDate: string | null;
  folderPath: string | null;
  comments: string | null;
};

function resolveSqlitePath() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error(
      `Expected DATABASE_URL to point at a SQLite file, received ${databaseUrl ?? "nothing"}.`,
    );
  }

  const withoutQuery = databaseUrl.slice("file:".length).split("?")[0];
  if (withoutQuery.startsWith("//")) {
    return fileURLToPath(databaseUrl);
  }

  return path.resolve(process.cwd(), withoutQuery);
}

export function withReadDb<T>(callback: (db: DatabaseSync) => T) {
  const db = new DatabaseSync(resolveSqlitePath(), { readOnly: true });
  try {
    db.exec("PRAGMA query_only = ON");
    return callback(db);
  } finally {
    db.close();
  }
}

export function all<T>(db: DatabaseSync, sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).all(...params) as T[];
}

export function get<T>(db: DatabaseSync, sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).get(...params) as T | undefined;
}

function count(db: DatabaseSync, sql: string, params: SqlValue[] = []) {
  return get<CountRow>(db, sql, params)?.count ?? 0;
}

function likeParam(query: string) {
  return `%${query.toLowerCase()}%`;
}

export function getDashboardData(): DashboardData {
  return withReadDb((db) => {
    const counts = {
      constructs: count(db, `SELECT count(*) AS count FROM "Construct"`),
      plasmids: count(db, `SELECT count(*) AS count FROM "Plasmid"`),
      experiments: count(db, `SELECT count(*) AS count FROM "Experiment"`),
    };

    const constructs = all<ConstructListRow>(
      db,
      `
        SELECT
          c."id",
          c."shortName",
          c."length",
          count(p."id") AS "plasmidCount"
        FROM "Construct" c
        LEFT JOIN "Plasmid" p ON p."constructId" = c."id"
        GROUP BY c."id"
        ORDER BY c."id"
        LIMIT 5
      `,
    );

    const plasmids = all<PlasmidListRow>(
      db,
      `
        SELECT
          p."id",
          p."name",
          p."plasmidType",
          p."source",
          p."constructId",
          c."shortName" AS "constructName",
          count(ep."experimentId") AS "experimentCount"
        FROM "Plasmid" p
        LEFT JOIN "Construct" c ON c."id" = p."constructId"
        LEFT JOIN "ExperimentPlasmid" ep ON ep."plasmidId" = p."id"
        GROUP BY p."id"
        ORDER BY p."id"
        LIMIT 5
      `,
    );

    const experiments = all<ExperimentListRow>(
      db,
      `
        SELECT
          e."id",
          e."titleAim",
          e."owner",
          e."type",
          date(e."startDate") AS "startDate",
          count(ep."plasmidId") AS "plasmidCount"
        FROM "Experiment" e
        LEFT JOIN "ExperimentPlasmid" ep ON ep."experimentId" = e."id"
        GROUP BY e."id"
        ORDER BY e."id"
        LIMIT 5
      `,
    );

    return {
      counts,
      quickRecords: {
        constructs: constructs.map((record) => ({
          id: record.id,
          label: record.shortName ?? record.id,
          href: `/constructs/${record.id}`,
          detail:
            record.length == null
              ? `${record.plasmidCount} plasmids`
              : `${record.length} aa, ${record.plasmidCount} plasmids`,
        })),
        plasmids: plasmids.map((record) => ({
          id: record.id,
          label: record.name ?? record.id,
          href: `/plasmids/${record.id}`,
          detail: `${record.constructId ?? "No construct"}, ${record.experimentCount} experiments`,
        })),
        experiments: experiments.map((record) => ({
          id: record.id,
          label: record.titleAim ?? record.id,
          href: `/experiments/${record.id}`,
          detail: `${record.type ?? "No type"}, ${record.plasmidCount} plasmids`,
        })),
      },
      relationshipChecks: [
        {
          label: "Constructs without plasmids",
          count: count(
            db,
            `
              SELECT count(*) AS count
              FROM "Construct" c
              WHERE NOT EXISTS (
                SELECT 1 FROM "Plasmid" p WHERE p."constructId" = c."id"
              )
            `,
          ),
          href: "/constructs",
          description: "Protein designs that are not carried by any plasmid.",
        },
        {
          label: "Plasmids without constructs",
          count: count(db, `SELECT count(*) AS count FROM "Plasmid" WHERE "constructId" IS NULL`),
          href: "/plasmids",
          description: "Plasmids missing their construct relationship.",
        },
        {
          label: "Plasmids without experiments",
          count: count(
            db,
            `
              SELECT count(*) AS count
              FROM "Plasmid" p
              WHERE NOT EXISTS (
                SELECT 1 FROM "ExperimentPlasmid" ep WHERE ep."plasmidId" = p."id"
              )
            `,
          ),
          href: "/plasmids",
          description: "Plasmids not currently used in any experiment.",
        },
        {
          label: "Experiments without plasmids",
          count: count(
            db,
            `
              SELECT count(*) AS count
              FROM "Experiment" e
              WHERE NOT EXISTS (
                SELECT 1 FROM "ExperimentPlasmid" ep WHERE ep."experimentId" = e."id"
              )
            `,
          ),
          href: "/experiments",
          description: "Experiments without recorded plasmid usage.",
        },
      ],
    };
  });
}

export function listConstructs(query: string): ConstructListRow[] {
  return withReadDb((db) => {
    const params = query ? [likeParam(query), likeParam(query)] : [];
    const where = query
      ? `WHERE lower(c."id") LIKE ? OR lower(coalesce(c."shortName", '')) LIKE ?`
      : "";

    return all<ConstructListRow>(
      db,
      `
        SELECT
          c."id",
          c."shortName",
          c."length",
          count(p."id") AS "plasmidCount"
        FROM "Construct" c
        LEFT JOIN "Plasmid" p ON p."constructId" = c."id"
        ${where}
        GROUP BY c."id"
        ORDER BY c."id"
      `,
      params,
    );
  });
}

export function listPlasmids(query: string): PlasmidListRow[] {
  return withReadDb((db) => {
    const params = query
      ? [likeParam(query), likeParam(query), likeParam(query), likeParam(query), likeParam(query)]
      : [];
    const where = query
      ? `
        WHERE
          lower(p."id") LIKE ?
          OR lower(coalesce(p."name", '')) LIKE ?
          OR lower(coalesce(p."plasmidType", '')) LIKE ?
          OR lower(coalesce(p."source", '')) LIKE ?
          OR lower(coalesce(p."constructId", '')) LIKE ?
      `
      : "";

    return all<PlasmidListRow>(
      db,
      `
        SELECT
          p."id",
          p."name",
          p."plasmidType",
          p."source",
          p."constructId",
          c."shortName" AS "constructName",
          count(ep."experimentId") AS "experimentCount"
        FROM "Plasmid" p
        LEFT JOIN "Construct" c ON c."id" = p."constructId"
        LEFT JOIN "ExperimentPlasmid" ep ON ep."plasmidId" = p."id"
        ${where}
        GROUP BY p."id"
        ORDER BY p."id"
      `,
      params,
    );
  });
}

export function listExperiments(query: string): ExperimentListRow[] {
  return withReadDb((db) => {
    const params = query
      ? [likeParam(query), likeParam(query), likeParam(query), likeParam(query)]
      : [];
    const where = query
      ? `
        WHERE
          lower(e."id") LIKE ?
          OR lower(coalesce(e."titleAim", '')) LIKE ?
          OR lower(coalesce(e."owner", '')) LIKE ?
          OR lower(coalesce(e."type", '')) LIKE ?
      `
      : "";

    return all<ExperimentListRow>(
      db,
      `
        SELECT
          e."id",
          e."titleAim",
          e."owner",
          e."type",
          date(e."startDate") AS "startDate",
          count(ep."plasmidId") AS "plasmidCount"
        FROM "Experiment" e
        LEFT JOIN "ExperimentPlasmid" ep ON ep."experimentId" = e."id"
        ${where}
        GROUP BY e."id"
        ORDER BY e."id"
      `,
      params,
    );
  });
}

export function getConstructDetail(id: string): ConstructDetail | null {
  return withReadDb((db) => {
    const construct = get<Omit<ConstructDetail, "plasmids">>(
      db,
      `
        SELECT
          c."id",
          c."shortName",
          c."proteinSequence",
          c."length"
        FROM "Construct" c
        WHERE c."id" = ?
      `,
      [id],
    );

    if (!construct) {
      return null;
    }

    const plasmids = all<ConstructDetailPlasmidRow>(
      db,
      `
        SELECT
          p."id",
          p."name",
          p."plasmidType",
          p."source",
          count(ep."experimentId") AS "experimentCount"
        FROM "Plasmid" p
        LEFT JOIN "ExperimentPlasmid" ep ON ep."plasmidId" = p."id"
        WHERE p."constructId" = ?
        GROUP BY p."id"
        ORDER BY p."id"
      `,
      [id],
    );

    return {
      ...construct,
      plasmids,
    };
  });
}

export function getPlasmidDetail(id: string): PlasmidDetail | null {
  return withReadDb((db) => {
    const plasmid = get<Omit<PlasmidDetail, "experiments" | "files">>(
      db,
      `
        SELECT
          p."id",
          p."name",
          p."plasmidType",
          p."source",
          p."bacterialAntibiotic",
          p."mammalianAntibiotic",
          p."mammalianPromoter",
          p."bacterialOri",
          p."createdBy",
          date(p."createdOn") AS "createdOn",
          p."comments",
          p."description",
          p."constructId",
          c."shortName" AS "constructName"
        FROM "Plasmid" p
        LEFT JOIN "Construct" c ON c."id" = p."constructId"
        WHERE p."id" = ?
      `,
      [id],
    );

    if (!plasmid) {
      return null;
    }

    const experiments = all<PlasmidDetailExperimentRow>(
      db,
      `
        SELECT
          e."id",
          e."titleAim",
          e."owner",
          e."type",
          date(e."startDate") AS "startDate",
          date(e."endDate") AS "endDate"
        FROM "ExperimentPlasmid" ep
        INNER JOIN "Experiment" e ON e."id" = ep."experimentId"
        WHERE ep."plasmidId" = ?
        ORDER BY e."id"
      `,
      [id],
    );

    const files = all<PlasmidDetailFileRow>(
      db,
      `
        SELECT
          pf."id",
          pf."fileName",
          pf."filePath",
          pf."fileType",
          pf."notes"
        FROM "PlasmidFile" pf
        WHERE pf."plasmidId" = ?
        ORDER BY pf."fileName", pf."id"
      `,
      [id],
    );

    return {
      ...plasmid,
      experiments,
      files,
    };
  });
}

export function getExperimentDetail(id: string): ExperimentDetail | null {
  return withReadDb((db) => {
    const experiment = get<Omit<ExperimentDetail, "plasmids" | "files">>(
      db,
      `
        SELECT
          e."id",
          e."owner",
          e."type",
          e."source",
          e."externalParty",
          e."titleAim",
          date(e."startDate") AS "startDate",
          date(e."endDate") AS "endDate",
          e."folderPath",
          e."comments"
        FROM "Experiment" e
        WHERE e."id" = ?
      `,
      [id],
    );

    if (!experiment) {
      return null;
    }

    const plasmids = all<ExperimentDetailPlasmidRow>(
      db,
      `
        SELECT
          p."id",
          p."name",
          p."plasmidType",
          p."source",
          p."constructId",
          c."shortName" AS "constructName"
        FROM "ExperimentPlasmid" ep
        INNER JOIN "Plasmid" p ON p."id" = ep."plasmidId"
        LEFT JOIN "Construct" c ON c."id" = p."constructId"
        WHERE ep."experimentId" = ?
        ORDER BY p."id"
      `,
      [id],
    );

    const files = all<ExperimentDetailFileRow>(
      db,
      `
        SELECT
          ef."id",
          ef."fileName",
          ef."filePath",
          ef."fileType",
          ef."notes"
        FROM "ExperimentFile" ef
        WHERE ef."experimentId" = ?
        ORDER BY ef."fileName", ef."id"
      `,
      [id],
    );

    return {
      ...experiment,
      plasmids,
      files,
    };
  });
}

export function getPlasmidFile(id: number): StoredFileRow | null {
  return withReadDb((db) => {
    const row = get<StoredFileRow>(
      db,
      `SELECT "fileName", "filePath", "fileType" FROM "PlasmidFile" WHERE "id" = ?`,
      [id],
    );

    return row
      ? { fileName: row.fileName, filePath: row.filePath, fileType: row.fileType }
      : null;
  });
}

export function getExperimentFile(id: number): StoredFileRow | null {
  return withReadDb((db) => {
    const row = get<StoredFileRow>(
      db,
      `SELECT "fileName", "filePath", "fileType" FROM "ExperimentFile" WHERE "id" = ?`,
      [id],
    );

    return row
      ? { fileName: row.fileName, filePath: row.filePath, fileType: row.fileType }
      : null;
  });
}

export function listPlasmidsNotInExperiment(experimentId: string): PlasmidLinkOption[] {
  return withReadDb((db) => {
    const rows = all<PlasmidLinkOption>(
      db,
      `
        SELECT
          p."id",
          p."name",
          p."constructId"
        FROM "Plasmid" p
        WHERE NOT EXISTS (
          SELECT 1
          FROM "ExperimentPlasmid" ep
          WHERE ep."plasmidId" = p."id"
            AND ep."experimentId" = ?
        )
        ORDER BY p."id"
      `,
      [experimentId],
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      constructId: row.constructId,
    }));
  });
}

export function listConstructOptions(): ConstructOption[] {
  return withReadDb((db) => {
    const rows = all<ConstructOption>(
      db,
      `
        SELECT
          c."id",
          c."shortName" AS "label"
        FROM "Construct" c
        ORDER BY c."id"
      `,
    );

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
    }));
  });
}

export function getConstructFormRecord(id: string): ConstructFormRecord | null {
  return (
    withReadDb((db) =>
      get<ConstructFormRecord>(
        db,
        `
          SELECT
            c."id",
            c."shortName",
            c."proteinSequence"
          FROM "Construct" c
          WHERE c."id" = ?
        `,
        [id],
      ),
    ) ?? null
  );
}

export function getPlasmidFormRecord(id: string): PlasmidFormRecord | null {
  return (
    withReadDb((db) =>
      get<PlasmidFormRecord>(
        db,
        `
          SELECT
            p."id",
            p."name",
            p."emptyVector",
            p."placeholderOnly",
            p."hasPlasmidPrep",
            p."hasGlycerolStock",
            p."vectorBackbone",
            p."insertDescription",
            p."guideRna",
            p."plasmidType",
            p."bacterialAntibiotic",
            p."mammalianAntibiotic",
            p."source",
            p."mammalianPromoter",
            p."bacterialOri",
            p."createdBy",
            date(p."createdOn") AS "createdOn",
            p."comments",
            p."description",
            p."constructId"
          FROM "Plasmid" p
          WHERE p."id" = ?
        `,
        [id],
      ),
    ) ?? null
  );
}

export function getExperimentFormRecord(id: string): ExperimentFormRecord | null {
  return (
    withReadDb((db) =>
      get<ExperimentFormRecord>(
        db,
        `
          SELECT
            e."id",
            e."owner",
            e."type",
            e."source",
            e."externalParty",
            e."titleAim",
            date(e."startDate") AS "startDate",
            date(e."endDate") AS "endDate",
            e."folderPath",
            e."comments"
          FROM "Experiment" e
          WHERE e."id" = ?
        `,
        [id],
      ),
    ) ?? null
  );
}
