"use client";

import { useActionState } from "react";
import { setPublication } from "./publication-actions";

export function PublicationControls({ id, published }: { id: string; published: boolean }) {
  const [state, action, pending] = useActionState(setPublication.bind(null, id, !published), { message: "" });
  return <section className="mt-6 border-t border-stone-200 pt-5" aria-label="Publication">
    <h2 className="font-semibold">Publication</h2>
    <p className="my-2 text-sm text-stone-600">{published
      ? "Saved edits are visible on new public page loads. Unpublish before removing the last Stop."
      : "Save your changes and add at least one Stop, then publish to share this Experience."}</p>
    <form action={action}>
      <button disabled={pending} className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50">
        {pending ? "Saving…" : published ? "Unpublish" : "Publish"}
      </button>
    </form>
    <p role="status" className="mt-2 text-sm">{state.message}</p>
    {published && <a href={`/experiences/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline focus-visible:outline-2">Open public Experience (new tab)</a>}
  </section>;
}
