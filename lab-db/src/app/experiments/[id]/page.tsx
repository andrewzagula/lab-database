import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/app/_components/empty-state";
import {
  LinkPlasmidForm,
  UnlinkPlasmidButton,
} from "@/app/_components/experiment-plasmid-controls";
import { storedFileExists } from "@/lib/files";
import {
  getExperimentDetail,
  listPlasmidsNotInExperiment,
} from "@/lib/read-db";
import { RelationshipGraph } from "@/app/_components/relationship-graph";
import { getRecordGraph } from "@/lib/graph";
import { layoutRadial } from "@/lib/graph-layout";

export const dynamic = "force-dynamic";

type ExperimentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function displayValue(value: string | number | null) {
  return value ?? "—";
}

export async function generateMetadata({ params }: ExperimentDetailPageProps) {
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

export default async function ExperimentDetailPage({
  params,
}: ExperimentDetailPageProps) {
  const { id } = await params;
  const experiment = getExperimentDetail(id);

  if (!experiment) {
    notFound();
  }

  const availablePlasmids = listPlasmidsNotInExperiment(experiment.id);

  const focusGraph = getRecordGraph("experiment", experiment.id);
  const focusLayout = focusGraph ? layoutRadial(focusGraph) : null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold uppercase text-teal-700">
            Experiment detail
          </p>
          <h2 className="mt-2 font-mono text-3xl font-semibold tracking-normal text-slate-950">
            {experiment.id}
          </h2>
          {experiment.titleAim ? (
            <p className="mt-2 text-lg text-slate-600">
              {experiment.titleAim}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/experiments/${experiment.id}/edit`}
            className="inline-flex rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Edit experiment
          </Link>
          <Link
            href="/experiments"
            className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-800"
          >
            Back to experiments
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Metadata
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Experiment record
          </h3>
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="ID" value={experiment.id} mono />
          <Field label="Title / aim" value={displayValue(experiment.titleAim)} />
          <Field label="Owner" value={displayValue(experiment.owner)} />
          <Field label="Type" value={displayValue(experiment.type)} />
          <Field label="Source" value={displayValue(experiment.source)} />
          <Field
            label="External party"
            value={displayValue(experiment.externalParty)}
          />
          <Field label="Start date" value={displayValue(experiment.startDate)} mono />
          <Field label="End date" value={displayValue(experiment.endDate)} mono />
          <Field
            label="Folder path"
            value={displayValue(experiment.folderPath)}
            mono
          />
        </dl>
      </section>

      {focusLayout ? (
        <section className="space-y-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase text-teal-700">
              Relationships
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">
              Relationship map
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              This record and the experiments, plasmids, and constructs it
              connects to. Click a node to open it.
            </p>
          </div>
          <RelationshipGraph
            nodes={focusLayout.nodes}
            edges={focusLayout.edges}
            mode="focus"
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Relationships
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Linked plasmids
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Manage which plasmids this experiment uses. Each plasmid also traces
            to the construct it carries.
          </p>
        </div>
        <LinkPlasmidForm
          experimentId={experiment.id}
          options={availablePlasmids}
        />
        {experiment.plasmids.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Plasmid</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                    <th className="px-4 py-3 font-semibold">Construct</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {experiment.plasmids.map((plasmid) => (
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
                      <td className="px-4 py-3 text-slate-700">
                        {plasmid.constructId ? (
                          <>
                            <Link
                              href={`/constructs/${plasmid.constructId}`}
                              className="font-mono text-teal-800 hover:underline"
                            >
                              {plasmid.constructId}
                            </Link>
                            {plasmid.constructName ? (
                              <span className="ml-2 text-slate-500">
                                {plasmid.constructName}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <UnlinkPlasmidButton
                          experimentId={experiment.id}
                          plasmidId={plasmid.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No linked plasmids">
            Use the selector above to add a plasmid to this experiment.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            File metadata
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Experiment files
          </h3>
          {experiment.files.length ? (
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">File</th>
                      <th className="px-4 py-3 font-semibold">Stored path</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {experiment.files.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {storedFileExists(file.filePath) ? (
                            <a
                              href={`/files/experiment/${file.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-800 hover:underline"
                            >
                              {file.fileName}
                            </a>
                          ) : (
                            <span>
                              {file.fileName}{" "}
                              <span className="text-xs font-semibold text-rose-600">
                                (missing)
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {file.filePath}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {displayValue(file.fileType)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No experiment files">
                This experiment does not have any file metadata recorded.
              </EmptyState>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Notes
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">
            Comments
          </h3>
          <p className="mt-4 break-words text-sm leading-6 text-slate-700">
            {displayValue(experiment.comments)}
          </p>
          {experiment.files.some((file) => file.notes) ? (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-slate-950">
                File notes
              </h4>
              {experiment.files.map((file) =>
                file.notes ? (
                  <div
                    key={file.id}
                    className="rounded-md border border-slate-200 px-3 py-2"
                  >
                    <p className="font-mono text-xs text-slate-500">
                      {file.fileName}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {file.notes}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
