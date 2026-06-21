"use client";

import { useActionState } from "react";
import {
  FormActions,
  FormErrorSummary,
  SelectField,
  TextAreaField,
  TextField,
} from "@/app/_components/record-form-controls";
import {
  EXPERIMENT_OWNERS,
  EXPERIMENT_SOURCES,
  EXPERIMENT_TYPES,
  type ExperimentFormValues,
  type FormState,
} from "@/lib/form-options";

type ExperimentFormAction = (
  state: FormState<ExperimentFormValues>,
  formData: FormData,
) => Promise<FormState<ExperimentFormValues>>;

type ExperimentFormProps = {
  action: ExperimentFormAction;
  initialValues: ExperimentFormValues;
  title: string;
  description: string;
  submitLabel: string;
  cancelHref: string;
};

export function ExperimentForm({
  action,
  initialValues,
  title,
  description,
  submitLabel,
  cancelHref,
}: ExperimentFormProps) {
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
            Experiment form
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>

        <div className="mt-6 space-y-7">
          <FormErrorSummary errors={errors} />

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Experiment ID"
              name="id"
              value={values.id}
              error={errors.id}
              helper="Required. Format: EXP000001."
              placeholder="EXP000002"
              mono
            />
            <TextField
              label="Title / aim"
              name="titleAim"
              value={values.titleAim}
              error={errors.titleAim}
              placeholder="Follow-up experiment"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <SelectField
              label="Owner"
              name="owner"
              value={values.owner}
              error={errors.owner}
              options={EXPERIMENT_OWNERS}
              blankLabel="No owner"
            />
            <SelectField
              label="Type"
              name="type"
              value={values.type}
              error={errors.type}
              options={EXPERIMENT_TYPES}
              blankLabel="No type"
            />
            <SelectField
              label="Source"
              name="source"
              value={values.source}
              error={errors.source}
              options={EXPERIMENT_SOURCES}
              blankLabel="No source"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="External party"
              name="externalParty"
              value={values.externalParty}
              error={errors.externalParty}
            />
            <TextField
              label="Folder path"
              name="folderPath"
              value={values.folderPath}
              error={errors.folderPath}
              helper="Stored as metadata only; the folder is referenced by path, not uploaded."
              mono
            />
            <TextField
              label="Start date"
              name="startDate"
              type="date"
              value={values.startDate}
              error={errors.startDate}
            />
            <TextField
              label="End date"
              name="endDate"
              type="date"
              value={values.endDate}
              error={errors.endDate}
            />
          </div>

          <TextAreaField
            label="Comments"
            name="comments"
            value={values.comments}
            error={errors.comments}
            rows={6}
          />

          <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
        </div>
      </section>
    </form>
  );
}
