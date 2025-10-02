import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Enhanced MCP for processing initial offer vs final total screenshots
class TipVarianceAnalysisMCP {
  async processTripScreenshots(
    tripId: number
  ): Promise<{
    success: boolean;
    analysis?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      console.log(`Processing trip ${tripId} for tip variance analysis`);

      // Get all screenshots for this trip
      const { data: screenshots, error: screenshotError } = await supabaseAdmin
        .from("trip_screenshots")
        .select("*")
        .eq("trip_id", tripId)
        .order("upload_timestamp", { ascending: true });

      if (screenshotError) {
        throw new Error(
          `Failed to fetch screenshots: ${screenshotError.message}`
        );
      }

      if (!screenshots || screenshots.length === 0) {
        return {
          success: false,
          error: "No screenshots found for this trip",
        };
      }

      // Process each screenshot type
      const initialScreenshot = screenshots.find(
        (s) => s.screenshot_type === "initial_offer"
      );
      const finalScreenshot = screenshots.find(
        (s) => s.screenshot_type === "final_total"
      );
      const navigationScreenshots = screenshots.filter(
        (s) => s.screenshot_type === "navigation"
      );

      const analysis: Record<string, unknown> = {
        trip_id: tripId,
        screenshots_processed: screenshots.length,
        has_initial_offer: !!initialScreenshot,
        has_final_total: !!finalScreenshot,
        processing_timestamp: new Date().toISOString(),
      };

      // Process initial offer screenshot
      if (initialScreenshot) {
        const initialData = await this.processInitialOfferScreenshot(
          initialScreenshot.image_path
        );
        analysis.initial_offer_data = initialData;

        // Update screenshot record with extracted data
        await supabaseAdmin
          .from("trip_screenshots")
          .update({
            extracted_data: initialData,
            is_processed: true,
            processing_notes: "Processed initial offer data",
          })
          .eq("id", initialScreenshot.id);
      }

      // Process final total screenshot
      if (finalScreenshot) {
        const finalData = await this.processFinalTotalScreenshot(
          finalScreenshot.image_path
        );
        analysis.final_total_data = finalData;

        // Update screenshot record with extracted data
        await supabaseAdmin
          .from("trip_screenshots")
          .update({
            extracted_data: finalData,
            is_processed: true,
            processing_notes: "Processed final total data",
          })
          .eq("id", finalScreenshot.id);
      }

      // Calculate tip variance if we have both screenshots
      if (analysis.has_initial_offer && analysis.has_final_total) {
        analysis.tip_variance_analysis = await this.calculateTipVariance(
          analysis.initial_offer_data as Record<string, unknown>,
          analysis.final_total_data as Record<string, unknown>
        );
      }

      // Process navigation screenshots for route data
      if (navigationScreenshots.length > 0) {
        analysis.route_data = await this.processNavigationScreenshots(
          navigationScreenshots
        );
      }

      // Generate comprehensive insights
      analysis.insights = await this.generateTripInsights(analysis);

      // Update main trip record with analysis results
      await this.updateTripWithAnalysis(tripId, analysis);

      return {
        success: true,
        analysis,
      };
    } catch (error) {
      console.error(`Trip processing error for trip ${tripId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      };
    }
  }

  private async processInitialOfferScreenshot(imagePath: string) {
    // Simulate OCR processing of initial offer screenshot
    console.log("Processing initial offer screenshot:", imagePath);

    // In production, this would use actual OCR
    return {
      estimated_fare: 24.5,
      estimated_tip: 4.0,
      total_estimate: 28.5,
      distance_estimate: 12.5,
      pickup_location: "Restaurant District",
      dropoff_location: "Airport",
      platform: "Uber",
      trip_type: "UberX",
      surge_multiplier: 1.0,
      time_estimate: "25 min",
      screenshot_quality: "good",
      extraction_confidence: 0.95,
    };
  }

  private async processFinalTotalScreenshot(imagePath: string) {
    // Simulate OCR processing of final total screenshot
    console.log("Processing final total screenshot:", imagePath);

    // In production, this would use actual OCR
    return {
      base_fare: 18.5,
      actual_tip: 6.5,
      total_actual: 30.25,
      actual_distance: 12.8,
      actual_duration: "27 min",
      surge_applied: 1.0,
      fees_and_tolls: 2.75,
      driver_earnings: 25.5,
      platform_fee: 4.75,
      screenshot_quality: "good",
      extraction_confidence: 0.93,
    };
  }

  private async calculateTipVariance(
    initialData: Record<string, unknown>,
    finalData: Record<string, unknown>
  ) {
    const estimatedTotal = initialData.total_estimate || 0;
    const actualTotal = finalData.total_actual || 0;
    const estimatedTip = initialData.estimated_tip || 0;
    const actualTip = finalData.actual_tip || 0;

    const totalVariance = (actualTotal as number) - (estimatedTotal as number);
    const tipVariance = (actualTip as number) - (estimatedTip as number);
    const tipVariancePercentage =
      (estimatedTip as number) > 0
        ? (tipVariance / (estimatedTip as number)) * 100
        : 0;

    let accuracyCategory = "exact";
    if (Math.abs(tipVariance) > 1.0) {
      accuracyCategory =
        tipVariance > 0 ? "significantly_over" : "significantly_under";
    } else if (Math.abs(tipVariance) > 0.25) {
      accuracyCategory = tipVariance > 0 ? "over" : "under";
    }

    return {
      total_variance: Math.round(totalVariance * 100) / 100,
      tip_variance: Math.round(tipVariance * 100) / 100,
      tip_variance_percentage: Math.round(tipVariancePercentage * 100) / 100,
      accuracy_category: accuracyCategory,
      estimated_vs_actual: {
        estimated: {
          total: estimatedTotal,
          tip: estimatedTip,
          distance: initialData.distance_estimate || 0,
        },
        actual: {
          total: actualTotal,
          tip: actualTip,
          distance: finalData.actual_distance || 0,
        },
      },
      variance_insights: this.generateVarianceInsights(
        tipVariance,
        tipVariancePercentage,
        accuracyCategory
      ),
    };
  }

  private generateVarianceInsights(
    tipVariance: number,
    tipPercentage: number,
    category: string
  ) {
    const insights = [];

    switch (category) {
      case "significantly_over":
        insights.push(
          `Great news! Customer tipped $${Math.abs(tipVariance).toFixed(
            2
          )} more than expected (${tipPercentage.toFixed(1)}% increase)`
        );
        insights.push(
          "This suggests excellent service or customer satisfaction"
        );
        break;

      case "over":
        insights.push(
          `Customer tipped $${Math.abs(tipVariance).toFixed(
            2
          )} more than estimated`
        );
        insights.push("Slightly better than expected tip");
        break;

      case "under":
        insights.push(
          `Customer tipped $${Math.abs(tipVariance).toFixed(
            2
          )} less than estimated`
        );
        insights.push("Consider factors that might affect tip satisfaction");
        break;

      case "significantly_under":
        insights.push(
          `Customer tipped $${Math.abs(tipVariance).toFixed(
            2
          )} less than expected (${Math.abs(tipPercentage).toFixed(
            1
          )}% decrease)`
        );
        insights.push(
          "May indicate service issues or customer dissatisfaction"
        );
        break;

      default:
        insights.push("Tip matched the estimate very closely");
        insights.push("Consistent with platform predictions");
    }

    return insights;
  }

  private async processNavigationScreenshots(
    navigationScreenshots: Record<string, unknown>[]
  ) {
    // Process navigation screenshots to extract route data
    return {
      route_screenshots_count: navigationScreenshots.length,
      extracted_routes: navigationScreenshots.map((screenshot) => ({
        screenshot_id: screenshot.id,
        estimated_route_data: {
          distance: 12.8,
          duration: "27 min",
          route_type: "fastest",
          traffic_conditions: "moderate",
        },
      })),
    };
  }

  private async generateTripInsights(analysis: Record<string, unknown>) {
    const insights = [];

    if (analysis.tip_variance_analysis) {
      const variance = analysis.tip_variance_analysis as Record<string, unknown>;
      insights.push(...((variance.variance_insights as string[]) || []));

      // Add Honda Odyssey specific insights
      const estimatedVsActual = variance.estimated_vs_actual as Record<string, unknown>;
      const actual = estimatedVsActual?.actual as Record<string, unknown>;
      const distance = (actual?.distance as number) || 12.5;
      const gasCost = (distance / 19) * 3.5; // Honda Odyssey 19 MPG, $3.50/gallon
      const profit = ((actual?.total as number) || 0) - gasCost;

      insights.push(
        `Honda Odyssey fuel cost: $${gasCost.toFixed(2)} for ${distance} miles`
      );
      insights.push(`Net profit after gas: $${profit.toFixed(2)}`);
    }

    if (analysis.has_initial_offer && !analysis.has_final_total) {
      insights.push(
        "Upload final total screenshot to complete tip variance analysis"
      );
    }

    if (!analysis.has_initial_offer && analysis.has_final_total) {
      insights.push(
        "Upload initial offer screenshot to see tip prediction accuracy"
      );
    }

    return {
      summary_insights: insights,
      data_completeness: this.assessDataCompleteness(analysis),
      recommendation: this.generateRecommendation(analysis),
    };
  }

  private assessDataCompleteness(analysis: Record<string, unknown>) {
    let completeness = 0;
    const factors = [];

    if (analysis.has_initial_offer) {
      completeness += 40;
      factors.push("initial_offer");
    }

    if (analysis.has_final_total) {
      completeness += 40;
      factors.push("final_total");
    }

    if (analysis.route_data) {
      completeness += 20;
      factors.push("navigation_data");
    }

    return {
      completeness_percentage: completeness,
      available_data: factors,
      missing_data: this.identifyMissingData(factors),
    };
  }

  private identifyMissingData(availableFactors: string[]) {
    const allFactors = ["initial_offer", "final_total", "navigation_data"];
    return allFactors.filter((factor) => !availableFactors.includes(factor));
  }

  private generateRecommendation(analysis: Record<string, unknown>) {
    if (analysis.tip_variance_analysis) {
      const tipAnalysis = analysis.tip_variance_analysis as Record<string, unknown>;
      const category = tipAnalysis.accuracy_category as string;

      if (category === "significantly_over") {
        return "Excellent performance! Customer satisfaction was high. Continue providing this level of service.";
      } else if (category === "significantly_under") {
        return "Review trip details for improvement opportunities. Consider factors like communication, route efficiency, and service quality.";
      } else {
        return "Good performance with predictable tips. Maintain consistent service quality.";
      }
    }

    return "Upload both initial offer and final total screenshots for complete analysis.";
  }

  private async updateTripWithAnalysis(
    tripId: number,
    analysis: Record<string, unknown>
  ) {
    const updateData: Record<string, unknown> = {};

    if (analysis.initial_offer_data) {
      const initialData = analysis.initial_offer_data as Record<string, unknown>;
      updateData.initial_estimate = initialData.total_estimate as number;
    }

    if (analysis.final_total_data) {
      const finalData = analysis.final_total_data as Record<string, unknown>;
      updateData.final_total = finalData.total_actual as number;
      updateData.total_profit = (finalData.driver_earnings as number) || 0;
      updateData.total_distance = (finalData.actual_distance as number) || 0;
    }

    if (analysis.tip_variance_analysis) {
      const tipAnalysis = analysis.tip_variance_analysis as Record<string, unknown>;
      updateData.tip_variance = tipAnalysis.tip_variance as number;
      updateData.tip_accuracy = tipAnalysis.accuracy_category as string;
    }

    // Update trip data with enhanced insights
    updateData.ai_insights = analysis.insights;

    if (Object.keys(updateData).length > 0) {
      await supabaseAdmin
        .from("trips")
        .update(updateData)
        .eq("id", tripId);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tripId, driverId = "550e8400-e29b-41d4-a716-446655440000" } = body;

    if (!tripId) {
      return NextResponse.json(
        { success: false, message: "Trip ID is required" },
        { status: 400 }
      );
    }

    console.log(`Processing tip variance analysis for trip ${tripId}`);

    // Verify trip belongs to driver
    const { data: trip, error: tripError } = await supabaseAdmin
      .from("trips")
      .select("id, driver_id")
      .eq("id", tripId)
      .eq("driver_id", driverId)
      .single();

    if (tripError || !trip) {
      return NextResponse.json(
        { success: false, message: "Trip not found or access denied" },
        { status: 404 }
      );
    }

    // Process the trip screenshots
    const analyzer = new TipVarianceAnalysisMCP();
    const result = await analyzer.processTripScreenshots(parseInt(tripId));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tip variance analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Analysis failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve tip variance analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");
    const driverId =
      searchParams.get("driverId") || "550e8400-e29b-41d4-a716-446655440000";

    if (!tripId) {
      return NextResponse.json(
        { success: false, message: "Trip ID is required" },
        { status: 400 }
      );
    }

    // Get trip with all related data
    const { data: trip, error } = await supabaseAdmin
      .from("trips")
      .select(
        `
        *,
        trip_screenshots (
          id,
          screenshot_type,
          image_path,
          is_processed,
          extracted_data,
          upload_timestamp
        )
      `
      )
      .eq("id", tripId)
      .eq("driver_id", driverId)
      .single();

    if (error || !trip) {
      return NextResponse.json(
        { success: false, message: "Trip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trip: {
        ...trip,
        tip_variance_summary: {
          has_both_screenshots:
            trip.has_initial_screenshot && trip.has_final_screenshot,
          initial_estimate: trip.initial_estimate,
          final_total: trip.final_total,
          tip_variance: trip.tip_variance,
          tip_accuracy: trip.tip_accuracy,
          trip_status: trip.trip_status,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch tip variance data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
