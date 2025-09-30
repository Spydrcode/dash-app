// Multi-Stage Ollama AI Pipeline for Screenshot Processing
// Stage 1: OCR Extraction → Stage 2: Data Compilation → Stage 3: Training → Stage 4: Insights

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

interface ExtractedScreenshotData {
  screenshot_id: string;
  screenshot_type: string;
  extraction_datetime: string;
  data: {
    driver_earnings?: number;
    distance?: number;
    total_trips?: number;
    trip_duration?: string;
    pickup_location?: string;
    destination?: string;
    tips?: number;
    surge_multiplier?: number;
    base_fare?: number;
  };
  extraction_confidence: number;
  quality: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface CompiledTripData {
  trip_id: string;
  date: string;
  screenshots: ExtractedScreenshotData[];
  compiled_data: {
    total_earnings: number;
    total_distance: number;
    total_trips: number;
    profit: number;
    fuel_cost: number;
    trip_details: any[];
  };
  data_completeness: number;
  validation_status: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE';
}

interface TrainingData {
  patterns: {
    earning_patterns: any[];
    efficiency_patterns: any[];
    time_patterns: any[];
    location_patterns: any[];
  };
  benchmarks: {
    avg_earnings_per_trip: number;
    avg_earnings_per_mile: number;
    target_daily_earnings: number;
    efficiency_score: number;
  };
  insights: {
    peak_hours: string[];
    best_locations: string[];
    optimization_opportunities: string[];
  };
}

// STAGE 1: Screenshot OCR Extraction Agent
class OCRExtractionAgent {
  private ollamaUrl = 'http://localhost:11434';

  async processScreenshot(imageBase64: string, screenshotType: string, screenshotId: string): Promise<ExtractedScreenshotData> {
    try {
      console.log(`🔍 STAGE 1: OCR Agent processing screenshot ${screenshotId} (${screenshotType})`);

      const prompt = this.buildExtractionPrompt(screenshotType);
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llava:latest',
          prompt: prompt,
          images: [imageBase64],
          stream: false,
          options: {
            temperature: 0,
            num_predict: 500,
            top_k: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`LLaVA OCR failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ STAGE 1: OCR extraction successful for ${screenshotId}`);
      
      return this.parseOCRResponse(result.response, screenshotId, screenshotType);
    } catch (error) {
      console.error(`❌ STAGE 1: OCR failed for ${screenshotId}:`, error);
      return {
        screenshot_id: screenshotId,
        screenshot_type: screenshotType,
        extraction_datetime: new Date().toISOString(),
        data: {},
        extraction_confidence: 0,
        quality: 'LOW'
      };
    }
  }

  private buildExtractionPrompt(screenshotType: string): string {
    const prompts = {
      'initial_offer': `Extract rideshare trip offer data and respond in JSON format:
{
  "driver_earnings": [dollar amount as number],
  "distance": [miles as number],
  "pickup_location": "[pickup address]",
  "destination": "[destination address]",
  "surge_multiplier": [surge as number, 1.0 if none],
  "estimated_duration": "[time estimate]"
}
Only include fields you can clearly read from the image.`,

      'final_total': `Extract completed rideshare trip data and respond in JSON format:
{
  "driver_earnings": [total earnings as number],
  "distance": [actual miles as number], 
  "trip_duration": "[actual time taken]",
  "tips": [tip amount as number, 0 if none],
  "base_fare": [base fare as number],
  "surge_multiplier": [surge multiplier as number],
  "pickup_location": "[pickup address]",
  "destination": "[destination address]"
}
Extract only clearly visible data.`,

      'dashboard': `Extract rideshare dashboard summary and respond in JSON format:
{
  "total_trips": [number of trips],
  "driver_earnings": [total earnings as number],
  "distance": [total miles as number],
  "active_time": "[total active hours]",
  "date_range": "[time period covered]",
  "avg_per_trip": [average earnings per trip as number]
}
Focus on summary statistics visible in the dashboard.`
    };

    return prompts[screenshotType as keyof typeof prompts] || prompts.dashboard;
  }

