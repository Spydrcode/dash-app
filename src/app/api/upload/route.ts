import { checkForDuplicate, generateFileHash, generatePerceptualHash } from "@/lib/duplicate-detection";
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
    const blockedDuplicates = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const fileBuffer = Buffer.from(bytes);

      // Check for duplicates BEFORE uploading
      console.log(`Checking for duplicates: ${file.name} (${fileBuffer.length} bytes)`);
      const duplicateCheck = await checkForDuplicate(fileBuffer, file.name, fileBuffer.length);

      if (duplicateCheck.isDuplicate) {
        console.log(`Duplicate detected: ${file.name} - ${duplicateCheck.reason}`);
        
        // Log the blocked duplicate
        try {
          const fileHash = generateFileHash(fileBuffer);
          const perceptualHash = generatePerceptualHash(fileBuffer);
          
          await supabaseAdmin.from('duplicate_blocks').insert({
            file_hash: fileHash,
            perceptual_hash: perceptualHash,
            original_filename: file.name,
            file_size: fileBuffer.length,
            existing_screenshot_id: duplicateCheck.existingScreenshot?.id,
            block_reason: duplicateCheck.reason
          });
        } catch (logError) {
          console.error('Failed to log duplicate block:', logError);
        }

        blockedDuplicates.push({
          originalName: file.name,
          reason: duplicateCheck.reason,
          existingUpload: duplicateCheck.existingScreenshot?.upload_timestamp
        });
        continue; // Skip this file
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;

      console.log(`Uploading new file: ${file.name} -> ${filename}`);

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

      // Store file metadata for future duplicate detection
      const fileHash = generateFileHash(fileBuffer);
      const perceptualHash = generatePerceptualHash(fileBuffer);

      uploadedFiles.push({
        originalName: file.name,
        filename: filename,
        size: file.size,
        mimetype: file.type,
        path: publicUrl,
        supabasePath: uploadData.path,
        fileHash,
        perceptualHash,
        fileSize: fileBuffer.length
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
              fileMetadata: {
                originalName: uploadedFile.originalName,
                fileHash: uploadedFile.fileHash,
                perceptualHash: uploadedFile.perceptualHash,
                fileSize: uploadedFile.fileSize
              }
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

    // Prepare response with duplicate information
    const responseMessage = [];
    if (uploadedFiles.length > 0) {
      responseMessage.push(`Successfully uploaded ${uploadedFiles.length} new file(s)`);
    }
    if (blockedDuplicates.length > 0) {
      responseMessage.push(`Blocked ${blockedDuplicates.length} duplicate(s)`);
    }
    if (processedResults.filter(r => r.success).length > 0) {
      responseMessage.push(`Processed ${processedResults.filter(r => r.success).length} trip(s)`);
    }

    return NextResponse.json({
      success: true,
      message: responseMessage.join(', '),
      files: uploadedFiles,
      blockedDuplicates,
      processedTrips: processedResults,
      stats: {
        uploaded: uploadedFiles.length,
        duplicatesBlocked: blockedDuplicates.length,
        processed: processedResults.filter(r => r.success).length
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
