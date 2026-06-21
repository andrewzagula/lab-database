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
  BACTERIAL_ANTIBIOTICS,
  BOOLEAN_OPTIONS,
  MAMMALIAN_ANTIBIOTICS,
  PLASMID_SOURCES,
  PLASMID_TYPES,
  PROMOTERS,
  type FormState,
  type PlasmidFormValues,
} from "@/lib/form-options";
import type { ConstructOption } from "@/lib/read-db";

type PlasmidFormAction = (
  state: FormState<PlasmidFormValues>,
  formData: FormData,
) => Promise<FormState<PlasmidFormValues>>;

type PlasmidFormProps = {
  action: PlasmidFormAction;
  initialValues: PlasmidFormValues;
  constructOptions: ConstructOption[];
  title: string;
  description: string;
  submitLabel: string;
  cancelHref: string;
};

function constructSelectOptions(constructs: ConstructOption[]) {
  return constructs.map((construct) => ({
    value: construct.id,
    label: construct.label ? `${construct.id} - ${construct.label}` : construct.id,
  }));
}

export function PlasmidForm({
  action,
  initialValues,
  constructOptions,
  title,
  description,
  submitLabel,
  cancelHref,
}: PlasmidFormProps) {
  const [state, formAction] = useActionState(action, {
    values: initialValues,
    errors: {},
  });
  const { values, errors } = state;
  const constructs = constructSelectOptions(constructOptions);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <p className="font-mono text-xs font-semibold uppercase text-teal-700">
            Plasmid form
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
              label="Plasmid ID"
              name="id"
              value={values.id}
              error={errors.id}
              helper="Required. Format: PL000001."
              placeholder="PL000002"
              mono
            />
            <TextField
              label="Plasmid name"
              name="name"
              value={values.name}
              error={errors.name}
              placeholder="Example plasmid"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label="Linked construct"
              name="constructId"
              value={values.constructId}
              error={errors.constructId}
              helper="Choose an existing construct. Experiment links are managed in Phase 6."
              options={constructs}
              blankLabel="No construct"
            />
            <SelectField
              label="Plasmid type"
              name="plasmidType"
              value={values.plasmidType}
              error={errors.plasmidType}
              options={PLASMID_TYPES}
              blankLabel="No type"
            />
            <SelectField
              label="Source"
              name="source"
              value={values.source}
              error={errors.source}
              options={PLASMID_SOURCES}
              blankLabel="No source"
            />
            <SelectField
              label="Bacterial antibiotic"
              name="bacterialAntibiotic"
              value={values.bacterialAntibiotic}
              error={errors.bacterialAntibiotic}
              options={BACTERIAL_ANTIBIOTICS}
              blankLabel="No antibiotic"
            />
            <SelectField
              label="Mammalian antibiotic"
              name="mammalianAntibiotic"
              value={values.mammalianAntibiotic}
              error={errors.mammalianAntibiotic}
              options={MAMMALIAN_ANTIBIOTICS}
              blankLabel="No antibiotic"
            />
            <SelectField
              label="Promoter"
              name="mammalianPromoter"
              value={values.mammalianPromoter}
              error={errors.mammalianPromoter}
              options={PROMOTERS}
              blankLabel="No promoter"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Empty vector"
              name="emptyVector"
              value={values.emptyVector}
              error={errors.emptyVector}
              options={BOOLEAN_OPTIONS}
              blankLabel="Unknown"
            />
            <SelectField
              label="Placeholder only"
              name="placeholderOnly"
              value={values.placeholderOnly}
              error={errors.placeholderOnly}
              options={BOOLEAN_OPTIONS}
              blankLabel="Unknown"
            />
            <SelectField
              label="Plasmid prep"
              name="hasPlasmidPrep"
              value={values.hasPlasmidPrep}
              error={errors.hasPlasmidPrep}
              options={BOOLEAN_OPTIONS}
              blankLabel="Unknown"
            />
            <SelectField
              label="Glycerol stock"
              name="hasGlycerolStock"
              value={values.hasGlycerolStock}
              error={errors.hasGlycerolStock}
              options={BOOLEAN_OPTIONS}
              blankLabel="Unknown"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Vector backbone"
              name="vectorBackbone"
              value={values.vectorBackbone}
              error={errors.vectorBackbone}
            />
            <TextField
              label="Insert"
              name="insertDescription"
              value={values.insertDescription}
              error={errors.insertDescription}
            />
            <TextField
              label="Guide RNA"
              name="guideRna"
              value={values.guideRna}
              error={errors.guideRna}
            />
            <TextField
              label="Bacterial origin"
              name="bacterialOri"
              value={values.bacterialOri}
              error={errors.bacterialOri}
            />
            <TextField
              label="Created by"
              name="createdBy"
              value={values.createdBy}
              error={errors.createdBy}
            />
            <TextField
              label="Created on"
              name="createdOn"
              type="date"
              value={values.createdOn}
              error={errors.createdOn}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <TextAreaField
              label="Comments"
              name="comments"
              value={values.comments}
              error={errors.comments}
              rows={5}
            />
            <TextAreaField
              label="Description"
              name="description"
              value={values.description}
              error={errors.description}
              rows={5}
            />
          </div>

          <FormActions cancelHref={cancelHref} submitLabel={submitLabel} />
        </div>
      </section>
    </form>
  );
}
