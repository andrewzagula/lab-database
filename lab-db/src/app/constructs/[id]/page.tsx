import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/app/_components/empty-state";
import { getConstructDetail } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type ConstructDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function displayValue(value: string | number | null) {
  return value ?? "—";
}

/**
 * Render a protein sequence as a FASTA-style block: amino acids grouped in tens,
 * 60 per row, each row prefixed with its 1-based start position.
 */
function formatProteinSequence(sequence: string) {
  const rows: string[] = [];
  for (let i = 0; i < sequence.length; i += 60) {
    const row = sequence.slice(i, i + 60);
    const groups = row.match(/.{1,10}/g)?.join(" ") ?? row;
    rows.push(`${String(i + 1).padStart(5, " ")}  ${groups}`);
  }
  return rows.join("\n");
}

export async function generateMetadata({ params }: ConstructDetailPageProps) {
  const { id } = await params;
  return { title: id };
}

export default async function ConstructDetailPage({
  params,
}: ConstructDetailPageProps) {
  const { id } = await params;
  const construct = getConstructDetail(id);

  if (!construct) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold uppercase text-teal-700">
            Construct detail
          </p>
          <h2 className="mt-2 font-mono text-3xl font-semibold tracking-normal text-slate-950">
            {construct.id}
          </h2>
          {construct.shortName ? (
            <p className="mt-2 text-lg text-slate-600">
              {construct.shortName}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/constructs/${construct.id}/edit`}
            className="inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Edit construct
          </Link>
          <Link
            href="/constructs"
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
          >
            Back to constructs
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">ID</p>
          <p className="mt-3 font-mono text-xl font-semibold text-slate-950">
            {construct.id}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">Short name</p>
          <p className="mt-3 text-xl font-semibold text-slate-950">
            {displayValue(construct.shortName)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-600">Length</p>
          <p className="mt-3 font-mono text-xl font-semibold text-slate-950">
            {construct.length == null ? "—" : `${construct.length} aa`}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-teal-700">
              Protein sequence
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Amino-acid sequence
            </h3>
          </div>
          <p className="font-mono text-sm text-slate-500">
            {construct.proteinSequence?.length ?? 0} characters
          </p>
        </div>
        {construct.proteinSequence ? (
          <pre className="mt-5 max-h-[34rem] overflow-auto whitespace-pre rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
            {formatProteinSequence(construct.proteinSequence)}
          </pre>
        ) : (
          <div className="mt-5">
            <EmptyState title="No protein sequence recorded">
              This construct does not have a protein sequence in the seeded
              database.
            </EmptyState>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Relationships
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Related plasmids
          </h3>
        </div>
        {construct.plasmids.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Experiments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {construct.plasmids.map((plasmid) => (
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
                        {displayValue(plasmid.name)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {displayValue(plasmid.plasmidType)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {displayValue(plasmid.source)}
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
          <EmptyState title="No related plasmids">
            No plasmid records currently point at this construct.
          </EmptyState>
        )}
      </section>
    </section>
  );
}
