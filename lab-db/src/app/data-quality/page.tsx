import Link from "next/link";
import { EmptyState } from "@/app/_components/empty-state";
import { readSeedReport } from "@/lib/seed-report";

export const dynamic = "force-dynamic";

const COUNT_LABELS: Record<string, string> = {
  constructs: "Constructs",
  plasmids: "Plasmids",
  experiments: "Experiments",
  experimentPlasmids: "Experiment ↔ plasmid links",
  plasmidFiles: "Plasmid files",
  experimentFiles: "Experiment files",
};

export default function DataQualityPage() {
  const report = readSeedReport();

  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-sm font-semibold uppercase text-teal-700">
          Data quality
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
          Import summary
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          The mock spreadsheets contain mostly blank placeholder rows and a few
          inconsistent identifiers. This page records what the seed imported and
          the normalizations it applied so the data model can be trusted.
        </p>
      </div>

      {report ? (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-semibold uppercase text-teal-700">
                  Imported records
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  Meaningful rows
                </h3>
              </div>
              <p className="font-mono text-xs text-slate-500">
                Seeded {new Date(report.generatedAt).toLocaleString()} ·{" "}
                {report.databaseFile}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/constructs/${report.imported.constructId}`}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-mono text-sm font-semibold text-teal-800 transition hover:border-teal-700"
              >
                {report.imported.constructId}
              </Link>
              <Link
                href={`/plasmids/${report.imported.plasmidId}`}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-mono text-sm font-semibold text-teal-800 transition hover:border-teal-700"
              >
                {report.imported.plasmidId}
              </Link>
              <Link
                href={`/experiments/${report.imported.experimentId}`}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-mono text-sm font-semibold text-teal-800 transition hover:border-teal-700"
              >
                {report.imported.experimentId}
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(report.counts).map(([key, value]) => (
              <div
                key={key}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {COUNT_LABELS[key] ?? key}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold uppercase text-teal-700">
              Skipped during import
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Blank placeholder rows
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              These spreadsheet rows held only a preallocated ID with no other
              data, so they were not imported as real records.
            </p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["Constructs", report.skippedPlaceholderRows.constructs],
                  ["Plasmids", report.skippedPlaceholderRows.plasmids],
                  ["Experiments", report.skippedPlaceholderRows.experiments],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-slate-200 px-4 py-3"
                >
                  <dt className="text-xs font-semibold uppercase text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 font-mono text-lg font-semibold text-slate-950">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase text-teal-700">
                Normalizations
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">
                Fixes applied to messy mock data
              </h3>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Field</th>
                      <th className="px-4 py-3 font-semibold">Original</th>
                      <th className="px-4 py-3 font-semibold">Normalized</th>
                      <th className="px-4 py-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.normalizations.map((entry) => (
                      <tr key={entry.field} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">
                          {entry.field}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-rose-700">
                          {entry.from ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-teal-800">
                          {entry.to ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{entry.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <p className="font-mono text-xs font-semibold uppercase text-teal-700">
              File links
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Attached during import
            </h3>
            <ul className="mt-4 space-y-2">
              {report.fileLinks.map((link) => (
                <li
                  key={`${link.record}-${link.file}`}
                  className="flex flex-col gap-1 rounded-md border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {link.record}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {link.file}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <EmptyState title="No import report yet">
          Run <span className="font-mono">npm run db:seed</span> to import the
          mock data and generate the data-quality report.
        </EmptyState>
      )}
    </section>
  );
}
