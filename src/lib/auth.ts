import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side admin guard.
 *
 * - Verifies the user with Supabase Auth (getUser, not getSession)
 * - Looks up the role in public.profiles
 * - Redirects anyone who is not an admin
 */
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/sign-in");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Admin profile lookup error:", profileError);
  }

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return { supabase, user };
}

/**
 * Admin check for API routes: returns null instead of redirecting, so the
 * route can answer 401/403.
 */
export async function getAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? { supabase, user } : null;
}