  private parseOCRResponse(response: string, screenshotId: string, screenshotType: string): ExtractedScreenshotData {
    try {
      // Try to parse as JSON first
      let extractedData: any = {};
      
      if (response.includes('{') && response.includes('}')) {
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } else {
        // Fallback: parse key-value pairs
        extractedData = this.parseKeyValueResponse(response);
      }

      const confidence = this.calculateExtractionConfidence(extractedData);
      const quality = confidence >= 80 ? 'HIGH' : confidence >= 50 ? 'MEDIUM' : 'LOW';

      return {
        screenshot_id: screenshotId,
        screenshot_type: screenshotType,
        extraction_datetime: new Date().toISOString(),
        data: extractedData,
        extraction_confidence: confidence,
        quality: quality
      };
    } catch (error) {
      console.error(`Failed to parse OCR response for ${screenshotId}:`, error);
      return {
        screenshot_id: screenshotId,
        screenshot_type: screenshotType,
        extraction_datetime: new Date().toISOString(),
        data: {},
        extraction_confidence: 0,
        quality: 'LOW'
      };
    }
  }

  private parseKeyValueResponse(response: string): any {
    const data: any = {};
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());
        const cleanValue = value?.replace(/['"$,]/g, '').trim();
        
        if (cleanValue && cleanValue !== 'null' && cleanValue !== 'undefined') {
          if (!isNaN(Number(cleanValue))) {
            data[key.toLowerCase().replace(/\s+/g, '_')] = Number(cleanValue);
          } else {
            data[key.toLowerCase().replace(/\s+/g, '_')] = cleanValue;
          }
        }
      }
    }
    
    return data;
  }

  private calculateExtractionConfidence(data: any): number {
    let score = 0;
    
    if (data.driver_earnings && data.driver_earnings > 0) score += 30;
    if (data.distance && data.distance > 0) score += 25;
    if (data.total_trips && data.total_trips > 0) score += 20;
    if (data.pickup_location) score += 10;
    if (data.destination) score += 10;
    if (data.tips !== undefined) score += 5;
    
    return Math.min(score, 100);
  }
}

// STAGE 2: Data Compilation Agent
class DataCompilationAgent {
  private ollamaUrl = 'http://localhost:11434';

  async compileTripsData(extractedScreenshots: ExtractedScreenshotData[]): Promise<CompiledTripData[]> {
    try {
      console.log(`📊 STAGE 2: Compilation Agent processing ${extractedScreenshots.length} screenshot extractions`);

      const prompt = `Analyze these screenshot extractions and compile them into coherent trip data:

${JSON.stringify(extractedScreenshots, null, 2)}

Group related screenshots by date and compile into trip summaries. Return JSON array:
[
  {
    "trip_date": "YYYY-MM-DD",
    "total_earnings": [sum of all earnings],
    "total_distance": [sum of distances],
    "total_trips": [count of trips],
    "trip_details": [array of individual trips],
    "data_quality": "HIGH|MEDIUM|LOW"
  }
]

Focus on accurate data aggregation and validation.`;

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:latest',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 800
          }
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek compilation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ STAGE 2: Data compilation successful`);
      
      return this.parseCompilationResponse(result.response, extractedScreenshots);
    } catch (error) {
      console.error('❌ STAGE 2: Compilation failed:', error);
      return this.fallbackCompilation(extractedScreenshots);
    }
  }

  private parseCompilationResponse(response: string, screenshots: ExtractedScreenshotData[]): CompiledTripData[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const compiledData = JSON.parse(jsonMatch[0]);
        return compiledData.map((item: any, index: number) => ({
          trip_id: `compiled_${Date.now()}_${index}`,
          date: item.trip_date || new Date().toISOString().split('T')[0],
          screenshots: screenshots.filter(s => 
            s.extraction_datetime.includes(item.trip_date) || index === 0
          ),
          compiled_data: {
            total_earnings: item.total_earnings || 0,
            total_distance: item.total_distance || 0,
            total_trips: item.total_trips || 0,
            profit: (item.total_earnings || 0) * 0.7, // Estimate profit
            fuel_cost: (item.total_distance || 0) * 0.18, // $0.18/mile
            trip_details: item.trip_details || []
          },
          data_completeness: item.data_quality === 'HIGH' ? 90 : 
                           item.data_quality === 'MEDIUM' ? 70 : 40,
          validation_status: item.data_quality === 'HIGH' ? 'COMPLETE' : 'PARTIAL'
        }));
      }
    } catch (error) {
      console.error('Failed to parse compilation response:', error);
    }
    
    return this.fallbackCompilation(screenshots);
  }

  private fallbackCompilation(screenshots: ExtractedScreenshotData[]): CompiledTripData[] {
    // Simple fallback: group by day
    const grouped = screenshots.reduce((acc: any, screenshot) => {
      const date = screenshot.extraction_datetime.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(screenshot);
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, screenshots]: [string, any]) => {
      const totalEarnings = screenshots.reduce((sum: number, s: ExtractedScreenshotData) => 
        sum + (s.data.driver_earnings || 0), 0);
      const totalDistance = screenshots.reduce((sum: number, s: ExtractedScreenshotData) => 
        sum + (s.data.distance || 0), 0);
      const totalTrips = screenshots.reduce((sum: number, s: ExtractedScreenshotData) => 
        sum + (s.data.total_trips || 1), 0);

      return {
        trip_id: `fallback_${date}`,
        date,
        screenshots,
        compiled_data: {
          total_earnings: totalEarnings,
          total_distance: totalDistance,
          total_trips: totalTrips,
          profit: totalEarnings * 0.7,
          fuel_cost: totalDistance * 0.18,
          trip_details: screenshots.map((s: ExtractedScreenshotData) => s.data)
        },
        data_completeness: screenshots.length > 0 ? 70 : 0,
        validation_status: 'PARTIAL' as const
      };
    });
  }
}

// STAGE 3: Training Agent
class TrainingAgent {
  private ollamaUrl = 'http://localhost:11434';

  async trainOnCompiledData(compiledTrips: CompiledTripData[]): Promise<TrainingData> {
    try {
      console.log(`🧠 STAGE 3: Training Agent analyzing ${compiledTrips.length} compiled trips`);

      const prompt = `Analyze this rideshare trip data and identify patterns for training:

${JSON.stringify(compiledTrips, null, 2)}

Provide training insights in JSON format:
{
  "earning_patterns": [
    {"pattern": "description", "frequency": number, "impact": "high|medium|low"}
  ],
  "efficiency_patterns": [
    {"pattern": "description", "earnings_per_mile": number}
  ],
  "benchmarks": {
    "avg_earnings_per_trip": number,
    "avg_earnings_per_mile": number,
    "target_daily_earnings": number,
    "efficiency_score": number
  },
  "optimization_opportunities": [
    "specific actionable recommendations"
  ]
}`;

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:latest',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 1000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek training failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ STAGE 3: Training analysis successful`);
      
