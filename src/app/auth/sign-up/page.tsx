import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";

export const metadata: Metadata = {
  title: "Create account | Guided Experiences",
};

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-950">
        Create account
      </h1>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Create a creator account with your email address and password.
      </p>
      <AuthForm mode="sign-up" />
    </>
  );
}
