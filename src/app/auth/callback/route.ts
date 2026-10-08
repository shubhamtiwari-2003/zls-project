import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

/*
  Google sign-in (and email confirmation links) land here with ?code=…
  Swaps the code for a session cookie, then sends the user on to `next`.

  Profile rows are created by the on_auth_user_created trigger in the
  database, never here. Writing `role` from this route would reset admins
  to "user" on every OAuth login. Only empty name fields are filled in,
  from the Google account.
*/

/**
 * The public address of the site. Behind Hostinger's proxy, request.url
 * can be the internal address (http://localhost:3000), so the forwarded
 * host is used in production.
 */
function siteOrigin(request: Request): string {
  const { origin } = new URL(request.url);
  if (process.env.NODE_ENV === "development") return origin;

  const host = request.headers.get("x-forwarded-host");
  if (!host) return origin;

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** First/last/display name from the Google account. */
function googleNames(user: User) {
  const meta = user.user_metadata ?? {};
  const full = String(meta.full_name ?? meta.name ?? "").trim().slice(0, 100);
  const [firstFromFull, ...rest] = full.split(/\s+/);

  return {
    first_name: String(meta.given_name ?? firstFromFull ?? "").trim().slice(0, 100) || null,
    last_name: String(meta.family_name ?? rest.join(" ")).trim().slice(0, 100) || null,
    display_name: full || null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = siteOrigin(request);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // The customer pressed Cancel on Google's screen.
  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/sign-in?error=cancelled`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Fill names the customer hasn't set yet (never overwrites their edits).
      if (data.user?.identities?.some((identity) => identity.provider === "google")) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, display_name")
            .eq("user_id", data.user.id)
            .maybeSingle();

          if (profile) {
            const names = googleNames(data.user);
            const missing = Object.fromEntries(
              (Object.keys(names) as (keyof typeof names)[])
                .filter((key) => !profile[key] && names[key])
                .map((key) => [key, names[key]])
            );

            if (Object.keys(missing).length) {
              await supabase.from("profiles").update(missing).eq("user_id", data.user.id);
            }
          }
        } catch (profileError) {
          // Not fatal: the customer can add their name in Account.
          console.error("Google profile names error:", profileError);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("OAuth code exchange error:", error);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=oauth`);
}
