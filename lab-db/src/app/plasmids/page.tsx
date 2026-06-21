import Link from "next/link";
import { EmptyState } from "@/app/_components/empty-state";
import { SearchForm } from "@/app/_components/search-form";
import { readQuery, type PageSearchParams } from "@/lib/page-params";
import { listPlasmids } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type PlasmidsPageProps = {
  searchParams: PageSearchParams;
};

export default async function PlasmidsPage({ searchParams }: PlasmidsPageProps) {
  const query = await readQuery(searchParams);
  const plasmids = listPlasmids(query);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold uppercase text-teal-700">
            Plasmids
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            Plasmid records
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            DNA vehicle records with construct and experiment usage counts from
            the local database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-sm text-slate-500">
            {plasmids.length} shown
          </p>
          <Link
            href="/plasmids/new"
            className="inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New plasmid
          </Link>
        </div>
      </div>

      <SearchForm
        action="/plasmids"
        query={query}
        placeholder="Search by ID, name, type, source, or construct"
      />

      {plasmids.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Construct</th>
                  <th className="px-4 py-3 font-semibold">Experiments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {plasmids.map((plasmid) => (
                  <tr key={plasmid.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold">
                      <Link
                        href={`/plasmids/${plasmid.id}`}
                        className="text-teal-800 hover:underline"
                      >
                        {plasmid.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {plasmid.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {plasmid.plasmidType ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {plasmid.source ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {plasmid.constructId ? (
                        <Link
                          href={`/constructs/${plasmid.constructId}`}
                          className="font-mono text-teal-800 hover:underline"
                        >
                          {plasmid.constructId}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {plasmid.constructName ? (
                        <span className="ml-2 text-slate-500">
                          {plasmid.constructName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {plasmid.experimentCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title={query ? "No plasmids match this search" : "No plasmids yet"}
        >
          {query
            ? "Try a different plasmid ID, name, type, source, or construct ID."
            : "Run the seed import to populate plasmid records from the mock workbook."}
        </EmptyState>
      )}
    </section>
  );
}
