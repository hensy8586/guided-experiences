import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import {
  getAuthenticatedCreator,
  listCreatorExperiences,
} from "@/lib/creator-experiences";

export const metadata: Metadata = {
  title: "Creator | Guided Experiences",
};

export const instant = false;

type CreatorPageProps = {
  searchParams: Promise<{ signOutError?: string }>;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CreatorPage({ searchParams }: CreatorPageProps) {
  const creator = await getAuthenticatedCreator();

  if (!creator) {
    redirect("/auth/sign-in?next=/creator");
  }

  const { signOutError } = await searchParams;
  const experiences = await listCreatorExperiences(
    creator.supabase,
    creator.userId,
  );

  return (
    <main className="min-h-[100svh] bg-stone-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-800">
              Guided Experiences
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
              Creator
            </h1>
            <p className="mt-2 text-sm text-stone-600">
              Signed in as {creator.email}
            </p>
          </div>
          <Link
            href="/creator/experiences/new"
            className="inline-flex min-h-12 items-center rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Create experience
          </Link>
        </div>

        {signOutError ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            Unable to sign out. Please try again.
          </p>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xl font-semibold text-stone-950">
            My Experiences
          </h2>

          {experiences === null ? (
            <p role="alert" className="mt-4 text-sm text-red-700">
              Unable to load your Experiences. Please try again.
            </p>
          ) : experiences.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
              You haven&apos;t created any Experiences yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
              {experiences.map((experience) => (
                <li
                  key={experience.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-5"
                >
                  <div>
                    <h3 className="font-semibold text-stone-950">
                      {experience.title}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600">
                      {experience.status === "draft" ? "Draft" : "Published"}
                      <span aria-hidden="true"> · </span>
                      Updated {formatUpdatedAt(experience.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/creator/experiences/${experience.id}`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-900 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form action={signOut} className="mt-8 border-t border-stone-200 pt-6">
          <button
            type="submit"
            className="min-h-12 rounded-lg border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-900 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
