"use client";

import { Bell, Menu, Search, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/store/authStore";


interface TopbarProps {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
}

export function Topbar({
  collapsed,
  setCollapsed,
  setMobileOpen,
}: TopbarProps) {
  const router = useRouter();
  const { profile, signOut, loading } = useAuthStore();

  const handleLogout = async () => {
    await signOut();

    // signOut() swallows errors, so only leave if the session is really gone.
    if (!useAuthStore.getState().user) {
      router.replace("/sign-in");
      // Drop the cached /admin render so Back can't show it again.
      router.refresh();
    }
  };


  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-18 items-center justify-between px-4 md:px-6">

        {/* Left Section */}
        <div className="flex items-center gap-3">

          {/* Mobile Menu */}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-secondary transition"
          >
            <Menu size={20} />
          </button>

          {/* Desktop Collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-secondary transition"
          >
            <Menu size={20} />
          </button>

          <div>
            <h1 className="text-lg md:text-xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="hidden sm:block text-sm text-muted">
              Welcome back, {profile?.display_name}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 w-72">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search products, orders..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>

          {/* Notifications */}
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-secondary transition">
            <Bell size={18} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Admin Profile */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border cursor-pointer px-4 py-2"
          >
            <LogOut className="h-4 w-4" />

            {loading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}