"use client";

import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/* -------------------------------------------------------------------------- */
/*                                   Profile                                  */
/* -------------------------------------------------------------------------- */

export interface Profile {
  id: string;
  user_id: string;

  first_name: string | null;
  last_name: string | null;
  display_name: string | null;

  avatar_url: string | null;

  role: "user" | "admin";

  created_at: string | null;
  updated_at: string | null;
}

/* -------------------------------------------------------------------------- */
/*                                Auth State                                  */
/* -------------------------------------------------------------------------- */

interface AuthState {
  // Supabase authenticated user
  user: User | null;

  // Application profile from public.profiles
  profile: Profile | null;

  // Loading state
  loading: boolean;

  // Prevent multiple initialization calls
  initialized: boolean;

  // Initialize authentication
  initialize: () => Promise<void>;

  // Fetch profile using auth user ID
  fetchProfile: (userId: string) => Promise<void>;

  // Logout
  signOut: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*                                Auth Store                                  */
/* -------------------------------------------------------------------------- */

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,

  profile: null,

  loading: true,

  initialized: false,

  /* ---------------------------------------------------------------------- */
  /*                              Initialize                                */
  /* ---------------------------------------------------------------------- */

initialize: async () => {
  if (get().initialized) {
    return;
  }

  try {
    set({
      loading: true,
    });

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error);

      set({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
      });

      return;
    }

    const user = session?.user ?? null;

    if (user) {
      set({
        user,
      });

      await get().fetchProfile(user.id);
    } else {
      set({
        user: null,
        profile: null,
      });
    }

    set({
      loading: false,
      initialized: true,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;

      set({
        user,
      });

      if (user) {
        // Supabase warns against awaiting other Supabase calls inside this
        // callback (it can deadlock), so fetch the profile after it returns.
        setTimeout(() => {
          get().fetchProfile(user.id);
        }, 0);
      } else {
        set({
          profile: null,
        });
      }
    });
  } catch (error) {
    console.error("Auth initialization error:", error);

    set({
      user: null,
      profile: null,
      loading: false,
      initialized: true,
    });
  }
},

  /* ---------------------------------------------------------------------- */
  /*                             Fetch Profile                              */
  /* ---------------------------------------------------------------------- */

  fetchProfile: async (userId: string) => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.log("Profile fetch error:", error);

        set({
          profile: null,
        });

        return;
      }

      set({
        profile: data as Profile,
      });
    } catch (error) {
      console.error("Profile fetch exception:", error);

      set({
        profile: null,
      });
    }
  },

  /* ---------------------------------------------------------------------- */
  /*                                Sign Out                                */
  /* ---------------------------------------------------------------------- */

  signOut: async () => {
    try {
      set({
        loading: true,
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);

        set({
          loading: false,
        });

        return;
      }

      set({
        user: null,
        profile: null,
        loading: false,
      });
    } catch (error) {
      console.error("Sign out exception:", error);

      set({
        loading: false,
      });
    }
  },
}));