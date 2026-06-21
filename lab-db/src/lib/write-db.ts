import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  BACTERIAL_ANTIBIOTICS,
  EXPERIMENT_OWNERS,
  EXPERIMENT_SOURCES,
  EXPERIMENT_TYPES,
  MAMMALIAN_ANTIBIOTICS,
  PLASMID_SOURCES,
  PLASMID_TYPES,
  PROMOTERS,
  type ConstructFormValues,
  type ExperimentFormValues,
  type FormState,
  type PlasmidFormValues,
} from "@/lib/form-options";

type SqlValue = string | number | null;
type EntityTable = "Construct" | "Plasmid" | "Experiment";
type MutationResult<TValues> =
  | { ok: true; id: string }
  | { ok: false; state: FormState<TValues> };

type CurrentPlasmidValues = {
  plasmidType: string | null;
  bacterialAntibiotic: string | null;
  mammalianAntibiotic: string | null;
  source: string | null;
  mammalianPromoter: string | null;
};

type CurrentExperimentValues = {
  owner: string | null;
  type: string | null;
  source: string | null;
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

function withWriteDb<T>(callback: (db: DatabaseSync) => T) {
  const db = new DatabaseSync(resolveSqlitePath());
  try {
    db.exec("PRAGMA foreign_keys = ON");
    return callback(db);
  } finally {
    db.close();
  }
}

function runTransaction<T>(db: DatabaseSync, callback: () => T) {
  db.exec("BEGIN IMMEDIATE TRANSACTION");
  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function get<T>(db: DatabaseSync, sql: string, params: SqlValue[] = []) {
  return db.prepare(sql).get(...params) as T | undefined;
}

function run(db: DatabaseSync, sql: string, params: SqlValue[] = []) {
  db.prepare(sql).run(...params);
}

function textField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function constructValuesFromForm(formData: FormData): ConstructFormValues {
  return {
    id: textField(formData, "id").toUpperCase(),
    shortName: textField(formData, "shortName"),
    proteinSequence: textField(formData, "proteinSequence"),
  };
}

export function plasmidValuesFromForm(formData: FormData): PlasmidFormValues {
  return {
    id: textField(formData, "id").toUpperCase(),
    name: textField(formData, "name"),
    emptyVector: textField(formData, "emptyVector"),
    placeholderOnly: textField(formData, "placeholderOnly"),
    hasPlasmidPrep: textField(formData, "hasPlasmidPrep"),
    hasGlycerolStock: textField(formData, "hasGlycerolStock"),
    vectorBackbone: textField(formData, "vectorBackbone"),
    insertDescription: textField(formData, "insertDescription"),
    guideRna: textField(formData, "guideRna"),
    plasmidType: textField(formData, "plasmidType"),
    bacterialAntibiotic: textField(formData, "bacterialAntibiotic"),
    mammalianAntibiotic: textField(formData, "mammalianAntibiotic"),
    source: textField(formData, "source"),
    mammalianPromoter: textField(formData, "mammalianPromoter"),
    bacterialOri: textField(formData, "bacterialOri"),
    createdBy: textField(formData, "createdBy"),
    createdOn: textField(formData, "createdOn"),
    comments: textField(formData, "comments"),
    description: textField(formData, "description"),
    constructId: textField(formData, "constructId").toUpperCase(),
  };
}

export function experimentValuesFromForm(formData: FormData): ExperimentFormValues {
  return {
    id: textField(formData, "id").toUpperCase(),
    owner: textField(formData, "owner"),
    type: textField(formData, "type"),
    source: textField(formData, "source"),
    externalParty: textField(formData, "externalParty"),
    titleAim: textField(formData, "titleAim"),
    startDate: textField(formData, "startDate"),
    endDate: textField(formData, "endDate"),
    folderPath: textField(formData, "folderPath"),
    comments: textField(formData, "comments"),
  };
}

function clean(value: string) {
  return value === "" ? null : value;
}

function fail<TValues>(
  values: TValues,
  errors: Record<string, string>,
): MutationResult<TValues> {
  return {
    ok: false,
    state: {
      values,
      errors,
    },
  };
}

function formError<TValues>(values: TValues, message: string): MutationResult<TValues> {
  return fail(values, { _form: message });
}

function addError(errors: Record<string, string>, field: string, message: string) {
  if (!errors[field]) {
    errors[field] = message;
  }
}

function validateId(
  errors: Record<string, string>,
  field: string,
  value: string,
  pattern: RegExp,
  example: string,
) {
  if (!value) {
    addError(errors, field, "ID is required.");
    return;
  }

  if (!pattern.test(value)) {
    addError(errors, field, `Use the format ${example}.`);
  }
}

function normalizeProteinSequence(
  values: ConstructFormValues,
  errors: Record<string, string>,
) {
  const sequence = values.proteinSequence.replace(/\s+/g, "").toUpperCase();
  if (sequence && !/^[A-Z]+$/.test(sequence)) {
    addError(errors, "proteinSequence", "Protein sequence must contain letters only.");
  }

  values.proteinSequence = sequence;
  return {
    sequence: sequence || null,
    length: sequence ? sequence.length : null,
  };
}

function parseBoolean(
  values: PlasmidFormValues,
  errors: Record<string, string>,
  field: keyof PlasmidFormValues,
) {
  const value = values[field];
  if (value === "") {
    return null;
  }
  if (value === "true") {
    return 1;
  }
  if (value === "false") {
    return 0;
  }

  addError(errors, field, "Choose Yes, No, or Unknown.");
  return null;
}

function parseDate(
  errors: Record<string, string>,
  field: string,
  value: string,
) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    addError(errors, field, "Use a valid YYYY-MM-DD date.");
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isValid =
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day);

  if (!isValid) {
    addError(errors, field, "Use a valid YYYY-MM-DD date.");
    return null;
  }

  return parsed.toISOString();
}

