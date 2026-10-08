"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  cancelled: "Google sign-in was cancelled. Try again, or use your email.",
  oauth: "We couldn't sign you in with Google. Please try again.",
};

/** Message after a failed Google sign-in (/sign-in?error=…). Wrap in <Suspense>. */
export function OAuthError() {
  const message = MESSAGES[useSearchParams().get("error") ?? ""];
  if (!message) return null;

  return (
    <div role="alert" className="mt-6 rounded-lg bg-danger/10 p-3 text-sm text-danger">
      {message}
    </div>
  );
}
