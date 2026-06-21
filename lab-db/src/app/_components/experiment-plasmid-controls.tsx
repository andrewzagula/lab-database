"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { linkPlasmidAction, unlinkPlasmidAction } from "@/app/actions";
import type { LinkActionState } from "@/lib/form-options";

type PlasmidOption = {
  id: string;
  name: string | null;
  constructId: string | null;
};

function optionLabel(option: PlasmidOption) {
  const name = option.name ? ` — ${option.name}` : "";
  const construct = option.constructId ? ` (${option.constructId})` : "";
  return `${option.id}${name}${construct}`;
}

function LinkSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Linking..." : "Add plasmid"}
    </button>
  );
}

export function LinkPlasmidForm({
  experimentId,
  options,
}: {
  experimentId: string;
  options: PlasmidOption[];
}) {
  const action = linkPlasmidAction.bind(null, experimentId);
  const [state, formAction] = useActionState<LinkActionState, FormData>(
    action,
    null,
  );

  if (!options.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
        Every plasmid is already linked to this experiment. Create a new plasmid
        to add more.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="plasmidId"
            className="text-sm font-semibold text-slate-950"
          >
            Add a plasmid
          </label>
          <select
            id="plasmidId"
            name="plasmidId"
            defaultValue=""
            className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
          >
            <option value="" disabled>
              Select a plasmid...
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {optionLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <LinkSubmitButton />
      </div>
      {state?.error ? (
        <p className="mt-3 text-sm text-rose-700">{state.error}</p>
      ) : null}
    </form>
  );
}

function UnlinkSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}

export function UnlinkPlasmidButton({
  experimentId,
  plasmidId,
}: {
  experimentId: string;
  plasmidId: string;
}) {
  const action = unlinkPlasmidAction.bind(null, experimentId, plasmidId);

  return (
    <form action={action}>
      <UnlinkSubmitButton />
    </form>
  );
}
