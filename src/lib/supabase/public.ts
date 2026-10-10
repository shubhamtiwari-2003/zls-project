import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Anonymous client without cookies, for public data (catalog, settings,
 * promotions). It reads exactly what a logged-out visitor can see, so its
 * results can be cached and shared between all visitors.
 */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
