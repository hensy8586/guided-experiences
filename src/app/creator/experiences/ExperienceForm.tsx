"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ExperienceActionState } from "@/app/creator/experiences/actions";

const initialState: ExperienceActionState = {
  status: "idle",
  message: "",
};

type ExperienceFormProps = {
  action: (
    state: ExperienceActionState,
    formData: FormData,
  ) => Promise<ExperienceActionState>;
  initialValues?: {
    title: string;
    description: string;
  };
  submitLabel: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function ExperienceForm({
  action,
  initialValues = { title: "", description: "" },
  submitLabel,
}: ExperienceFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-stone-800"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initialValues.title}
          aria-describedby={state.fieldErrors?.title ? "title-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors?.title)}
          className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
        {state.fieldErrors?.title ? (
          <p id="title-error" className="mt-2 text-sm text-red-700">
            {state.fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-stone-800"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={initialValues.description}
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
      </div>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
