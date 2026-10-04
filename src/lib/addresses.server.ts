import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAddress, type SavedAddress } from "@/lib/checkout-validation";

/**
 * The user's active address book (public.addresses), most recently used
 * first. Archived (replaced/removed) addresses are excluded.
 */
export async function listAddresses(
  supabase: SupabaseClient,
  userId: string
): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("id, full_name, phone, line1, line2, city, state, postal_code")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({ id: row.id, ...normalizeAddress(row) }));
}
