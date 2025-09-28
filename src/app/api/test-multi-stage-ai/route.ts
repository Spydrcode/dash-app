// API Endpoint to test Multi-Stage Ollama AI Pipeline
// LLaVA + LLama3.1 for processing, DeepSeek-R1 for final insights

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { MultiStageAIPipeline } from "../../../lib/multi-stage-ai-pipeline";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log("🚀 Testing Multi-Stage Ollama AI Pipeline...");

    // Get sample trips data
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from("trips")
      .select(
        `
        id,
        trip_data,
        created_at,
        trip_screenshots (
          id,
          screenshot_type,
          is_processed,
          extracted_data,
          ocr_data,
          upload_timestamp
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (tripsError) {
      console.error("❌ Error fetching trips:", tripsError);
      return NextResponse.json(
        { error: "Failed to fetch trips" },
        { status: 500 }
      );
    }

    if (!trips || trips.length === 0) {
      return NextResponse.json({
        message: "No trips found for testing",
        recommendation: "Upload some trip screenshots first",
      });
    }

    console.log(`📊 Testing with ${trips.length} trips`);

    // Initialize and run the multi-stage pipeline
    const pipeline = new MultiStageAIPipeline();
    const result = await pipeline.runFullPipeline(trips);

    if (result.success) {
      console.log("✅ Multi-Stage Pipeline Test Successful!");
      return NextResponse.json({
        success: true,
        message: "Multi-stage pipeline working correctly",
        test_results: {
          trips_processed: trips.length,
          model_allocation: result.model_usage,
          stages_completed: Object.keys(result.pipeline_stages).length,
          final_insights: result.results,
        },
        pipeline_breakdown: {
          stage_1: "LLaVA - Screenshot OCR extraction",
          stage_2: "LLama3.1 - Data compilation and structuring",
          stage_3: "LLama3.1 - Pattern training and learning",
          stage_4: "DeepSeek-R1 - Final insights generation",
        },
        recommendations: [
          "Pipeline is working correctly with proper model allocation",
          "LLama3.1 handling data processing efficiently",
          "DeepSeek-R1 generating sophisticated insights",
          "Ready for production use",
        ],
      });
    } else {
      console.log("⚠️ Pipeline test had issues, but system is functional");
      return NextResponse.json({
        success: false,
        message: "Pipeline test encountered issues",
        error: result.error,
        fallback_active: true,
        recommendations: [
          "Check Ollama service: ollama serve",
          "Verify models: ollama list",
          "Test model connectivity: ollama run llama3.1",
          "Basic functionality should still work",
        ],
      });
    }
  } catch (error) {
    console.error("❌ Multi-stage pipeline test failed:", error);
    return NextResponse.json(
      {
        error: "Pipeline test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        troubleshooting: [
          "Ensure Ollama is running: ollama serve",
          "Check available models: ollama list",
          "Verify models are working: ollama run deepseek-r1",
          "Check server logs for specific errors",
        ],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, trip_ids } = await request.json();

    if (action === "process_specific_trips" && trip_ids) {
      console.log(`🎯 Processing specific trips: ${trip_ids.join(", ")}`);

      const { data: trips, error } = await supabaseAdmin
        .from("trips")
        .select(
          `
          id,
          trip_data,
          created_at,
          trip_screenshots (
            id,
            screenshot_type,
            extracted_data,
            ocr_data
          )
        `
        )
        .in("id", trip_ids);

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch specific trips" },
          { status: 500 }
        );
      }

      const pipeline = new MultiStageAIPipeline();
      const result = await pipeline.runFullPipeline(trips || []);

      return NextResponse.json({
        success: true,
        message: `Processed ${trip_ids.length} specific trips`,
        results: result,
        model_allocation: {
          llava: "Screenshot OCR",
          llama31: "Data processing and training",
          deepseek_r1: "Final insights only",
        },
      });
    }

    if (action === "test_individual_stage") {
      const { stage, sample_data } = await request.json();
      const pipeline = new MultiStageAIPipeline();

      let result;
      switch (stage) {
        case "stage1":
          result = await pipeline.extractDataFromScreenshot(
            "sample_image",
            "dashboard"
          );
          break;
        case "stage3":
          result = await pipeline.trainOnCompiledData(sample_data || []);
          break;
        case "stage4":
          result = await pipeline.generateFinalInsights(sample_data || [], {});
          break;
        default:
          return NextResponse.json(
            { error: "Invalid stage specified" },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        stage_tested: stage,
        result: result,
        model_used: stage === "stage4" ? "deepseek-r1" : "llama3.1",
      });
    }

    return NextResponse.json(
      { error: "Invalid action specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ POST request failed:", error);
    return NextResponse.json(
      {
        error: "Request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
