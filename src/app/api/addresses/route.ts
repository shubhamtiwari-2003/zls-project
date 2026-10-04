import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAddresses } from "@/lib/addresses.server";
import { normalizeAddress, validateAddress } from "@/lib/checkout-validation";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Add or edit an address in the user's address book.
 *
 * Body: { address, replacesAddressId? }
 *
 * Address rows are never changed in place: an identical address is reused,
 * anything else is saved as a new row. When editing, the old row is
 * archived (hidden) — past orders keep pointing at it.
 *
 * Returns the updated address book.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const address = normalizeAddress(body?.address);
    const fieldErrors = validateAddress(address);

    if (Object.keys(fieldErrors).length) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields.", fieldErrors },
        { status: 400 }
      );
    }

    const replacesAddressId =
      typeof body?.replacesAddressId === "string" && UUID_RE.test(body.replacesAddressId)
        ? body.replacesAddressId
        : null;

    // Users can't write addresses directly; the server does it.
    const admin = createAdminClient();

    const { data: addressId, error: resolveError } = await admin.rpc("resolve_address", {
      p_user_id: user.id,
      p_address: address,
    });

    if (resolveError) throw new Error(resolveError.message);

    if (replacesAddressId && replacesAddressId !== addressId) {
      const { error: archiveError } = await admin
        .from("addresses")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", replacesAddressId)
        .eq("user_id", user.id);

      if (archiveError) throw new Error(archiveError.message);
    }

    return NextResponse.json({ addresses: await listAddresses(supabase, user.id) });
  } catch (error) {
    console.error("Save address error:", error);

    return NextResponse.json({ error: "Could not save the address." }, { status: 500 });
  }
}
