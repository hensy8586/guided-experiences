"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteExperience,
  type ExperienceActionState,
} from "@/app/creator/experiences/actions";

const initialState: ExperienceActionState = {
  status: "idle",
  message: "",
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete experience"}
    </button>
  );
}

export function DeleteExperienceButton({
  experienceId,
  experienceTitle,
}: {
  experienceId: string;
  experienceTitle: string;
}) {
  const deleteAction = deleteExperience.bind(null, experienceId);
  const [state, formAction] = useActionState(deleteAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete “${experienceTitle}”? This cannot be undone.`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="space-y-3"
    >
      <DeleteButton />
      {state.message ? (
        <p role="alert" aria-live="polite" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
