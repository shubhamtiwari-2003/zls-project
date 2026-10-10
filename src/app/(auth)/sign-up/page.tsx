"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { GoogleButton } from "@/features/auth/components/GoogleButton";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const handleSignUp = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/sign-in");
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* LEFT PANEL */}
        <section className="relative hidden overflow-hidden bg-[#F5F5F5] dark:bg-[#090909] lg:flex">
          <div className="absolute left-20 top-20 h-44 w-44 rounded-full bg-black/10 blur-3xl dark:bg-white/10" />
          <div className="absolute right-20 top-24 h-32 w-32 rounded-full bg-black/10 blur-3xl dark:bg-white/5" />
          <div className="absolute bottom-20 right-20 h-56 w-56 rounded-full bg-black/10 blur-3xl dark:bg-white/10" />

          <div className="relative z-10 flex h-full flex-col justify-between p-14">
            <Link href="/">
              <h1 className="text-4xl font-black text-brand dark:text-white">
                ZLayer
              </h1>
            </Link>

            <div className="max-w-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px w-12 bg-foreground" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">
                  Join the Studio
                </span>
              </div>

              <h2 className="text-6xl font-black leading-[0.95] tracking-tight">
                Create your space. Collect meaningful art.
              </h2>

              <p className="mt-8 text-lg leading-8 text-muted-foreground">
                Become part of the Z Factor Studio community and enjoy early
                access, wishlist syncing and seamless order tracking.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  "Exclusive member-only launches",
                  "Lifetime order history",
                  "Secure checkout with Supabase Auth",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-8 text-sm text-muted-foreground">
              <p>
                <span className="font-bold text-foreground">500+</span> Products
              </p>
              <p>
                <span className="font-bold text-foreground">4.9★</span> Customer
                Rating
              </p>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl">
              <div className="p-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold">Create account</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start your Z Factor Studio journey
                  </p>
                </div>

                {/* Google */}
                <GoogleButton className="mt-8" />

                {/* Divider */}
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm text-muted-foreground">OR</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-brand"
                  />
                </div>

                {/* Email */}
                <div className="mt-5 space-y-2">
                  <label className="text-sm font-medium">Email address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-brand"
                  />
                </div>

                {/* Password */}
                <div className="mt-5 space-y-2">
                  <label className="text-sm font-medium">Password</label>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 outline-none focus:border-brand"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="mt-5 space-y-2">
                  <label className="text-sm font-medium">
                    Confirm password
                  </label>

                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-11 outline-none focus:border-brand"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirm ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                    {error}
                  </div>
                )}

                {/* Sign Up */}
                <button
                  disabled={loading}
                  onClick={handleSignUp}
                  className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111111] py-3.5 font-semibold text-white transition hover:bg-black disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create Account"}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>

              {/* Footer */}
              <div className="border-t border-border bg-muted/30 px-8 py-6">
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/sign-in"
                    className="font-semibold text-[#1589e1] cursor-pointer"
                  >
                    Sign in
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