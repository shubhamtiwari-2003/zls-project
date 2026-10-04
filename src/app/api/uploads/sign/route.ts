import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signCustomerUpload } from "@/lib/customer-uploads.server";

export const runtime = "nodejs";

// Registered uploads per user per hour.
const MAX_UPLOADS_PER_HOUR = 30;

/**
 * Step 1 of a customer photo upload: returns a signature for uploading
 * one file straight to Cloudinary. Signed-in customers only.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to upload a photo." }, { status: 401 });
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("customer_uploads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if (error) {
    console.error("Upload count error:", error);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }

  if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again in a little while." },
      { status: 429 }
    );
  }

  try {
    return NextResponse.json(signCustomerUpload(user.id));
  } catch (signError) {
    console.error("Upload sign error:", signError);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }
}
