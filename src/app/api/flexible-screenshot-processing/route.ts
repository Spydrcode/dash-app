// Enhanced Trip Processing with Flexible Screenshot Analysis
// Each screenshot contributes specific data points to build complete trip picture

import {
  FlexibleScreenshotProcessor,
  ScreenshotDataStructure,
} from "@/lib/flexible-screenshot-processor";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { imagePath, screenshotType, tripId } = await request.json();

    if (!imagePath) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing imagePath parameter",
        },
        { status: 400 }
      );
    }

    console.log(
      `🔄 Processing ${screenshotType ||
        "unknown"} screenshot with flexible detection...`
    );

    // Initialize flexible processor
    const processor = new FlexibleScreenshotProcessor();

    // Convert image to base64 for processing
    const imageBase64 = await convertImageToBase64(imagePath);

    // Process screenshot with flexible data detection
    const screenshotData = await processor.processScreenshot(
      imageBase64,
      screenshotType
    );

    console.log(`📊 Screenshot analysis complete:`, {
      type: screenshotData.screenshot_type,
      confidence: (screenshotData.data_confidence * 100).toFixed(1) + "%",
      elements_found: screenshotData.detected_elements.length,
      elements_missing: screenshotData.missing_elements.length,
    });

    // Store screenshot data in database
    const {
      data: savedScreenshot,
      error: screenshotError,
    } = await supabaseAdmin
      .from("trip_screenshots")
      .insert({
        trip_id: tripId || null,
        screenshot_type: screenshotData.screenshot_type,
        image_path: imagePath,
        is_processed: true,
        extracted_data: screenshotData.extracted_data,
        processing_notes: `Flexible OCR: ${screenshotData.detected_elements.join(
          ", "
        )}`,
        data_confidence: screenshotData.data_confidence,
        ocr_raw_data: screenshotData.ocr_raw,
      })
      .select()
      .single();

    if (screenshotError) {
      console.error("❌ Database error:", screenshotError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save screenshot data",
        },
        { status: 500 }
      );
    }

    // If we have a specific trip ID, try to combine with other screenshots
    let combinedTripData = null;
    if (tripId) {
      combinedTripData = await combineScreenshotsForTrip(tripId);
    }

    // Generate insights based on screenshot type
    const insights = generateScreenshotInsights(screenshotData);

    return NextResponse.json({
      success: true,
      screenshot_analysis: {
        id: savedScreenshot.id,
        type: screenshotData.screenshot_type,
        confidence: screenshotData.data_confidence,
        detected_elements: screenshotData.detected_elements,
        missing_elements: screenshotData.missing_elements,
        extracted_data: screenshotData.extracted_data,
      },
      combined_trip_data: combinedTripData,
      insights: insights,
      recommendations: generateRecommendations(
        screenshotData,
        combinedTripData
      ),
    });
  } catch (error) {
    console.error("❌ Flexible screenshot processing failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Screenshot processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to convert image path to base64
async function convertImageToBase64(imagePath: string): Promise<string> {
  try {
    // If it's a URL, fetch the image
    if (imagePath.startsWith("http")) {
      const response = await fetch(imagePath);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    }

    // If it's a local path, read the file (for testing)
    // In production, you'd handle Supabase storage URLs differently
    throw new Error("Local file reading not implemented for security");
  } catch (error) {
    console.error("⚠️ Image conversion failed:", error);
    // Return empty base64 for fallback
    return "";
  }
}

// Combine all screenshots for a trip to build complete picture
async function combineScreenshotsForTrip(tripId: string): Promise<any> {
  try {
    const { data: screenshots, error } = await supabaseAdmin
      .from("trip_screenshots")
      .select("*")
      .eq("trip_id", tripId)
      .eq("is_processed", true);

    if (error || !screenshots || screenshots.length === 0) {
      return null;
    }

    console.log(
      `🔄 Combining ${screenshots.length} screenshots for trip ${tripId}`
    );

    // Convert to ScreenshotDataStructure format
    const screenshotStructures: ScreenshotDataStructure[] = screenshots.map(
      (s) => ({
        screenshot_type: s.screenshot_type as any,
        data_confidence: s.data_confidence || 0.5,
        detected_elements: Object.keys(s.extracted_data || {}),
        extracted_data: s.extracted_data || {},
        missing_elements: [],
        ocr_raw: s.ocr_raw_data || { text: "", numbers: [], confidence: 0 },
      })
    );

    // Use the static combiner method
    const combinedData = FlexibleScreenshotProcessor.combineScreenshotData(
      screenshotStructures
    );

    // Update trip record with combined data
    const { error: updateError } = await supabaseAdmin
      .from("trips")
      .update({
        trip_data: combinedData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    if (updateError) {
      console.error(
        "⚠️ Failed to update trip with combined data:",
        updateError
      );
    }

    return combinedData;
  } catch (error) {
    console.error("❌ Failed to combine screenshots:", error);
    return null;
  }
}

// Generate insights based on screenshot type and data
function generateScreenshotInsights(
  screenshotData: ScreenshotDataStructure
): string[] {
  const insights: string[] = [];

  switch (screenshotData.screenshot_type) {
    case "initial_offer":
      const estimatedFare = screenshotData.extracted_data.estimated_fare;
      const distance = screenshotData.extracted_data.distance;

      if (estimatedFare && distance) {
        const farePerMile = estimatedFare / distance;
        insights.push(
          `Initial offer: $${estimatedFare} for ${distance} miles ($${farePerMile.toFixed(
            2
          )}/mile)`
        );

        if (farePerMile > 2.0) {
          insights.push("🟢 Excellent rate - above $2/mile");
        } else if (farePerMile > 1.5) {
          insights.push("🟡 Good rate - above $1.50/mile");
        } else {
          insights.push("🔴 Low rate - consider declining");
        }
      }
      break;

    case "final_total":
      const totalEarnings = screenshotData.extracted_data.total_earnings;
      const actualTip = screenshotData.extracted_data.actual_tip;

      if (totalEarnings) {
        insights.push(`Final earnings: $${totalEarnings}`);

        if (actualTip) {
          insights.push(
            `Tip received: $${actualTip} (${(
              (actualTip / totalEarnings) *
              100
            ).toFixed(1)}% of total)`
          );
        }
      }
      break;

    case "dashboard_odometer":
      const odometer = screenshotData.extracted_data.odometer_reading;

      if (odometer) {
        insights.push(
          `Odometer reading: ${odometer} miles - logged for tax records`
        );
        insights.push("Perfect for business mileage tracking");
      }
      break;

    case "trip_summary":
      const totalTrips = screenshotData.extracted_data.total_trips;
      const summaryEarnings = screenshotData.extracted_data.total_earnings;

      if (totalTrips && summaryEarnings) {
        const avgPerTrip = summaryEarnings / totalTrips;
        insights.push(
          `Summary: ${totalTrips} trips, $${summaryEarnings} total ($${avgPerTrip.toFixed(
            2
          )}/trip average)`
        );
      }
      break;
  }

  // Add confidence note
  const confidencePercent = (screenshotData.data_confidence * 100).toFixed(0);
  insights.push(
    `Data confidence: ${confidencePercent}% (${
      screenshotData.detected_elements.length
    } elements detected)`
  );

  return insights;
}

// Generate recommendations based on screenshot data
function generateRecommendations(
  screenshotData: ScreenshotDataStructure,
  combinedData?: any
): string[] {
  const recommendations: string[] = [];

  // Data quality recommendations
  if (screenshotData.data_confidence < 0.7) {
    recommendations.push(
      "📸 Consider retaking screenshot with better lighting/clarity for higher accuracy"
    );
  }

  if (screenshotData.missing_elements.length > 0) {
    recommendations.push(
      `📝 Missing data elements: ${screenshotData.missing_elements.join(
        ", "
      )} - upload additional screenshots if available`
    );
  }

  // Screenshot type specific recommendations
  switch (screenshotData.screenshot_type) {
    case "initial_offer":
      recommendations.push(
        "📱 Upload the final completion screenshot to track tip variance"
      );
      break;

    case "final_total":
      recommendations.push(
        "📊 Upload weekly summary screenshots for validation"
      );
      break;

    case "dashboard_odometer":
      recommendations.push(
        "🚗 Regular odometer readings help optimize Honda Odyssey maintenance scheduling"
      );
      break;

    case "unknown":
      recommendations.push(
        "❓ Screenshot type unclear - try uploading a clearer image or specify the type"
      );
      break;
  }

  // Combined data recommendations
  if (combinedData) {
    if (combinedData.estimated_profit) {
      const profitPerMile =
        combinedData.estimated_profit / (combinedData.distance || 1);
      if (profitPerMile < 1.0) {
        recommendations.push(
          "💰 Low profit margin detected - consider route optimization"
        );
      }
    }

    if (combinedData.combined_confidence < 0.8) {
      recommendations.push(
        "🔍 Upload additional screenshots to improve trip data completeness"
      );
    }
  }

  return recommendations;
}