function validateOption(
  errors: Record<string, string>,
  field: string,
  value: string,
  options: readonly string[],
  currentValue?: string | null,
) {
  if (!value) {
    return;
  }

  if (options.includes(value) || value === currentValue) {
    return;
  }

  addError(errors, field, "Choose a value from the dropdown.");
}

function recordExists(db: DatabaseSync, table: EntityTable, id: string) {
  return Boolean(
    get<{ id: string }>(
      db,
      `SELECT "id" FROM "${table}" WHERE "id" = ? LIMIT 1`,
      [id],
    ),
  );
}

function duplicateIdError<TValues>(
  db: DatabaseSync,
  table: EntityTable,
  values: TValues,
  id: string,
  originalId?: string,
) {
  if (id === originalId) {
    return null;
  }

  if (recordExists(db, table, id)) {
    return fail(values, { id: "A record with this ID already exists." });
  }

  return null;
}

function constructExists(db: DatabaseSync, id: string) {
  return recordExists(db, "Construct", id);
}

function getCurrentPlasmidValues(db: DatabaseSync, id: string) {
  return get<CurrentPlasmidValues>(
    db,
    `
      SELECT
        "plasmidType",
        "bacterialAntibiotic",
        "mammalianAntibiotic",
        "source",
        "mammalianPromoter"
      FROM "Plasmid"
      WHERE "id" = ?
    `,
    [id],
  );
}

function getCurrentExperimentValues(db: DatabaseSync, id: string) {
  return get<CurrentExperimentValues>(
    db,
    `
      SELECT
        "owner",
        "type",
        "source"
      FROM "Experiment"
      WHERE "id" = ?
    `,
    [id],
  );
}

function validateConstruct(values: ConstructFormValues) {
  const errors: Record<string, string> = {};
  validateId(errors, "id", values.id, /^CON\d{6}$/, "CON000001");
  const sequence = normalizeProteinSequence(values, errors);
  return { errors, sequence };
}

function validatePlasmid(
  values: PlasmidFormValues,
  currentValues?: CurrentPlasmidValues | null,
) {
  const errors: Record<string, string> = {};
  validateId(errors, "id", values.id, /^PL\d{6}$/, "PL000001");
  validateOption(errors, "plasmidType", values.plasmidType, PLASMID_TYPES, currentValues?.plasmidType);
  validateOption(errors, "source", values.source, PLASMID_SOURCES, currentValues?.source);
  validateOption(
    errors,
    "bacterialAntibiotic",
    values.bacterialAntibiotic,
    BACTERIAL_ANTIBIOTICS,
    currentValues?.bacterialAntibiotic,
  );
  validateOption(
    errors,
    "mammalianAntibiotic",
    values.mammalianAntibiotic,
    MAMMALIAN_ANTIBIOTICS,
    currentValues?.mammalianAntibiotic,
  );
  validateOption(
    errors,
    "mammalianPromoter",
    values.mammalianPromoter,
    PROMOTERS,
    currentValues?.mammalianPromoter,
  );

  const parsed = {
    emptyVector: parseBoolean(values, errors, "emptyVector"),
    placeholderOnly: parseBoolean(values, errors, "placeholderOnly"),
    hasPlasmidPrep: parseBoolean(values, errors, "hasPlasmidPrep"),
    hasGlycerolStock: parseBoolean(values, errors, "hasGlycerolStock"),
    createdOn: parseDate(errors, "createdOn", values.createdOn),
  };

  return { errors, parsed };
}

