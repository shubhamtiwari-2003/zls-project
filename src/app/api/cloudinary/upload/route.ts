import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // --------------------------------
    // 1. Get Supabase server client
    // --------------------------------

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
              // Cookie setting may fail in some server contexts.
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
              // Cookie removal may fail in some server contexts.
            }
          },
        },
      }
    );

    // --------------------------------
    // 2. Check authenticated user
    // --------------------------------

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

    // --------------------------------
    // 3. Check admin role
    // --------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);

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

    // --------------------------------
    // 4. Get uploaded file
    // --------------------------------

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No image file was provided.",
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // 5. Validate file type
    // --------------------------------

    // Photos only: SVG can carry scripts.
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Use a JPG, PNG, WebP, AVIF or GIF image.",
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // 6. Validate file size
    // --------------------------------

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "Image size cannot exceed 10 MB.",
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // 7. Convert File → Buffer
    // --------------------------------

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --------------------------------
    // 8. Upload to Cloudinary
    // --------------------------------

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
      width: number;
      height: number;
      format: string;
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "z-layer-studio/products",
            resource_type: "image",
            // Store at most 2560px on the long side: plenty for zoom, and
            // keeps originals small (phone/camera PNGs can be 7 MB+).
            transformation: [{ width: 2560, height: 2560, crop: "limit" }],
            use_filename: true,
            unique_filename: true,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }

            if (!result) {
              reject(
                new Error("Cloudinary returned no upload result.")
              );
              return;
            }

            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
            });
          }
        )
        .end(buffer);
    });

    // --------------------------------
    // 9. Return Cloudinary data
    // --------------------------------

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Image upload failed.",
      },
      { status: 500 }
    );
  }
}