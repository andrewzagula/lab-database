import Link from "next/link";
import { ConstructForm } from "@/app/_components/construct-form";
import { createConstructAction } from "@/app/actions";
import { emptyConstructValues } from "@/lib/form-options";

export const dynamic = "force-dynamic";

export default function NewConstructPage() {
  return (
    <section className="space-y-6">
      <Link
        href="/constructs"
        className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
      >
        Back to constructs
      </Link>
      <ConstructForm
        action={createConstructAction}
        initialValues={emptyConstructValues}
        title="Create construct"
        description="Add a protein design record. Plasmid relationships update automatically when plasmids point at this construct."
        submitLabel="Create construct"
        cancelHref="/constructs"
      />
    </section>
  );
}
