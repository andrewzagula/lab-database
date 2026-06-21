import Link from "next/link";
import { notFound } from "next/navigation";
import { PlasmidForm } from "@/app/_components/plasmid-form";
import { updatePlasmidAction } from "@/app/actions";
import type { PlasmidFormValues } from "@/lib/form-options";
import { getPlasmidFormRecord, listConstructOptions } from "@/lib/read-db";

export const dynamic = "force-dynamic";

type EditPlasmidPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function booleanValue(value: number | null) {
  if (value == null) {
    return "";
  }

  return value ? "true" : "false";
}

function toFormValues(record: NonNullable<ReturnType<typeof getPlasmidFormRecord>>): PlasmidFormValues {
  return {
    id: record.id,
    name: record.name ?? "",
    emptyVector: booleanValue(record.emptyVector),
    placeholderOnly: booleanValue(record.placeholderOnly),
    hasPlasmidPrep: booleanValue(record.hasPlasmidPrep),
    hasGlycerolStock: booleanValue(record.hasGlycerolStock),
    vectorBackbone: record.vectorBackbone ?? "",
    insertDescription: record.insertDescription ?? "",
    guideRna: record.guideRna ?? "",
    plasmidType: record.plasmidType ?? "",
    bacterialAntibiotic: record.bacterialAntibiotic ?? "",
    mammalianAntibiotic: record.mammalianAntibiotic ?? "",
    source: record.source ?? "",
    mammalianPromoter: record.mammalianPromoter ?? "",
    bacterialOri: record.bacterialOri ?? "",
    createdBy: record.createdBy ?? "",
    createdOn: record.createdOn ?? "",
    comments: record.comments ?? "",
    description: record.description ?? "",
    constructId: record.constructId ?? "",
  };
}

export default async function EditPlasmidPage({ params }: EditPlasmidPageProps) {
  const { id } = await params;
  const plasmid = getPlasmidFormRecord(id);

  if (!plasmid) {
    notFound();
  }

  const constructs = listConstructOptions();

  return (
    <section className="space-y-6">
      <Link
        href={`/plasmids/${plasmid.id}`}
        className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
      >
        Back to plasmid detail
      </Link>
      <PlasmidForm
        action={updatePlasmidAction.bind(null, plasmid.id)}
        initialValues={toFormValues(plasmid)}
        constructOptions={constructs}
        title={`Edit ${plasmid.id}`}
        description="Update plasmid metadata and construct assignment. Existing experiment and file metadata links are preserved."
        submitLabel="Save plasmid"
        cancelHref={`/plasmids/${plasmid.id}`}
      />
    </section>
  );
}
