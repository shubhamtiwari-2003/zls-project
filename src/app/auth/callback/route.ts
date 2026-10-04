import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

// Profile rows are created by the on_auth_user_created trigger in the
// database, never here. Writing `role` from this route would reset admins
// to "user" on every OAuth login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("OAuth code exchange error:", error);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=oauth`);
}
