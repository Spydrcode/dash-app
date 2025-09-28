// Multi-Stage Ollama AI Pipeline
// Stage 1-3: LLama3.1 for data processing
// Stage 4: DeepSeek-R1 for final insights

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export class MultiStageAIPipeline {
  private ollamaUrl = "http://localhost:11434";

  // STAGE 1: Screenshot OCR with LLaVA + LLama3.1 for structuring
  async extractDataFromScreenshot(
    imageBase64: string,
    screenshotType: string
  ): Promise<any> {
    try {
      console.log(
        `📸 Stage 1: Extracting data from ${screenshotType} screenshot with LLaVA...`
      );

      // First: LLaVA for OCR
      const ocrResponse = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llava:latest",
          prompt: this.buildOCRPrompt(screenshotType),
          images: [imageBase64],
          stream: false,
          options: { temperature: 0, num_predict: 300 },
        }),
      });

      if (!ocrResponse.ok)
        throw new Error(`LLaVA OCR failed: ${ocrResponse.status}`);
      const ocrResult = await ocrResponse.json();

      // Second: LLama3.1 for structuring the OCR data
      const structureResponse = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.1:latest",
          prompt: this.buildStructurePrompt(ocrResult.response, screenshotType),
          stream: false,
          options: { temperature: 0.1, num_predict: 200 },
        }),
      });

      if (!structureResponse.ok)
        throw new Error(
          `LLama3.1 structuring failed: ${structureResponse.status}`
        );
      const structureResult = await structureResponse.json();

      console.log(
        `✅ Stage 1 Complete: Extracted structured data from ${screenshotType}`
      );
      return this.parseStructuredData(structureResult.response, screenshotType);
    } catch (error) {
      console.error(`❌ Stage 1 failed for ${screenshotType}:`, error);
      return {
        extracted_data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // STAGE 2: Data Compilation with LLama3.1
  async compileScreenshotData(tripId: string): Promise<any> {
    try {
      console.log(
        `📊 Stage 2: Compiling all screenshot data for trip ${tripId} with LLama3.1...`
      );

      // Get all screenshots for this trip
      const { data: screenshots, error } = await supabaseAdmin
        .from("trip_screenshots")
        .select("*")
        .eq("trip_id", tripId);

      if (error)
        throw new Error(`Failed to fetch screenshots: ${error.message}`);
      if (!screenshots || screenshots.length === 0) {
        return { compiled_data: null, message: "No screenshots found" };
      }

      // Use LLama3.1 to compile all screenshot data
      const compilationPrompt = this.buildCompilationPrompt(screenshots);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.1:latest",
          prompt: compilationPrompt,
          stream: false,
          options: { temperature: 0.1, num_predict: 400 },
        }),
      });

      if (!response.ok)
        throw new Error(`LLama3.1 compilation failed: ${response.status}`);
      const result = await response.json();

      const compiledData = this.parseCompiledData(result.response);
      console.log(`✅ Stage 2 Complete: Compiled data for trip ${tripId}`);
      return compiledData;
    } catch (error) {
      console.error(`❌ Stage 2 failed for trip ${tripId}:`, error);
      return {
        compiled_data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // STAGE 3: Pattern Training with LLama3.1
  async trainOnCompiledData(allCompiledData: any[]): Promise<any> {
    try {
      console.log(
        `🎯 Stage 3: Training patterns on ${
          allCompiledData.length
        } compiled trips with LLama3.1...`
      );

      const trainingPrompt = this.buildTrainingPrompt(allCompiledData);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.1:latest",
          prompt: trainingPrompt,
          stream: false,
          options: { temperature: 0.2, num_predict: 500 },
        }),
      });

      if (!response.ok)
        throw new Error(`LLama3.1 training failed: ${response.status}`);
      const result = await response.json();

      const patterns = this.parseTrainingPatterns(result.response);
      console.log(
        `✅ Stage 3 Complete: Learned patterns from ${
          allCompiledData.length
        } trips`
      );
      return patterns;
    } catch (error) {
      console.error("❌ Stage 3 training failed:", error);
      return {
        patterns: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // STAGE 4: Final Insights with DeepSeek-R1
  async generateFinalInsights(
    compiledData: any[],
    trainedPatterns: any
  ): Promise<any> {
    try {
      console.log(`🧠 Stage 4: Generating final insights with DeepSeek-R1...`);

      const insightsPrompt = this.buildInsightsPrompt(
        compiledData,
        trainedPatterns
      );

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-r1:latest",
          prompt: insightsPrompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 600 },
        }),
      });

      if (!response.ok)
        throw new Error(`DeepSeek-R1 insights failed: ${response.status}`);
      const result = await response.json();

      const insights = this.parseFinalInsights(result.response);
      console.log(
        `✅ Stage 4 Complete: Generated comprehensive insights with DeepSeek-R1`
      );
      return insights;
    } catch (error) {
      console.error("❌ Stage 4 insights generation failed:", error);
      return {
        insights: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // PROMPT BUILDERS
  private buildOCRPrompt(screenshotType: string): string {
    const prompts = {
      initial_offer:
        "Extract all visible text from this rideshare trip offer screenshot. Focus on: pickup location, destination, estimated earnings, distance, time, and any surge pricing.",
      final_total:
        "Extract all visible text from this completed rideshare trip screenshot. Focus on: final earnings, actual distance, trip duration, tips, base fare, and locations.",
      dashboard:
        "Extract all visible numbers and text from this rideshare dashboard screenshot. Focus on: total trips, earnings, distance, time periods, and summary statistics.",
      map:
        "Extract all visible location and route information from this map screenshot.",
    };
    return prompts[screenshotType as keyof typeof prompts] || prompts.dashboard;
  }

  private buildStructurePrompt(
    ocrText: string,
    screenshotType: string
  ): string {
    return `Convert this OCR text from a ${screenshotType} screenshot into structured JSON data:

OCR TEXT:
${ocrText}

Extract and format as JSON with these fields (use null for missing data):
{
  "screenshot_type": "${screenshotType}",
  "date_time": "YYYY-MM-DD HH:MM",
  "driver_earnings": 0.00,
  "distance": 0.0,
  "trip_duration": "XX minutes",
  "pickup_location": "address",
  "destination": "address", 
  "tips": 0.00,
  "base_fare": 0.00,
  "surge_multiplier": 1.0,
  "total_trips": 0
}

Only include fields you can confidently extract from the OCR text.`;
  }

  private buildCompilationPrompt(screenshots: any[]): string {
    const screenshotData = screenshots.map((s) => ({
      type: s.screenshot_type,
      extracted: s.extracted_data,
      timestamp: s.upload_timestamp,
    }));

    return `Compile these screenshot data extractions into a single comprehensive trip record:

SCREENSHOT DATA:
${JSON.stringify(screenshotData, null, 2)}

Create a unified JSON record that combines all available information:
{
  "trip_summary": {
    "total_earnings": 0.00,
    "total_distance": 0.0,
    "trip_count": 0,
    "date": "YYYY-MM-DD",
    "active_time": "XX hours"
  },
  "trip_details": {
    "individual_trips": [],
    "locations": [],
    "earnings_breakdown": {}
  },
  "data_quality": {
    "screenshots_processed": 0,
    "confidence": "HIGH/MEDIUM/LOW",
    "missing_data": []
  }
}

Resolve conflicts by prioritizing final_total over initial_offer data.`;
  }

  private buildTrainingPrompt(compiledData: any[]): string {
    return `Analyze these compiled trip records to identify patterns and create personalized benchmarks:

COMPILED DATA:
${JSON.stringify(compiledData.slice(0, 10), null, 2)}

Identify and extract:
{
  "earning_patterns": {
    "avg_per_trip": 0.00,
    "best_day_earnings": 0.00,
    "typical_hourly_rate": 0.00
  },
  "efficiency_patterns": {
    "avg_miles_per_trip": 0.0,
    "fuel_efficiency": 0.0,
    "high_value_locations": []
  },
  "time_patterns": {
    "peak_hours": [],
    "most_productive_days": [],
    "avg_trips_per_day": 0
  },
  "personalized_benchmarks": {
    "target_daily_earnings": 0.00,
    "target_trips_per_day": 0,
    "excellent_performance": 0,
    "good_performance": 0,
    "average_performance": 0
  }
}`;
  }

  private buildInsightsPrompt(compiledData: any[], patterns: any): string {
    return `As a rideshare analytics expert using DeepSeek reasoning capabilities, analyze this driver's performance:

COMPILED TRIP DATA:
${JSON.stringify(compiledData.slice(0, 5), null, 2)}

LEARNED PATTERNS:
${JSON.stringify(patterns, null, 2)}

Generate comprehensive insights in JSON format:
{
  "performance_score": 0,
  "performance_category": "Excellent/Good/Average/Below Average",
  "key_insights": [
    "Specific insight about earnings trends",
    "Observation about efficiency patterns", 
    "Notable pattern in driving behavior"
  ],
  "recommendations": [
    "Actionable recommendation for improvement",
    "Strategy for increasing earnings"
  ],
  "trends": {
    "earnings_trend": "increasing/stable/decreasing",
    "efficiency_trend": "improving/stable/declining",
    "volume_trend": "up/stable/down"
  },
  "fuel_analysis": {
    "estimated_fuel_cost": 0.00,
    "fuel_efficiency_rating": "excellent/good/fair/poor",
    "cost_per_mile": 0.00
  },
  "projections": {
    "weekly_earnings": 0.00,
    "monthly_potential": 0.00,
    "confidence": "high/medium/low"
  }
}

Use your advanced reasoning to provide specific, actionable insights based on the actual data patterns.`;
  }

  // PARSERS
  private parseStructuredData(response: string, screenshotType: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          extracted_data: parsed,
          extraction_quality: this.assessQuality(parsed),
          model_used: "llama3.1 + llava",
        };
      }
      throw new Error("No JSON found in response");
    } catch (error) {
      return {
        extracted_data: null,
        extraction_quality: "LOW",
        error: "Failed to parse structured data",
      };
    }
  }

  private parseCompiledData(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      return { error: "Failed to parse compiled data" };
    }
  }

  private parseTrainingPatterns(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      return { error: "Failed to parse training patterns" };
    }
  }

  private parseFinalInsights(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      return { error: "Failed to parse final insights" };
    }
  }

  private assessQuality(data: any): "HIGH" | "MEDIUM" | "LOW" {
    if (!data) return "LOW";
    const hasEarnings = data.driver_earnings && data.driver_earnings > 0;
    const hasDistance = data.distance && data.distance > 0;
    const hasTime = data.date_time || data.trip_duration;

    if (hasEarnings && hasDistance && hasTime) return "HIGH";
    if (hasEarnings || hasDistance) return "MEDIUM";
    return "LOW";
  }

  // FULL PIPELINE EXECUTOR
  async runFullPipeline(trips: any[]): Promise<any> {
    console.log(
      `🚀 Running Full Multi-Stage Pipeline with ${trips.length} trips`
    );
    console.log(
      `📋 Model Allocation: LLaVA+LLama3.1 for processing, DeepSeek-R1 for insights`
    );

    try {
      // Stage 1 & 2: Process each trip's screenshots
      const compiledTrips = [];
      for (const trip of trips.slice(0, 10)) {
        // Limit for testing
        if (trip.trip_screenshots && trip.trip_screenshots.length > 0) {
          const compiled = await this.compileScreenshotData(trip.id);
          if (compiled.compiled_data) {
            compiledTrips.push(compiled.compiled_data);
          }
        }
      }

      // Stage 3: Train on compiled data
      const patterns = await this.trainOnCompiledData(compiledTrips);

      // Stage 4: Generate final insights with DeepSeek-R1
      const insights = await this.generateFinalInsights(
        compiledTrips,
        patterns
      );

      return {
        success: true,
        pipeline_stages: {
          stage1_2_completed: compiledTrips.length,
          stage3_patterns: patterns,
          stage4_insights: insights,
        },
        model_usage: {
          llava: "Screenshot OCR",
          llama31: "Data processing and pattern training",
          deepseek_r1: "Final insights generation",
        },
        results: insights,
      };
    } catch (error) {
      console.error("❌ Full pipeline failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pipeline failed",
        fallback: "Using basic data analysis",
      };
    }
  }
}
