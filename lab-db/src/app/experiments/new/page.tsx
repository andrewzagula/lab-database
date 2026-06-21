import Link from "next/link";
import { ExperimentForm } from "@/app/_components/experiment-form";
import { createExperimentAction } from "@/app/actions";
import { emptyExperimentValues } from "@/lib/form-options";

export const dynamic = "force-dynamic";

export default function NewExperimentPage() {
  return (
    <section className="space-y-6">
      <Link
        href="/experiments"
        className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
      >
        Back to experiments
      </Link>
      <ExperimentForm
        action={createExperimentAction}
        initialValues={emptyExperimentValues}
        title="Create experiment"
        description="Add an experiment record. Plasmid relationship management is reserved for Phase 6."
        submitLabel="Create experiment"
        cancelHref="/experiments"
      />
    </section>
  );
}
