import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperimentForm } from "@/app/_components/experiment-form";
import { updateExperimentAction } from "@/app/actions";
import type { ExperimentFormValues } from "@/lib/form-options";
import { getExperimentFormRecord } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type EditExperimentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function toFormValues(
  record: NonNullable<ReturnType<typeof getExperimentFormRecord>>,
): ExperimentFormValues {
  return {
    id: record.id,
    owner: record.owner ?? "",
    type: record.type ?? "",
    source: record.source ?? "",
    externalParty: record.externalParty ?? "",
    titleAim: record.titleAim ?? "",
    startDate: record.startDate ?? "",
    endDate: record.endDate ?? "",
    folderPath: record.folderPath ?? "",
    comments: record.comments ?? "",
  };
}

export default async function EditExperimentPage({
  params,
}: EditExperimentPageProps) {
  const { id } = await params;
  const experiment = getExperimentFormRecord(id);

  if (!experiment) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link
        href={`/experiments/${experiment.id}`}
        className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
      >
        Back to experiment detail
      </Link>
      <ExperimentForm
        action={updateExperimentAction.bind(null, experiment.id)}
        initialValues={toFormValues(experiment)}
        title={`Edit ${experiment.id}`}
        description="Update experiment metadata. Linked plasmids and file metadata remain unchanged in Phase 5."
        submitLabel="Save experiment"
        cancelHref={`/experiments/${experiment.id}`}
      />
    </section>
  );
}
