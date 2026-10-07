"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  User,
  UserCircle,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";

export function AccountMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuthStore();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Auth not resolved yet: same placeholder on server and client.
  if (loading) {
    return (
      <span className="flex items-center gap-2 text-foreground opacity-60">
        <User className="h-5 w-5" />
        <span className="hidden sm:inline">Account</span>
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(pathname)}`}
        className="flex items-center gap-2 text-foreground transition hover:text-emerald-700"
      >
        <User className="h-5 w-5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const name =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    "Account";

  // UI only — /admin is protected on the server by requireAdmin().
  const isAdmin = profile?.role === "admin";

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();

    if (!useAuthStore.getState().user) {
      router.push("/");
      router.refresh();
    }
  };

  const itemClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-background";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-2 text-foreground transition hover:text-emerald-700"
      >
        <User className="h-5 w-5" />
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-border bg-surface p-2 shadow-2xl"
        >
          <div className="border-b border-border px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          </div>

          <div className="py-2">
            <Link href="/orders" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <Package size={18} />
              My Orders
            </Link>

            <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <UserCircle size={18} />
              Profile
            </Link>

            {isAdmin && (
              <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <LayoutDashboard size={18} />
                Admin Dashboard
              </Link>
            )}
          </div>

          <div className="border-t border-border pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className={`${itemClass} text-red-600 hover:text-red-600`}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
