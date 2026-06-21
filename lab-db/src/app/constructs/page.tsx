import Link from "next/link";
import { EmptyState } from "@/app/_components/empty-state";
import { SearchForm } from "@/app/_components/search-form";
import { readQuery, type PageSearchParams } from "@/lib/page-params";
import { listConstructs } from "@/lib/read-db";

export const dynamic = "force-dynamic";

export const metadata = { title: "Constructs" };

type ConstructsPageProps = {
  searchParams: PageSearchParams;
};

export default async function ConstructsPage({
  searchParams,
}: ConstructsPageProps) {
  const query = await readQuery(searchParams);
  const constructs = listConstructs(query);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold uppercase text-teal-700">
            Constructs
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            Construct records
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
            Protein design records with plasmid coverage from the local
            database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-sm text-slate-500">
            {constructs.length} shown
          </p>
          <Link
            href="/constructs/new"
            className="inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            New construct
          </Link>
        </div>
      </div>

      <SearchForm
        action="/constructs"
        query={query}
        placeholder="Search by ID or short name"
      />

      {constructs.length ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Short name</th>
                  <th className="px-4 py-3 font-semibold">Length</th>
                  <th className="px-4 py-3 font-semibold">Plasmids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {constructs.map((construct) => (
                  <tr key={construct.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm font-semibold">
                      <Link
                        href={`/constructs/${construct.id}`}
                        className="text-teal-800 hover:underline"
                      >
                        {construct.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {construct.shortName ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {construct.length ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {construct.plasmidCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title={query ? "No constructs match this search" : "No constructs yet"}
        >
          {query
            ? "Try a different construct ID or short name."
            : "Run the seed import to populate construct records from the mock workbook."}
        </EmptyState>
      )}
    </section>
  );
}
