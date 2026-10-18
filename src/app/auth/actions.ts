"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

function readCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return null;
  }

  return { email: email.trim(), password };
}

function safeReturnPath(value: FormDataEntryValue | null) {
  if (value === "/creator") {
    return value;
  }

  return "/creator";
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin) {
    return origin;
  }

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return null;
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function signIn(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const credentials = readCredentials(formData);

  if (!credentials) {
    return {
      status: "error",
      message: "Enter both your email address and password.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      return {
        status: "error",
        message:
          error.code === "email_not_confirmed"
            ? "Confirm your email address before signing in."
            : "Unable to sign in. Check your email address and password.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "Unable to sign in right now. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeReturnPath(formData.get("next")));
}

export async function signUp(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const credentials = readCredentials(formData);

  if (!credentials) {
    return {
      status: "error",
      message: "Enter both your email address and password.",
    };
  }

  const origin = await getRequestOrigin();

  if (!origin) {
    return {
      status: "error",
      message: "Unable to determine the confirmation address. Try again.",
    };
  }

  const confirmationUrl = new URL("/auth/confirm", origin);
  confirmationUrl.searchParams.set("next", "/creator");

  let sessionCreated = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      ...credentials,
      options: {
        emailRedirectTo: confirmationUrl.toString(),
      },
    });

    if (error) {
      const message =
        error.code === "weak_password"
          ? "Choose a stronger password that meets the project requirements."
          : error.code === "email_address_invalid"
            ? "Enter a valid email address."
            : error.code === "user_already_exists"
              ? "An account may already exist. Try signing in instead."
              : "Unable to create the account. Check your details and try again.";

      return { status: "error", message };
    }

    sessionCreated = Boolean(data.session);
  } catch {
    return {
      status: "error",
      message: "Unable to create the account right now. Please try again.",
    };
  }

  if (sessionCreated) {
    revalidatePath("/", "layout");
    redirect("/creator");
  }

  return {
    status: "success",
    message: "Check your email to confirm your account, then sign in.",
  };
}

export async function signOut() {
  let failed = false;
  try {
    const supabase = await createClient();
    // Let Supabase handle expired/missing sessions and clear its own cookies.
    // A failed claims lookup must not skip the user's explicit logout request.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    failed = Boolean(error);
  } catch {
    failed = true;
  }

  if (failed) redirect("/creator?signOutError=1");
  revalidatePath("/", "layout");
  redirect("/auth/sign-in");
}
