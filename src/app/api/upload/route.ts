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

    // Process each uploaded file through the trip processing pipeline
    const processedResults = [];
    for (const uploadedFile of uploadedFiles) {
      try {
        console.log(`Processing uploaded file: ${uploadedFile.filename}`);

        // Call the process-trip API to extract trip data
        const processResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000"}/api/process-trip`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imagePath: uploadedFile.path,
              screenshotType: "single_trip",
            }),
          }
        );

        if (processResponse.ok) {
          const processResult = await processResponse.json();
          console.log(
            `Successfully processed ${uploadedFile.filename}:`,
            processResult
          );
          processedResults.push({
            file: uploadedFile.filename,
            success: true,
            tripId: processResult.tripId,
          });
        } else {
          console.error(
            `Failed to process ${uploadedFile.filename}:`,
            processResponse.statusText
          );
          processedResults.push({
            file: uploadedFile.filename,
            success: false,
            error: `Processing failed: ${processResponse.statusText}`,
          });
        }
      } catch (error) {
        console.error(`Error processing ${uploadedFile.filename}:`, error);
        processedResults.push({
          file: uploadedFile.filename,
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown processing error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${
        uploadedFiles.length
      } file(s) to cloud storage and processed ${
        processedResults.filter((r) => r.success).length
      } trips`,
      files: uploadedFiles,
      processedTrips: processedResults,
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
