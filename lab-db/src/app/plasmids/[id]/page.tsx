import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/app/_components/empty-state";
import {
  isGenBankFile,
  readStoredFileText,
  storedFileExists,
} from "@/lib/files";
import { parseGenBank } from "@/lib/genbank";
import { getPlasmidDetail } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type PlasmidDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function displayValue(value: string | number | null) {
  return value ?? "—";
}

export async function generateMetadata({ params }: PlasmidDetailPageProps) {
  const { id } = await params;
  return { title: id };
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mt-1 font-mono text-sm text-slate-950"
            : "mt-1 text-sm text-slate-950"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default async function PlasmidDetailPage({
  params,
}: PlasmidDetailPageProps) {
  const { id } = await params;
  const plasmid = getPlasmidDetail(id);

  if (!plasmid) {
    notFound();
  }

  const fileViews = await Promise.all(
    plasmid.files.map(async (file) => {
      const exists = storedFileExists(file.filePath);
      let genbank = null;
      if (exists && isGenBankFile(file.fileName, file.fileType)) {
        const text = await readStoredFileText(file.filePath);
        genbank = text ? parseGenBank(text) : null;
      }
      return { file, exists, genbank };
    }),
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold uppercase text-teal-700">
            Plasmid detail
          </p>
          <h2 className="mt-2 font-mono text-3xl font-semibold tracking-normal text-slate-950">
            {plasmid.id}
          </h2>
          {plasmid.name ? (
            <p className="mt-2 text-lg text-slate-600">{plasmid.name}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/plasmids/${plasmid.id}/edit`}
            className="inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Edit plasmid
          </Link>
          <Link
            href="/plasmids"
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
          >
            Back to plasmids
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Metadata
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Plasmid record
          </h3>
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ID" value={plasmid.id} mono />
          <Field label="Name" value={displayValue(plasmid.name)} />
          <Field label="Type" value={displayValue(plasmid.plasmidType)} />
          <Field label="Source" value={displayValue(plasmid.source)} />
          <Field
            label="Bacterial antibiotic"
            value={displayValue(plasmid.bacterialAntibiotic)}
          />
          <Field
            label="Mammalian antibiotic"
            value={displayValue(plasmid.mammalianAntibiotic)}
          />
          <Field
            label="Promoter"
            value={displayValue(plasmid.mammalianPromoter)}
          />
          <Field label="Origin" value={displayValue(plasmid.bacterialOri)} />
          <Field label="Created by" value={displayValue(plasmid.createdBy)} />
          <Field label="Created on" value={displayValue(plasmid.createdOn)} mono />
        </dl>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Construct
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Linked construct
          </h3>
          {plasmid.constructId ? (
            <Link
              href={`/constructs/${plasmid.constructId}`}
              className="mt-4 block rounded-md border border-slate-200 px-4 py-3 transition hover:border-teal-700 hover:bg-slate-50"
            >
              <span className="font-mono text-sm font-semibold text-teal-800">
                {plasmid.constructId}
              </span>
              {plasmid.constructName ? (
                <span className="ml-2 text-sm text-slate-700">
                  {plasmid.constructName}
                </span>
              ) : null}
            </Link>
          ) : (
            <div className="mt-4">
              <EmptyState title="No linked construct">
                This plasmid does not currently reference a construct.
              </EmptyState>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Notes
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Comments and description
          </h3>
          <div className="mt-4 space-y-4 break-words text-sm leading-6 text-slate-700">
            <div>
              <p className="font-semibold text-slate-950">Comments</p>
              <p className="mt-1">{displayValue(plasmid.comments)}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-950">Description</p>
              <p className="mt-1">{displayValue(plasmid.description)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Relationships
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Linked experiments
          </h3>
        </div>
        {plasmid.experiments.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Title / aim</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {plasmid.experiments.map((experiment) => (
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
                        {displayValue(experiment.titleAim)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {displayValue(experiment.owner)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {displayValue(experiment.type)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {experiment.startDate ?? "—"}
                        {experiment.endDate ? ` to ${experiment.endDate}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No linked experiments">
            This plasmid is not linked to any experiments yet.
          </EmptyState>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            File metadata
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            GenBank files
          </h3>
        </div>
        {fileViews.length ? (
          <div className="space-y-4">
            {fileViews.map(({ file, exists, genbank }) => (
              <div
                key={file.id}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {exists ? (
                        <a
                          href={`/files/plasmid/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-sm font-semibold text-teal-800 hover:underline"
                        >
                          {file.fileName}
                        </a>
                      ) : (
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {file.fileName}
                        </span>
                      )}
                      {file.fileType ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                          {file.fileType}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {file.filePath}
                    </p>
                  </div>
                  {exists ? (
                    <a
                      href={`/files/plasmid/${file.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
                    >
                      Open / download
                    </a>
                  ) : (
                    <span className="inline-flex shrink-0 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                      File not found
                    </span>
                  )}
                </div>

                {genbank ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Locus" value={displayValue(genbank.locus)} mono />
                      <Field
                        label="Length"
                        value={genbank.lengthBp != null ? `${genbank.lengthBp} bp` : "—"}
                        mono
                      />
                      <Field label="Topology" value={displayValue(genbank.topology)} />
                      <Field label="Molecule" value={displayValue(genbank.moleculeType)} />
                    </dl>
                    {genbank.definition ? (
                      <div className="mt-4">
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          Definition
                        </dt>
                        <dd className="mt-1 break-words text-sm leading-6 text-slate-700">
                          {genbank.definition}
                        </dd>
                      </div>
                    ) : null}
                    {genbank.featureLabels.length ? (
                      <div className="mt-4">
                        <dt className="text-xs font-semibold uppercase text-slate-500">
                          Feature labels ({genbank.featureLabels.length})
                        </dt>
                        <dd className="mt-2 flex flex-wrap gap-1.5">
                          {genbank.featureLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700"
                            >
                              {label}
                            </span>
                          ))}
                        </dd>
                      </div>
                    ) : null}
                  </div>
                ) : !exists && isGenBankFile(file.fileName, file.fileType) ? (
                  <p className="mt-3 text-sm text-slate-500">
                    GenBank metadata is unavailable because the file is missing at
                    its stored path.
                  </p>
                ) : null}

                {file.notes ? (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {file.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No GenBank files">
            This plasmid does not have any file metadata recorded.
          </EmptyState>
        )}
      </section>
    </section>
  );
}
