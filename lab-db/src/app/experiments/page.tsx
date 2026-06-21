import Link from "next/link";
import { EmptyState } from "@/app/_components/empty-state";
import { SearchForm } from "@/app/_components/search-form";
import { readQuery, type PageSearchParams } from "@/lib/page-params";
import { listExperiments } from "@/lib/read-db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Experiments" };

type ExperimentsPageProps = {
  searchParams: PageSearchParams;
};

export default async function ExperimentsPage({
  searchParams,
}: ExperimentsPageProps) {
  const query = await readQuery(searchParams);
  const experiments = listExperiments(query);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold uppercase text-teal-700">
            Experiments
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            Experiment records
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Lab records with owner, type, start date, and plasmid usage counts
            from the local database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-sm text-slate-500">
            {experiments.length} shown
          </p>
          <Link
            href="/experiments/new"
            className="inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New experiment
          </Link>
        </div>
      </div>

      <SearchForm
        action="/experiments"
        query={query}
        placeholder="Search by ID, title, owner, or type"
      />

      {experiments.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Title / aim</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Start date</th>
                  <th className="px-4 py-3 font-semibold">Plasmids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {experiments.map((experiment) => (
                  <tr key={experiment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold">
                      <Link
                        href={`/experiments/${experiment.id}`}
                        className="text-teal-800 hover:underline"
                      >
                        {experiment.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {experiment.titleAim ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {experiment.owner ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {experiment.type ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {experiment.startDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {experiment.plasmidCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title={
            query ? "No experiments match this search" : "No experiments yet"
          }
        >
          {query
            ? "Try a different experiment ID, title, owner, or type."
            : "Run the seed import to populate experiment records from the mock workbook."}
        </EmptyState>
      )}
    </section>
  );
}
