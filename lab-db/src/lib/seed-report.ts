import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type SeedNormalization = {
  field: string;
  from: string | null;
  to: string | null;
  note: string;
};

export type SeedReport = {
  generatedAt: string;
  databaseFile: string;
  imported: {
    constructId: string;
    plasmidId: string;
    experimentId: string;
  };
  skippedPlaceholderRows: {
    constructs: number;
    plasmids: number;
    experiments: number;
  };
  normalizations: SeedNormalization[];
  fileLinks: { record: string; file: string }[];
  counts: Record<string, number>;
};

/**
 * Read the data-quality report the seed writes next to the database. Returns
 * null when the project has not been seeded yet so the page can prompt for it.
 */
export function readSeedReport(): SeedReport | null {
  const reportPath = path.join(process.cwd(), "seed-report.json");
  if (!existsSync(reportPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(reportPath, "utf8")) as SeedReport;
  } catch {
    return null;
  }
}
