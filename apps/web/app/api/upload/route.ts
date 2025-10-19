import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.SUPABASE_BUCKET || "Docs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get the user's session token
    const authHeader = req.headers.get("authorization");
    const access_token = authHeader?.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(access_token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name;
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    // Upload path: per-user folder
    const username = user.user_metadata?.username || user.email; // fallback to email if username not set
    const path = `${username}/${Date.now()}_${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileBytes, {
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Insert metadata
    const { data: insertData, error: insertError } = await supabase
      .from("uploaded_docs")
      .insert([
        {
          user_id: user.id,
          file_name: fileName,
          file_path: path,
          bucket: BUCKET,
          mime_type: file.type,
          size: file.size,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "File uploaded successfully",
      file: {
        id: insertData.id,
        name: fileName,
        url: publicUrl,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
