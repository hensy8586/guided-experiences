import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign in | Guided Experiences",
};

export const instant = false;

type SignInPageProps = {
  searchParams: Promise<{ confirmationError?: string; next?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { confirmationError, next } = await searchParams;
  const safeNext = next === "/creator" ? next : "/creator";

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Sign in to access the creator area.
      </p>
      <AuthForm
        mode="sign-in"
        next={safeNext}
        initialError={
          confirmationError === "1"
            ? "The confirmation link is invalid or has expired. Please try again."
            : undefined
        }
      />
    </>
  );
}
