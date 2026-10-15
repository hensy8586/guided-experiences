import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_OTP_TYPES = new Set([
  "signup",
  "email",
]);

function safeReturnPath(value: string | null) {
  if (value === "/creator") {
    return value;
  }

  return "/creator";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const supabase = await createClient();
  let confirmed = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    confirmed = !error;
  } else if (tokenHash && type && ALLOWED_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    confirmed = !error;
  }

  if (confirmed) {
    return NextResponse.redirect(
      new URL(safeReturnPath(searchParams.get("next")), request.url),
    );
  }

  const signInUrl = new URL("/auth/sign-in", request.url);
  signInUrl.searchParams.set("confirmationError", "1");

  return NextResponse.redirect(signInUrl);
}