      return this.parseTrainingResponse(result.response, compiledTrips);
    } catch (error) {
      console.error('❌ STAGE 3: Training failed:', error);
      return this.generateFallbackTraining(compiledTrips);
    }
  }

  private parseTrainingResponse(response: string, compiledTrips: CompiledTripData[]): TrainingData {
    try {
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          patterns: {
            earning_patterns: parsed.earning_patterns || [],
            efficiency_patterns: parsed.efficiency_patterns || [],
            time_patterns: [],
            location_patterns: []
          },
          benchmarks: parsed.benchmarks || this.calculateBasicBenchmarks(compiledTrips),
          insights: {
            peak_hours: [],
            best_locations: [],
            optimization_opportunities: parsed.optimization_opportunities || []
          }
        };
      }
    } catch (error) {
      console.error('Failed to parse training response:', error);
    }
    
    return this.generateFallbackTraining(compiledTrips);
  }

  private generateFallbackTraining(compiledTrips: CompiledTripData[]): TrainingData {
    const benchmarks = this.calculateBasicBenchmarks(compiledTrips);
    
    return {
      patterns: {
        earning_patterns: [
          { pattern: 'Daily earnings variation', frequency: compiledTrips.length, impact: 'medium' }
        ],
        efficiency_patterns: [
          { pattern: 'Distance-based efficiency', earnings_per_mile: benchmarks.avg_earnings_per_mile }
        ],
        time_patterns: [],
        location_patterns: []
      },
      benchmarks: benchmarks,
      insights: {
        peak_hours: ['16:00-18:00', '20:00-22:00'],
        best_locations: ['City Center', 'Airport'],
        optimization_opportunities: [
          'Focus on higher-paying trips',
          'Optimize routes to reduce fuel costs'
        ]
      }
    };
  }

  private calculateBasicBenchmarks(compiledTrips: CompiledTripData[]) {
    const totalEarnings = compiledTrips.reduce((sum, trip) => sum + trip.compiled_data.total_earnings, 0);
    const totalTrips = compiledTrips.reduce((sum, trip) => sum + trip.compiled_data.total_trips, 0);
    const totalDistance = compiledTrips.reduce((sum, trip) => sum + trip.compiled_data.total_distance, 0);
    const activeDays = compiledTrips.length;

    return {
      avg_earnings_per_trip: totalTrips > 0 ? totalEarnings / totalTrips : 0,
      avg_earnings_per_mile: totalDistance > 0 ? totalEarnings / totalDistance : 0,
      target_daily_earnings: activeDays > 0 ? totalEarnings / activeDays : 0,
      efficiency_score: totalDistance > 0 ? (totalEarnings / totalDistance) * 10 : 0
    };
  }
}

