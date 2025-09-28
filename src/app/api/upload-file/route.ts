import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        },
        { status: 400 }
      );
    }

      console.log(`Uploading file: ${file.name} to folder: ${folder} with bucket fallback (buckets created!)`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueFileName = `${timestamp}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExtension}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Upload to Supabase Storage - try multiple bucket names
    let uploadResult;
    let uploadError;
    let successfulBucket = '';
    
    // Try common bucket names - prioritize the ones we know exist
    const bucketNames = ['weekly-summaries', 'trip-screenshots', 'trip-uploads', 'screenshots', 'uploads', 'images'];
    
    for (const bucketName of bucketNames) {
      const result = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });
        
      if (!result.error) {
        uploadResult = result;
        successfulBucket = bucketName;
        console.log(`Successfully uploaded to bucket: ${bucketName}`);
        break;
      } else {
        uploadError = result.error;
        console.log(`Failed to upload to bucket ${bucketName}:`, result.error.message);
        
        // If bucket doesn't exist and this is the first bucket, try to create it
        if (result.error.message.includes('Bucket not found') && bucketName === 'trip-screenshots') {
          console.log('Attempting to create trip-screenshots bucket...');
          
          const createResult = await supabaseAdmin.storage.createBucket('trip-screenshots', {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB
          });
          
          if (!createResult.error) {
            console.log('Successfully created trip-screenshots bucket, retrying upload...');
            
            // Retry upload after creating bucket
            const retryResult = await supabaseAdmin.storage
              .from(bucketName)
              .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
              });
              
            if (!retryResult.error) {
              uploadResult = retryResult;
              successfulBucket = bucketName;
              console.log(`Successfully uploaded to newly created bucket: ${bucketName}`);
              break;
            } else {
              console.log(`Retry upload failed:`, retryResult.error.message);
              uploadError = retryResult.error;
            }
          } else {
            console.log('Failed to create bucket:', createResult.error.message);
          }
        }
      }
    }

    if (!uploadResult || uploadError) {
      console.error("All bucket upload attempts failed. Last error:", uploadError);
      return NextResponse.json(
        {
          success: false,
          error: `Upload failed: No accessible storage bucket found. Last error: ${uploadError?.message}`,
        },
        { status: 500 }
      );
    }

    // Get public URL using the successful bucket
    const { data: urlData } = supabaseAdmin.storage
      .from(successfulBucket)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    console.log("File uploaded successfully:", {
      originalName: file.name,
      storedAs: uniqueFileName,
      publicUrl: publicUrl,
    });

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        originalName: file.name,
        fileName: uniqueFileName,
        filePath: filePath,
        fileSize: file.size,
        contentType: file.type,
      },
      url: publicUrl,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
