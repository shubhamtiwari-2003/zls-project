// src/features/auth/components/AuthModal.tsx
"use client";

import { X, Phone, User, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Handle phone OTP verification or auth submission
    console.log({ mode: isSignUp ? "signup" : "login", name, phone });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      {/* Floating Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl z-10 border border-zinc-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl mb-3">
            🛒
          </div>
          <h3 className="text-2xl font-black text-[#003d29] tracking-tight">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {isSignUp
              ? "Enter your details to register with Shopcart"
              : "Access your orders, cart, and recommendations"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex rounded-full bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition ${
              !isSignUp ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition ${
              isSignUp ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Name Field (Always available or conditionally for Sign Up) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#003d29] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003d29]/10"
              />
            </div>
          </div>

          {/* Phone Number Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#003d29] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003d29]/10"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#003d29] py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#002b1d] focus:outline-none focus:ring-2 focus:ring-[#003d29] focus:ring-offset-2"
          >
            <span>{isSignUp ? "Create Account" : "Continue"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-zinc-400">
          By continuing, you agree to Shopcart&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}