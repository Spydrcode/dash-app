import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Enhanced upload handler for multiple screenshot types
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const screenshotType =
      (formData.get("screenshotType") as string) || "other";
    const tripId = (formData.get("tripId") as string) || "anonymous";
    const driverId =
      (formData.get("driverId") as string) ||
      "550e8400-e29b-41d4-a716-446655440000";

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files provided" },
        { status: 400 }
      );
    }

    console.log(`Processing ${files.length} ${screenshotType} screenshots`, {
      tripId,
      driverId,
    });

    const uploadResults = [];
    let currentTripId = tripId;

    // If no tripId provided, create a new trip
    if (!currentTripId) {
      const { data: newTrip, error: tripError } = await supabaseAdmin
        .from("trips")
        .insert({
          driver_id: driverId,
          trip_data: {
            upload_type: screenshotType,
            uploaded_at: new Date().toISOString(),
            status: "processing",
          },
          vehicle_model: "2003 Honda Odyssey",
          trip_status: "incomplete",
        })
        .select()
        .single();

      if (tripError) {
        throw new Error(`Failed to create trip: ${tripError.message}`);
      }

      currentTripId = newTrip.id.toString();
      console.log(`Created new trip with ID: ${currentTripId}`);
    }

    for (const file of files) {
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${screenshotType}_${currentTripId}_${Date.now()}.${fileExt}`;
        const filePath = `trip-uploads/${fileName}`;

        // Convert File to ArrayBuffer for Supabase
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
          .from("trip-uploads")
          .upload(filePath, uint8Array, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("trip-uploads").getPublicUrl(filePath);

        // Save screenshot record to database
        const { data: screenshot, error: dbError } = await supabaseAdmin
          .from("trip_screenshots")
          .insert({
            trip_id: parseInt(currentTripId),
            screenshot_type: screenshotType,
            image_path: publicUrl,
            is_processed: false,
          })
          .select()
          .single();

        if (dbError) {
          console.error("Database save error:", dbError);
          throw new Error(
            `Failed to save screenshot record: ${dbError.message}`
          );
        }

        uploadResults.push({
          success: true,
          filename: file.name,
          path: publicUrl,
          screenshotType,
          tripId: currentTripId,
          screenshotId: screenshot.id,
        });

        console.log(
          `Successfully uploaded ${screenshotType} screenshot:`,
          publicUrl
        );
      } catch (fileError) {
        console.error(`Failed to process file ${file.name}:`, fileError);
        uploadResults.push({
          success: false,
          filename: file.name,
          error:
            fileError instanceof Error ? fileError.message : "Upload failed",
        });
      }
    }

    // Update trip status based on screenshot types
    await updateTripStatus(parseInt(currentTripId));

    const successCount = uploadResults.filter((r) => r.success).length;
    const failCount = uploadResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      tripId: currentTripId,
      screenshotType,
      results: uploadResults,
      summary: {
        total: files.length,
        successful: successCount,
        failed: failCount,
        message: `Uploaded ${successCount} ${screenshotType} screenshots${
          failCount > 0 ? `, ${failCount} failed` : ""
        }`,
      },
      nextSteps: getNextStepRecommendations(screenshotType),
    });
  } catch (error) {
    console.error("Enhanced upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Upload failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function updateTripStatus(tripId: number) {
  try {
    // Get screenshot counts for this trip
    const { data: screenshots, error } = await supabaseAdmin
      .from("trip_screenshots")
      .select("screenshot_type")
      .eq("trip_id", tripId);

    if (error) {
      console.error("Failed to get screenshots:", error);
      return;
    }

    const screenshotTypes = screenshots.map((s) => s.screenshot_type);
    const hasInitial = screenshotTypes.includes("initial_offer");
    const hasFinal = screenshotTypes.includes("final_total");

    let status = "incomplete";
    if (hasInitial && hasFinal) {
      status = "complete";
    } else if (hasInitial || hasFinal) {
      status = "partial";
    }

    // Update trip status
    await supabaseAdmin
      .from("trips")
      .update({
        screenshot_count: screenshots.length,
        has_initial_screenshot: hasInitial,
        has_final_screenshot: hasFinal,
        trip_status: status,
      })
      .eq("id", tripId);

    console.log(`Updated trip ${tripId} status to: ${status}`);
  } catch (error) {
    console.error("Failed to update trip status:", error);
  }
}

function getNextStepRecommendations(screenshotType: string) {
  const recommendations = [];

  switch (screenshotType) {
    case "initial_offer":
      recommendations.push({
        action: "upload_final",
        message:
          "Upload the final trip total screenshot to compare tip accuracy",
        priority: "high",
      });
      recommendations.push({
        action: "process_ai",
        message: "Run AI analysis to extract initial offer data",
        priority: "medium",
      });
      break;

    case "final_total":
      recommendations.push({
        action: "calculate_variance",
        message: "Calculate tip variance between initial offer and final total",
        priority: "high",
      });
      recommendations.push({
        action: "complete_analysis",
        message: "Run complete trip analysis with both screenshots",
        priority: "high",
      });
      break;

    case "navigation":
      recommendations.push({
        action: "extract_route",
        message: "Extract route and mileage data from navigation screenshot",
        priority: "medium",
      });
      break;

    default:
      recommendations.push({
        action: "categorize_screenshot",
        message: "Specify screenshot type for better analysis",
        priority: "low",
      });
  }

  return recommendations;
}

// GET endpoint to retrieve screenshots for a trip
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");
    const screenshotType = searchParams.get("type");
    const driverId =
      searchParams.get("driverId") || "550e8400-e29b-41d4-a716-446655440000";

    let query = supabaseAdmin
      .from("trip_screenshots")
      .select(
        `
        *,
        trips!inner(driver_id, trip_data, vehicle_model)
      `
      )
      .eq("trips.driver_id", driverId);

    if (tripId) {
      query = query.eq("trip_id", parseInt(tripId));
    }

    if (screenshotType) {
      query = query.eq("screenshot_type", screenshotType);
    }

    const { data: screenshots, error } = await query.order("upload_timestamp", {
      ascending: false,
    });

    if (error) {
      throw new Error(`Failed to fetch screenshots: ${error.message}`);
    }

    // Group by trip for better organization
    const groupedScreenshots = screenshots.reduce((groups, screenshot) => {
      const tripId = screenshot.trip_id;
      if (!groups[tripId]) {
        groups[tripId] = {
          trip_id: tripId,
          trip_data: screenshot.trips.trip_data,
          vehicle_model: screenshot.trips.vehicle_model,
          screenshots: [],
        };
      }
      groups[tripId].screenshots.push({
        id: screenshot.id,
        type: screenshot.screenshot_type,
        image_path: screenshot.image_path,
        upload_timestamp: screenshot.upload_timestamp,
        is_processed: screenshot.is_processed,
        ocr_data: screenshot.ocr_data,
        extracted_data: screenshot.extracted_data,
      });
      return groups;
    }, {});

    return NextResponse.json({
      success: true,
      trips: Object.values(groupedScreenshots),
      total_screenshots: screenshots.length,
      filters: { tripId, screenshotType, driverId },
    });
  } catch (error) {
    console.error("Failed to fetch screenshots:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch screenshots",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
