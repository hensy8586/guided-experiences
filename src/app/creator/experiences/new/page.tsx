import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createExperience } from "@/app/creator/experiences/actions";
import { ExperienceForm } from "@/app/creator/experiences/ExperienceForm";
import { getAuthenticatedCreator } from "@/lib/creator-experiences";

export const metadata: Metadata = {
  title: "Create Experience | Guided Experiences",
};

export const instant = false;

export default async function NewExperiencePage() {
  const creator = await getAuthenticatedCreator();

  if (!creator) {
    redirect("/auth/sign-in?next=/creator");
  }

  return (
    <main className="min-h-[100svh] bg-stone-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <Link
          href="/creator"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Back to Creator
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
          Create experience
        </h1>
        <p className="mt-2 text-stone-600">
          Start with the title and description. New Experiences remain drafts.
        </p>

        <ExperienceForm
          action={createExperience}
          submitLabel="Create experience"
        />
      </section>
    </main>
  );
}
