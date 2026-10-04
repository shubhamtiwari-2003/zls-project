"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-redirect";

// Where to go after sign-in, e.g. /sign-in?next=/checkout.
// Read at click time (not useSearchParams) so the page needs no Suspense.
function getNextPath() {
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.7 2.4-7.3 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.5-6 7.1l6.2 5.2C39.2 36.9 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignIn() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(getNextPath());
    router.refresh();
  }

  async function handleGoogle() {
    const next = getNextPath();

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          next === "/"
            ? `${location.origin}/auth/callback`
            : `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT */}
        <section className="relative hidden overflow-hidden bg-[#F5F5F5] dark:bg-[#090909] lg:flex">
          <div className="absolute left-20 top-24 h-44 w-44 rounded-full bg-black/10 blur-3xl dark:bg-white/10"/>
          <div className="absolute right-24 top-16 h-32 w-32 rounded-full bg-black/10 blur-3xl dark:bg-white/5"/>
          <div className="absolute bottom-24 right-20 h-56 w-56 rounded-full bg-black/10 blur-3xl dark:bg-white/10"/>

          <div className="relative z-10 flex h-full flex-col justify-between p-14">
            <h1 className="text-4xl font-black text-[#003D29] dark:text-white">
              ZLayer
            </h1>

            <div className="max-w-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px w-12 bg-foreground"/>
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                  Welcome Back
                </span>
              </div>

              <h2 className="text-6xl font-black leading-[0.95] tracking-tight uppercase">
                Your desk is about to get a lot more interesting.
              </h2>

              <p className="mt-8 text-lg leading-8 text-muted-foreground">
                Sign in to manage orders, wishlist, addresses and get early access
                to limited drops from Z Layer Studio.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  "12-hour early access to every drop",
                  "Lifetime reprint guarantee",
                  "Track every order in real time",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003D29]">
                      <Check className="h-3.5 w-3.5 text-white"/>
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-8 text-sm text-muted-foreground">
              <p><span className="font-bold text-foreground">500+</span> Products</p>
              <p><span className="font-bold text-foreground">Free</span> Shipping</p>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl">
              <div className="p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold">Welcome back</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sign in to your Z Layer Studio account
                  </p>
                </div>

                {/* Google */}
                <button
                  onClick={handleGoogle}
                  className="cursor-pointer mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 font-medium transition hover:bg-muted"
                >
                  <GoogleIcon/>
                  Continue with Google
                </button>

                {/* Divider */}
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-border"/>
                  <span className="text-sm text-muted-foreground">OR</span>
                  <div className="h-px flex-1 bg-border"/>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-[#003D29]"
                  />
                </div>

                {/* Password */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium">Password</label>

                    <Link
                      href="/forgot-password"
                      className="text-xs text-[#1589e1]"
                    >
                      Forgot?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 outline-none transition focus:border-[#003D29]"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Continue */}
                <button
                  disabled={loading}
                  onClick={handleSignIn}
                  className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111111] py-3.5 font-semibold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Continue"}
                  {!loading && <ArrowRight size={18}/>}
                </button>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/30 px-8 py-6">
                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/sign-up"
                    className="font-semibold text-[#1589e1] cursor-pointer"
                  >
                    Create one
                  </Link>
                </p>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Secured by Supabase
                </p>
              </div>
            </div>

            
          </div>
        </section>
      </div>
    </main>
  );
}