function validateExperiment(
  values: ExperimentFormValues,
  currentValues?: CurrentExperimentValues | null,
) {
  const errors: Record<string, string> = {};
  validateId(errors, "id", values.id, /^EXP\d{6}$/, "EXP000001");
  validateOption(errors, "owner", values.owner, EXPERIMENT_OWNERS, currentValues?.owner);
  validateOption(errors, "type", values.type, EXPERIMENT_TYPES, currentValues?.type);
  validateOption(errors, "source", values.source, EXPERIMENT_SOURCES, currentValues?.source);

  const startDate = parseDate(errors, "startDate", values.startDate);
  const endDate = parseDate(errors, "endDate", values.endDate);
  if (startDate && endDate && endDate < startDate) {
    addError(errors, "endDate", "End date cannot be before start date.");
  }

  return { errors, parsed: { startDate, endDate } };
}

export function createConstruct(values: ConstructFormValues): MutationResult<ConstructFormValues> {
  const { errors, sequence } = validateConstruct(values);
  if (Object.keys(errors).length) {
    return fail(values, errors);
  }

  try {
    return withWriteDb((db) => {
      const duplicate = duplicateIdError(db, "Construct", values, values.id);
      if (duplicate) {
        return duplicate;
      }

      runTransaction(db, () => {
        run(
          db,
          `
            INSERT INTO "Construct" (
              "id", "shortName", "proteinSequence", "length", "updatedAt"
            )
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [values.id, clean(values.shortName), sequence.sequence, sequence.length],
        );
      });

      return { ok: true, id: values.id };
    });
  } catch (error) {
    return formError(values, error instanceof Error ? error.message : "Could not create construct.");
  }
}

export function updateConstruct(
  originalId: string,
  values: ConstructFormValues,
): MutationResult<ConstructFormValues> {
  const { errors, sequence } = validateConstruct(values);
  if (Object.keys(errors).length) {
    return fail(values, errors);
  }

  try {
    return withWriteDb((db) => {
      if (!recordExists(db, "Construct", originalId)) {
        return formError(values, "Construct no longer exists.");
      }

      const duplicate = duplicateIdError(db, "Construct", values, values.id, originalId);
      if (duplicate) {
        return duplicate;
      }

      runTransaction(db, () => {
        run(
          db,
          `
            UPDATE "Construct"
            SET
              "id" = ?,
              "shortName" = ?,
              "proteinSequence" = ?,
              "length" = ?,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ?
          `,
          [values.id, clean(values.shortName), sequence.sequence, sequence.length, originalId],
        );
      });

      return { ok: true, id: values.id };
    });
  } catch (error) {
    return formError(values, error instanceof Error ? error.message : "Could not update construct.");
  }
}

export function createPlasmid(values: PlasmidFormValues): MutationResult<PlasmidFormValues> {
  const { errors, parsed } = validatePlasmid(values);
  if (Object.keys(errors).length) {
    return fail(values, errors);
  }

  try {
    return withWriteDb((db) => {
      const duplicate = duplicateIdError(db, "Plasmid", values, values.id);
      if (duplicate) {
        return duplicate;
      }

      if (values.constructId && !constructExists(db, values.constructId)) {
        return fail(values, { constructId: "Choose an existing construct." });
      }

      runTransaction(db, () => {
        run(
          db,
          `
            INSERT INTO "Plasmid" (
              "id", "name", "emptyVector", "placeholderOnly", "hasPlasmidPrep",
              "hasGlycerolStock", "vectorBackbone", "insertDescription", "guideRna",
              "plasmidType", "bacterialAntibiotic", "mammalianAntibiotic", "source",
              "mammalianPromoter", "bacterialOri", "createdBy", "createdOn",
              "comments", "description", "constructId", "updatedAt"
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [
            values.id,
            clean(values.name),
            parsed.emptyVector,
            parsed.placeholderOnly,
            parsed.hasPlasmidPrep,
            parsed.hasGlycerolStock,
            clean(values.vectorBackbone),
            clean(values.insertDescription),
            clean(values.guideRna),
            clean(values.plasmidType),
            clean(values.bacterialAntibiotic),
            clean(values.mammalianAntibiotic),
            clean(values.source),
            clean(values.mammalianPromoter),
            clean(values.bacterialOri),
            clean(values.createdBy),
            parsed.createdOn,
            clean(values.comments),
            clean(values.description),
            clean(values.constructId),
          ],
        );
      });

      return { ok: true, id: values.id };
    });
  } catch (error) {
    return formError(values, error instanceof Error ? error.message : "Could not create plasmid.");
  }
}

export function updatePlasmid(
  originalId: string,
  values: PlasmidFormValues,
): MutationResult<PlasmidFormValues> {
  try {
    return withWriteDb((db) => {
      const currentValues = getCurrentPlasmidValues(db, originalId);
      if (!currentValues) {
        return formError(values, "Plasmid no longer exists.");
      }

      const { errors, parsed } = validatePlasmid(values, currentValues);
      if (Object.keys(errors).length) {
        return fail(values, errors);
      }

      const duplicate = duplicateIdError(db, "Plasmid", values, values.id, originalId);
      if (duplicate) {
        return duplicate;
      }

      if (values.constructId && !constructExists(db, values.constructId)) {
        return fail(values, { constructId: "Choose an existing construct." });
      }

      runTransaction(db, () => {
        run(
          db,
          `
            UPDATE "Plasmid"
            SET
              "id" = ?,
              "name" = ?,
              "emptyVector" = ?,
              "placeholderOnly" = ?,
              "hasPlasmidPrep" = ?,
              "hasGlycerolStock" = ?,
              "vectorBackbone" = ?,
              "insertDescription" = ?,
              "guideRna" = ?,
              "plasmidType" = ?,
              "bacterialAntibiotic" = ?,
              "mammalianAntibiotic" = ?,
              "source" = ?,
              "mammalianPromoter" = ?,
              "bacterialOri" = ?,
              "createdBy" = ?,
              "createdOn" = ?,
              "comments" = ?,
              "description" = ?,
              "constructId" = ?,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ?
          `,
          [
            values.id,
            clean(values.name),
            parsed.emptyVector,
            parsed.placeholderOnly,
            parsed.hasPlasmidPrep,
            parsed.hasGlycerolStock,
            clean(values.vectorBackbone),
            clean(values.insertDescription),
            clean(values.guideRna),
            clean(values.plasmidType),
            clean(values.bacterialAntibiotic),
            clean(values.mammalianAntibiotic),
            clean(values.source),
            clean(values.mammalianPromoter),
            clean(values.bacterialOri),
            clean(values.createdBy),
            parsed.createdOn,
            clean(values.comments),
            clean(values.description),
            clean(values.constructId),
            originalId,
          ],
        );
      });

      return { ok: true, id: values.id };
    });
  } catch (error) {
    return formError(values, error instanceof Error ? error.message : "Could not update plasmid.");
  }
}

export function createExperiment(
  values: ExperimentFormValues,
): MutationResult<ExperimentFormValues> {
  const { errors, parsed } = validateExperiment(values);
  if (Object.keys(errors).length) {
    return fail(values, errors);
  }

  try {
    return withWriteDb((db) => {
      const duplicate = duplicateIdError(db, "Experiment", values, values.id);
      if (duplicate) {
        return duplicate;
      }

      runTransaction(db, () => {
        run(
          db,
          `
            INSERT INTO "Experiment" (
              "id", "owner", "type", "source", "externalParty", "titleAim",
              "startDate", "endDate", "folderPath", "comments", "updatedAt"
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `,
          [
            values.id,
            clean(values.owner),
            clean(values.type),
            clean(values.source),
            clean(values.externalParty),
            clean(values.titleAim),
            parsed.startDate,
            parsed.endDate,
            clean(values.folderPath),
            clean(values.comments),
          ],
        );
      });

      return { ok: true, id: values.id };
    });
  } catch (error) {
    return formError(values, error instanceof Error ? error.message : "Could not create experiment.");
  }
}

export function updateExperiment(
  originalId: string,
  values: ExperimentFormValues,
): MutationResult<ExperimentFormValues> {
  try {
    return withWriteDb((db) => {
      const currentValues = getCurrentExperimentValues(db, originalId);
      if (!currentValues) {
        return formError(values, "Experiment no longer exists.");
      }

      const { errors, parsed } = validateExperiment(values, currentValues);
      if (Object.keys(errors).length) {
        return fail(values, errors);
      }

      const duplicate = duplicateIdError(db, "Experiment", values, values.id, originalId);
      if (duplicate) {
        return duplicate;
      }

      runTransaction(db, () => {
        run(
          db,
          `
            UPDATE "Experiment"
            SET
              "id" = ?,
              "owner" = ?,
              "type" = ?,
              "source" = ?,
              "externalParty" = ?,
              "titleAim" = ?,
              "startDate" = ?,
              "endDate" = ?,
              "folderPath" = ?,
              "comments" = ?,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ?
          `,
          [
            values.id,
            clean(values.owner),
            clean(values.type),
            clean(values.source),
            clean(values.externalParty),
            clean(values.titleAim),
            parsed.startDate,
            parsed.endDate,
            clean(values.folderPath),
            clean(values.comments),
            originalId,
          ],
        );
      });

      return { ok: true, id: values.id };
    });
  } catch (error) {
    return formError(values, error instanceof Error ? error.message : "Could not update experiment.");
  }
}
