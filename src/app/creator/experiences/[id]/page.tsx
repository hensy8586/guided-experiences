import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteExperienceButton } from "@/app/creator/experiences/DeleteExperienceButton";
import { ExperienceForm } from "@/app/creator/experiences/ExperienceForm";
import { updateExperience } from "@/app/creator/experiences/actions";
import {
  getAuthenticatedCreator,
  getCreatorExperience,
} from "@/lib/creator-experiences";

export const metadata: Metadata = {
  title: "Edit Experience | Guided Experiences",
};

export const instant = false;

type EditExperiencePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EditExperiencePage({
  params,
  searchParams,
}: EditExperiencePageProps) {
  const creator = await getAuthenticatedCreator();

  if (!creator) {
    redirect("/auth/sign-in?next=/creator");
  }

  const { id } = await params;
  const result = await getCreatorExperience(
    creator.supabase,
    creator.userId,
    id,
  );

  if (result.status !== "success") {
    return (
      <main className="min-h-[100svh] bg-stone-100 px-4 py-10 sm:px-6">
        <section className="mx-auto w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-stone-950">
            {result.status === "not-found"
              ? "Experience not found."
              : "Unable to load the Experience."}
          </h1>
          <Link
            href="/creator"
            className="mt-5 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Back to Creator
          </Link>
        </section>
      </main>
    );
  }

  const { created } = await searchParams;
  const experience = result.experience;
  const updateAction = updateExperience.bind(null, experience.id);

  return (
    <main className="min-h-[100svh] bg-stone-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <Link
          href="/creator"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Back to Creator
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            Edit experience
          </h1>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-sm font-medium text-stone-700">
            {experience.status === "draft" ? "Draft" : "Published"}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Updated {formatUpdatedAt(experience.updatedAt)}
        </p>

        {created === "1" ? (
          <p
            role="status"
            className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          >
            Draft Experience created.
          </p>
        ) : null}

        <ExperienceForm
          action={updateAction}
          initialValues={{
            title: experience.title,
            description: experience.description,
          }}
          submitLabel="Save changes"
        />

        <div className="mt-8 border-t border-stone-200 pt-6">
          <h2 className="font-semibold text-stone-950">Delete Experience</h2>
          <p className="mt-1 mb-4 text-sm text-stone-600">
            This permanently removes the Experience.
          </p>
          <DeleteExperienceButton
            experienceId={experience.id}
            experienceTitle={experience.title}
          />
        </div>
      </section>
    </main>
  );
}
