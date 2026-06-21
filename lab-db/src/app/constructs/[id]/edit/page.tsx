import Link from "next/link";
import { notFound } from "next/navigation";
import { ConstructForm } from "@/app/_components/construct-form";
import { updateConstructAction } from "@/app/actions";
import type { ConstructFormValues } from "@/lib/form-options";
import { getConstructFormRecord } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type EditConstructPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function toFormValues(record: NonNullable<ReturnType<typeof getConstructFormRecord>>): ConstructFormValues {
  return {
    id: record.id,
    shortName: record.shortName ?? "",
    proteinSequence: record.proteinSequence ?? "",
  };
}

export default async function EditConstructPage({ params }: EditConstructPageProps) {
  const { id } = await params;
  const construct = getConstructFormRecord(id);

  if (!construct) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link
        href={`/constructs/${construct.id}`}
        className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
      >
        Back to construct detail
      </Link>
      <ConstructForm
        action={updateConstructAction.bind(null, construct.id)}
        initialValues={toFormValues(construct)}
        title={`Edit ${construct.id}`}
        description="Update construct metadata and sequence. Existing plasmid links are preserved, including if the construct ID changes."
        submitLabel="Save construct"
        cancelHref={`/constructs/${construct.id}`}
      />
    </section>
  );
}
