import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Creator | Guided Experiences",
};

export const instant = false;

type CreatorPageProps = {
  searchParams: Promise<{ signOutError?: string }>;
};

export default async function CreatorPage({ searchParams }: CreatorPageProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    redirect("/auth/sign-in?next=/creator");
  }

  const { signOutError } = await searchParams;
  const email = data.claims.email ?? "Email unavailable";

  return (
    <main className="min-h-[100svh] bg-stone-100 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-800">
          Guided Experiences
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
          Creator
        </h1>
        <p className="mt-4 text-stone-700">Signed in as {email}</p>
        <p className="mt-2 text-stone-600">
          Your Experiences will appear here.
        </p>

        {signOutError ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            Unable to sign out. Please try again.
          </p>
        ) : null}

        <form action={signOut} className="mt-7">
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