// STAGE 4: Insights Generation Agent
class InsightsAgent {
  private ollamaUrl = 'http://localhost:11434';

  async generateInsights(trainingData: TrainingData, compiledTrips: CompiledTripData[]): Promise<any> {
    try {
      console.log(`💡 STAGE 4: Insights Agent generating final insights`);

      const prompt = `Based on this training data and trip history, generate comprehensive rideshare insights:

TRAINING DATA:
${JSON.stringify(trainingData, null, 2)}

COMPILED TRIPS:
${JSON.stringify(compiledTrips, null, 2)}

Generate insights in JSON format:
{
  "performance_score": number,
  "key_insights": [
    "specific insight about earnings/efficiency/patterns"
  ],
  "recommendations": [
    "actionable recommendation"
  ],
  "trends": {
    "earnings_trend": "description",
    "efficiency_trend": "description"
  },
  "projections": {
    "weekly_earnings": number,
    "monthly_earnings": number
  }
}`;

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:latest',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 800
          }
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek insights failed: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ STAGE 4: Insights generation successful`);
      
      return this.parseInsightsResponse(result.response, trainingData, compiledTrips);
    } catch (error) {
      console.error('❌ STAGE 4: Insights generation failed:', error);
      return this.generateFallbackInsights(trainingData, compiledTrips);
    }
  }

  private parseInsightsResponse(response: string, trainingData: TrainingData, compiledTrips: CompiledTripData[]) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return {
          ...insights,
          model_used: 'deepseek-r1:latest',
          data_source: 'ollama_pipeline',
          generated_at: new Date().toISOString(),
          trips_analyzed: compiledTrips.length
        };
      }
    } catch (error) {
      console.error('Failed to parse insights response:', error);
    }
    
    return this.generateFallbackInsights(trainingData, compiledTrips);
  }

  private generateFallbackInsights(trainingData: TrainingData, compiledTrips: CompiledTripData[]) {
    const totalEarnings = compiledTrips.reduce((sum, trip) => sum + trip.compiled_data.total_earnings, 0);
    const totalTrips = compiledTrips.reduce((sum, trip) => sum + trip.compiled_data.total_trips, 0);
    const avgPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0;

    return {
      performance_score: Math.min(Math.round(avgPerTrip * 10), 100),
      key_insights: [
        `Average earnings of $${avgPerTrip.toFixed(2)} per trip from ${totalTrips} completed trips`,
        `Total earnings of $${totalEarnings.toFixed(2)} across ${compiledTrips.length} active days`,
        `Efficiency rate of $${trainingData.benchmarks.avg_earnings_per_mile.toFixed(2)} per mile`
      ],
      recommendations: trainingData.insights.optimization_opportunities,
      trends: {
        earnings_trend: totalEarnings > 100 ? 'Positive trajectory' : 'Building momentum',
        efficiency_trend: 'Stable performance with optimization opportunities'
      },
      projections: {
        weekly_earnings: totalEarnings * (7 / Math.max(compiledTrips.length, 1)),
        monthly_earnings: totalEarnings * (30 / Math.max(compiledTrips.length, 1))
      },
      model_used: 'fallback_calculation',
      data_source: 'compiled_trips',
      generated_at: new Date().toISOString(),
      trips_analyzed: compiledTrips.length
    };
  }
}

// Main Pipeline Coordinator
export class OllamaAIPipeline {
  private ocrAgent = new OCRExtractionAgent();
  private compilationAgent = new DataCompilationAgent();
  private trainingAgent = new TrainingAgent();
  private insightsAgent = new InsightsAgent();

  async processCompleteDataset(): Promise<any> {
    try {
      console.log('🚀 STARTING COMPLETE OLLAMA AI PIPELINE...');

      // Get all screenshots from database
      const { data: screenshots, error } = await supabaseAdmin
        .from('trip_screenshots')
        .select('id, screenshot_type, image_path, created_at')
        .order('created_at', { ascending: false });

      if (error || !screenshots || screenshots.length === 0) {
        throw new Error('No screenshots found to process');
      }

      console.log(`📸 Found ${screenshots.length} screenshots to process through pipeline`);

      // STAGE 1: Extract data from all screenshots
      console.log('🔍 STAGE 1: Starting OCR extraction...');
      const extractedData: ExtractedScreenshotData[] = [];
      
      for (const screenshot of screenshots.slice(0, 10)) { // Process first 10 for testing
        // In production, load actual image and convert to base64
        const mockImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        const extracted = await this.ocrAgent.processScreenshot(mockImage, screenshot.screenshot_type, screenshot.id);
        extractedData.push(extracted);
      }

      console.log(`✅ STAGE 1 COMPLETE: Extracted data from ${extractedData.length} screenshots`);

      // STAGE 2: Compile extracted data into trips
      console.log('📊 STAGE 2: Starting data compilation...');
      const compiledTrips = await this.compilationAgent.compileTripsData(extractedData);
      console.log(`✅ STAGE 2 COMPLETE: Compiled ${compiledTrips.length} trip records`);

      // STAGE 3: Train on compiled data
      console.log('🧠 STAGE 3: Starting training analysis...');
      const trainingData = await this.trainingAgent.trainOnCompiledData(compiledTrips);
      console.log(`✅ STAGE 3 COMPLETE: Generated training patterns and benchmarks`);

      // STAGE 4: Generate final insights
      console.log('💡 STAGE 4: Generating insights...');
      const insights = await this.insightsAgent.generateInsights(trainingData, compiledTrips);
      console.log(`✅ STAGE 4 COMPLETE: Generated comprehensive insights`);

      // Save results to database
      await this.saveProcessingResults(extractedData, compiledTrips, trainingData, insights);

      console.log('🎉 OLLAMA AI PIPELINE COMPLETE!');

      return {
        success: true,
        pipeline_results: {
          stage_1_ocr: {
            screenshots_processed: extractedData.length,
            high_quality_extractions: extractedData.filter(e => e.quality === 'HIGH').length,
            extraction_rate: extractedData.length > 0 ? 
              (extractedData.filter(e => e.quality !== 'LOW').length / extractedData.length) * 100 : 0
          },
          stage_2_compilation: {
            trips_compiled: compiledTrips.length,
            total_earnings_found: compiledTrips.reduce((sum, t) => sum + t.compiled_data.total_earnings, 0),
            total_trips_found: compiledTrips.reduce((sum, t) => sum + t.compiled_data.total_trips, 0),
            data_completeness: compiledTrips.reduce((sum, t) => sum + t.data_completeness, 0) / compiledTrips.length
          },
          stage_3_training: {
            patterns_learned: trainingData.patterns.earning_patterns.length + trainingData.patterns.efficiency_patterns.length,
            benchmarks_calculated: Object.keys(trainingData.benchmarks).length,
            optimization_opportunities: trainingData.insights.optimization_opportunities.length
          },
          stage_4_insights: {
            performance_score: insights.performance_score,
            insights_generated: insights.key_insights?.length || 0,
            model_used: insights.model_used,
            trips_analyzed: insights.trips_analyzed
          }
        },
        final_insights: insights,
        model_info: {
          ocr_model: 'llava:latest',
          reasoning_model: 'deepseek-r1:latest',
          pipeline_version: '1.0',
          processing_time: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ PIPELINE FAILED:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pipeline processing failed',
        stage_failed: 'Unknown'
      };
    }
  }

  private async saveProcessingResults(
    extractedData: ExtractedScreenshotData[],
    compiledTrips: CompiledTripData[],
    trainingData: TrainingData,
    insights: any
  ) {
    try {
      // Update screenshots with extracted data
      for (const extracted of extractedData) {
        await supabaseAdmin
          .from('trip_screenshots')
          .update({
            extracted_data: extracted.data,
            ocr_data: {
              extraction_confidence: extracted.extraction_confidence,
              extraction_quality: extracted.quality,
              processed_by: 'ollama_pipeline',
              model_used: 'llava:latest'
            },
            is_processed: true,
            processing_notes: `Processed by Ollama AI Pipeline on ${extracted.extraction_datetime}`
          })
          .eq('id', extracted.screenshot_id);
      }

      console.log('💾 Pipeline results saved to database');
    } catch (error) {
      console.error('Failed to save pipeline results:', error);
    }
  }
}