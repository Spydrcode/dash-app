import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const files: File[] = (data.getAll("files") as unknown) as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files uploaded" },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;

      // Upload to Supabase Storage
      const {
        data: uploadData,
        error: uploadError,
      } = await supabaseAdmin.storage
        .from("trip-uploads")
        .upload(filename, bytes, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL for the uploaded file
      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("trip-uploads").getPublicUrl(filename);

      uploadedFiles.push({
        originalName: file.name,
        filename: filename,
        size: file.size,
        mimetype: file.type,
        path: publicUrl,
        supabasePath: uploadData.path,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${
        uploadedFiles.length
      } file(s) to cloud storage`,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Cloud upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Cloud upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
