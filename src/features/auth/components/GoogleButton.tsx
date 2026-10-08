"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.7 2.4-7.3 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6 7.1l6.2 5.2C39.2 36.9 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

/**
 * "Continue with Google". Sends the customer to Google, then back through
 * /auth/callback to the page in ?next= (e.g. /checkout), or the homepage.
 */
export function GoogleButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    setLoading(true);
    setError("");

    // Read at click time so the page needs no Suspense for search params.
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    const callback = new URL("/auth/callback", window.location.origin);
    if (next !== "/") callback.searchParams.set("next", next);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Always show the account chooser, so people with several Google
        // accounts can pick the right one.
        queryParams: { prompt: "select_account" },
      },
    });

    // On success the browser is already leaving for Google.
    if (oauthError) {
      console.error("Google sign-in error:", oauthError);
      setError("Google sign-in isn't available right now. Please use email instead.");
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={signIn}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 font-medium transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <GoogleIcon />}
        {loading ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
