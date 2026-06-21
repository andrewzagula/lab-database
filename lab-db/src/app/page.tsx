import Link from "next/link";
import { EmptyState } from "@/app/_components/empty-state";
import { getDashboardData, type DashboardCountKey } from "@/lib/read-db";

export const dynamic = "force-dynamic";

const statLabels: Record<DashboardCountKey, string> = {
  constructs: "Constructs",
  plasmids: "Plasmids",
  experiments: "Experiments",
};

const listLinks = [
  {
    label: "Constructs",
    href: "/constructs",
    description: "Protein design records and plasmid coverage.",
  },
  {
    label: "Plasmids",
    href: "/plasmids",
    description: "DNA vehicle records linked to constructs and experiments.",
  },
  {
    label: "Experiments",
    href: "/experiments",
    description: "Lab records and plasmid usage.",
  },
];

export default function Home() {
  const data = getDashboardData();
  const quickSections = [
    ["Constructs", data.quickRecords.constructs],
    ["Plasmids", data.quickRecords.plasmids],
    ["Experiments", data.quickRecords.experiments],
  ] as const;

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-8">
        <p className="font-mono text-sm font-semibold uppercase text-teal-700">
          Lab database dashboard
        </p>
        <div className="mt-3 max-w-3xl space-y-3">
          <h2 className="text-4xl font-semibold tracking-normal text-slate-950">
            Seeded lab records from the local SQLite database.
          </h2>
          <p className="text-lg leading-8 text-slate-600">
            Phase 5 reads and edits constructs, plasmids, and experiments from
            <span className="font-mono"> dev.db</span>. Relationship tracing
            remains clickable, and many-to-many relationship management is
            reserved for Phase 6.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Record counts">
        {Object.entries(data.counts).map(([key, value]) => (
          <Link
            key={key}
            href={`/${key}`}
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-teal-700 hover:shadow-sm"
          >
            <p className="text-sm font-medium text-slate-600">
              {statLabels[key as DashboardCountKey]}
            </p>
            <p className="mt-3 font-mono text-4xl font-semibold text-slate-950">
              {value}
            </p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {listLinks.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-teal-700 hover:shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-950">
              {area.label}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {area.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-teal-700">
              Seeded records
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Quick links
            </h3>
          </div>
          <p className="text-sm text-slate-600">
            Detail routes open relationship pages with edit actions.
          </p>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {quickSections.map(([label, records]) => (
            <div key={label} className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-950">{label}</h4>
              {records.length ? (
                <ul className="space-y-2">
                  {records.map((record) => (
                    <li key={record.href}>
                      <Link
                        href={record.href}
                        className="block rounded-md border border-slate-200 px-3 py-2 transition hover:border-teal-700 hover:bg-slate-50"
                      >
                        <span className="font-mono text-sm font-semibold text-slate-950">
                          {record.id}
                        </span>
                        <span className="ml-2 text-sm text-slate-700">
                          {record.label}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {record.detail}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600">
                  No {label.toLowerCase()} have been seeded yet.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Relationship health
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Missing key links
          </h3>
        </div>
        {data.relationshipChecks.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.relationshipChecks.map((check) => (
              <Link
                key={check.label}
                href={check.href}
                className="rounded-lg border border-slate-200 bg-white p-5 transition hover:border-teal-700 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-slate-950">
                      {check.label}
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {check.description}
                    </p>
                  </div>
                  <span
                    className={
                      check.count === 0
                        ? "rounded-md bg-emerald-50 px-3 py-1 font-mono text-sm font-semibold text-emerald-700"
                        : "rounded-md bg-amber-50 px-3 py-1 font-mono text-sm font-semibold text-amber-700"
                    }
                  >
                    {check.count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No relationship checks available">
            Relationship checks will appear when the seeded database is present.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
