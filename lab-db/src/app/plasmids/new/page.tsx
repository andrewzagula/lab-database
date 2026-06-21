import Link from "next/link";
import { PlasmidForm } from "@/app/_components/plasmid-form";
import { createPlasmidAction } from "@/app/actions";
import { emptyPlasmidValues } from "@/lib/form-options";
import { listConstructOptions } from "@/lib/read-db";

export const dynamic = "force-dynamic";

export default function NewPlasmidPage() {
  const constructs = listConstructOptions();

  return (
    <section className="space-y-6">
      <Link
        href="/plasmids"
        className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
      >
        Back to plasmids
      </Link>
      <PlasmidForm
        action={createPlasmidAction}
        initialValues={emptyPlasmidValues}
        constructOptions={constructs}
        title="Create plasmid"
        description="Add a plasmid record and optionally link it to an existing construct. Experiment links are managed from each experiment's detail page."
        submitLabel="Create plasmid"
        cancelHref="/plasmids"
      />
    </section>
  );
}
