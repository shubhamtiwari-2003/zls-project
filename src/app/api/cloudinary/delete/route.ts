import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // -----------------------------------------
    // 1. Create Supabase server client
    // -----------------------------------------

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },

          set(name, value, options) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
              });
            } catch {
              // Ignore cookie errors in server context
            }
          },

          remove(name, options) {
            try {
              cookieStore.set({
                name,
                value: "",
                ...options,
              });
            } catch {
              // Ignore cookie errors in server context
            }
          },
        },
      }
    );

    // -----------------------------------------
    // 2. Check authenticated user
    // -----------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Please sign in.",
        },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // 3. Check admin role
    // -----------------------------------------

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError) {
      console.log("Profile lookup error:", {
        message: profileError.message,
        code: profileError.code,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify user permissions.",
        },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Admin access required.",
        },
        { status: 403 }
      );
    }

    // -----------------------------------------
    // 4. Read public_id
    // -----------------------------------------

    const body = await request.json();

    const publicId = body?.public_id;

    if (
      !publicId ||
      typeof publicId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cloudinary public_id is required.",
        },
        { status: 400 }
      );
    }

    // -----------------------------------------
    // 5. Delete image from Cloudinary
    // -----------------------------------------

    const result =
      await cloudinary.uploader.destroy(
        publicId,
        {
          resource_type: "image",
          invalidate: true,
        }
      );

    return NextResponse.json({
      success:
        result.result === "ok" ||
        result.result === "not found",

      result: result.result,
    });
  } catch (error) {
    console.log("Cloudinary delete error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Cloudinary deletion failed.",
      },
      { status: 500 }
    );
  }
}