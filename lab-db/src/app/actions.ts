"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ConstructFormValues,
  ExperimentFormValues,
  FormState,
  PlasmidFormValues,
} from "@/lib/form-options";
import {
  constructValuesFromForm,
  createConstruct,
  createExperiment,
  createPlasmid,
  experimentValuesFromForm,
  plasmidValuesFromForm,
  updateConstruct,
  updateExperiment,
  updatePlasmid,
} from "@/lib/write-db";

function revalidateConstructPaths(id: string, originalId?: string) {
  revalidatePath("/");
  revalidatePath("/constructs");
  revalidatePath("/plasmids");
  revalidatePath(`/constructs/${id}`);
  if (originalId && originalId !== id) {
    revalidatePath(`/constructs/${originalId}`);
  }
}

function revalidatePlasmidPaths(id: string, originalId?: string) {
  revalidatePath("/");
  revalidatePath("/constructs");
  revalidatePath("/plasmids");
  revalidatePath("/experiments");
  revalidatePath(`/plasmids/${id}`);
  if (originalId && originalId !== id) {
    revalidatePath(`/plasmids/${originalId}`);
  }
}

function revalidateExperimentPaths(id: string, originalId?: string) {
  revalidatePath("/");
  revalidatePath("/plasmids");
  revalidatePath("/experiments");
  revalidatePath(`/experiments/${id}`);
  if (originalId && originalId !== id) {
    revalidatePath(`/experiments/${originalId}`);
  }
}

export async function createConstructAction(
  _state: FormState<ConstructFormValues>,
  formData: FormData,
) {
  const values = constructValuesFromForm(formData);
  const result = createConstruct(values);

  if (!result.ok) {
    return result.state;
  }

  revalidateConstructPaths(result.id);
  redirect(`/constructs/${result.id}`);
}

export async function updateConstructAction(
  originalId: string,
  _state: FormState<ConstructFormValues>,
  formData: FormData,
) {
  const values = constructValuesFromForm(formData);
  const result = updateConstruct(originalId, values);

  if (!result.ok) {
    return result.state;
  }

  revalidateConstructPaths(result.id, originalId);
  redirect(`/constructs/${result.id}`);
}

export async function createPlasmidAction(
  _state: FormState<PlasmidFormValues>,
  formData: FormData,
) {
  const values = plasmidValuesFromForm(formData);
  const result = createPlasmid(values);

  if (!result.ok) {
    return result.state;
  }

  revalidatePlasmidPaths(result.id);
  redirect(`/plasmids/${result.id}`);
}

export async function updatePlasmidAction(
  originalId: string,
  _state: FormState<PlasmidFormValues>,
  formData: FormData,
) {
  const values = plasmidValuesFromForm(formData);
  const result = updatePlasmid(originalId, values);

  if (!result.ok) {
    return result.state;
  }

  revalidatePlasmidPaths(result.id, originalId);
  redirect(`/plasmids/${result.id}`);
}

export async function createExperimentAction(
  _state: FormState<ExperimentFormValues>,
  formData: FormData,
) {
  const values = experimentValuesFromForm(formData);
  const result = createExperiment(values);

  if (!result.ok) {
    return result.state;
  }

  revalidateExperimentPaths(result.id);
  redirect(`/experiments/${result.id}`);
}

export async function updateExperimentAction(
  originalId: string,
  _state: FormState<ExperimentFormValues>,
  formData: FormData,
) {
  const values = experimentValuesFromForm(formData);
  const result = updateExperiment(originalId, values);

  if (!result.ok) {
    return result.state;
  }

  revalidateExperimentPaths(result.id, originalId);
  redirect(`/experiments/${result.id}`);
}
