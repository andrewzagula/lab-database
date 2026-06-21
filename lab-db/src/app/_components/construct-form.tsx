"use client";

import { useActionState } from "react";
import {
  FormActions,
  FormErrorSummary,
  TextAreaField,
  TextField,
} from "@/app/_components/record-form-controls";
import type { ConstructFormValues, FormState } from "@/lib/form-options";

type ConstructFormAction = (
  state: FormState<ConstructFormValues>,
  formData: FormData,
) => Promise<FormState<ConstructFormValues>>;

type ConstructFormProps = {
  action: ConstructFormAction;
  initialValues: ConstructFormValues;
  title: string;
  description: string;
  submitLabel: string;
  cancelHref: string;
};

export function ConstructForm({
  action,
  initialValues,
  title,
  description,
  submitLabel,
  cancelHref,
}: ConstructFormProps) {
  const [state, formAction] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const { values, errors } = state;

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Construct form
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <FormErrorSummary errors={errors} />
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Construct ID"
              name="id"
              value={values.id}
              error={errors.id}
              helper="Required. Format: CON000001."
              placeholder="CON000002"
              mono
            />
            <TextField
              label="Short name"
              name="shortName"
              value={values.shortName}
              error={errors.shortName}
              placeholder="Example construct"
            />
          </div>
          <TextAreaField
            label="Protein sequence"
            name="proteinSequence"
            value={values.proteinSequence}
            error={errors.proteinSequence}
            helper="Optional. Whitespace is removed; letters only are allowed."
            rows={10}
            mono
          />
          <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
        </div>
      </section>
    </form>
  );
}
