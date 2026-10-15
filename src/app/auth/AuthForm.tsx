"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  signIn,
  signUp,
  type AuthFormState,
} from "@/app/auth/actions";

const initialState: AuthFormState = {
  status: "idle",
  message: "",
};

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  next?: string;
  initialError?: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

export function AuthForm({
  mode,
  next = "/creator",
  initialError,
}: AuthFormProps) {
  const isSignIn = mode === "sign-in";
  const formInitialState: AuthFormState = initialError
    ? { status: "error", message: initialError }
    : initialState;
  const [state, formAction] = useActionState(
    isSignIn ? signIn : signUp,
    formInitialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {isSignIn ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-stone-800"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-stone-800"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          required
          className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
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

      <SubmitButton label={isSignIn ? "Sign in" : "Create account"} />

      <p className="text-center text-sm text-stone-600">
        {isSignIn ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          href={isSignIn ? "/auth/sign-up" : "/auth/sign-in"}
          className="font-semibold text-emerald-800 underline decoration-emerald-800/40 underline-offset-4 hover:decoration-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {isSignIn ? "Create one" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
