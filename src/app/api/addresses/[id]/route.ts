import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAddresses } from "@/lib/addresses.server";

/**
 * Remove an address from the address book.
 *
 * The row is archived, not deleted: past orders still reference it.
 * Returns the updated address book.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { data, error } = await createAdminClient()
      .from("addresses")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw new Error(error.message);

    if (!data?.length) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    return NextResponse.json({ addresses: await listAddresses(supabase, user.id) });
  } catch (error) {
    console.error("Remove address error:", error);

    return NextResponse.json({ error: "Could not remove the address." }, { status: 500 });
  }
}
