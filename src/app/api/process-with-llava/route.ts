// Enhanced Screenshot Processing using LLaVA Vision Model
// Processes rideshare screenshots with your local Ollama LLaVA model

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

interface LLaVAResponse {
  response: string;
  model: string;
  created_at: string;
}

class LLaVAScreenshotProcessor {
  private ollamaUrl = 'http://localhost:11434';

  async processScreenshot(imageBase64: string, screenshotType: string): Promise<any> {
    try {
      console.log(`👁️ Processing ${screenshotType} screenshot with LLaVA...`);
      
      const prompt = this.buildPromptForType(screenshotType);
      
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
            num_predict: 400,
            top_k: 1,
            top_p: 0.1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`LLaVA API error: ${response.status} ${response.statusText}`);
      }

      const result: LLaVAResponse = await response.json();
      console.log(`✅ LLaVA processed screenshot, response length: ${result.response.length}`);
      
      return this.parseResponse(result.response, screenshotType);
    } catch (error) {
      console.error('❌ LLaVA processing failed:', error);
      return {
        extracted_data: null,
        ocr_data: {
          raw_text: '',
          extraction_quality: 'LOW',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private buildPromptForType(screenshotType: string): string {
    const prompts = {
      'initial_offer': `You are analyzing a rideshare trip offer screenshot. Extract these exact details:

PICKUP: [pickup location/address]
DESTINATION: [destination location/address] 
ESTIMATED_EARNINGS: $[dollar amount]
DISTANCE: [miles as number]
ESTIMATED_TIME: [minutes as number]
SURGE: [surge multiplier if any, or 1.0]

Look carefully at the image and extract only what you can clearly see. If information is not visible, write "NOT_VISIBLE".

Be precise with dollar amounts and numerical values.`,

      'final_total': `You are analyzing a completed rideshare trip summary screenshot. Extract these exact details:

TOTAL_EARNINGS: $[final driver earnings]
ACTUAL_DISTANCE: [actual miles driven]
ACTUAL_TIME: [actual trip duration in minutes]
BASE_FARE: $[base fare amount if visible]
TIPS: $[tip amount if visible]
SURGE_MULTIPLIER: [surge multiplier if any]
PICKUP_LOCATION: [pickup address if visible]
DESTINATION: [destination address if visible]

Extract only values you can clearly read from the image. Use "NOT_VISIBLE" for unclear information.`,

      'dashboard': `You are analyzing a rideshare driver dashboard screenshot. Extract these key metrics:

TOTAL_TRIPS: [number of trips completed]
TOTAL_EARNINGS: $[total driver earnings]
TOTAL_DISTANCE: [total miles driven] 
ACTIVE_TIME: [total active hours]
AVERAGE_PER_TRIP: $[average earnings per trip]
DATE_RANGE: [time period shown]

Focus on summary statistics visible in the dashboard. Extract only clear, readable numbers.`,

      'map': `You are analyzing a rideshare trip map screenshot. Extract available information:

PICKUP_LOCATION: [pickup point/address if visible]
DESTINATION: [destination point/address if visible]
TRIP_ROUTE: [brief description of route if visible]
DISTANCE_ESTIMATE: [distance if shown]
TIME_ESTIMATE: [time estimate if shown]

Extract geographical and route information that's clearly visible.`
    };

    return prompts[screenshotType as keyof typeof prompts] || prompts.dashboard;
  }

  private parseResponse(response: string, screenshotType: string): any {
    try {
      const extracted: any = {
        screenshot_type: screenshotType,
        processing_model: 'llava:latest',
        processed_at: new Date().toISOString()
      };

      // Parse structured response
      const lines = response.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':').map(s => s.trim());
          const cleanValue = value?.replace(/["']/g, '').trim();
          
          if (!cleanValue || cleanValue === 'NOT_VISIBLE') continue;

          switch (key.toUpperCase()) {
            case 'TOTAL_EARNINGS':
            case 'ESTIMATED_EARNINGS':
              extracted.driver_earnings = this.parseMoneyAmount(cleanValue);
              break;
            case 'ACTUAL_DISTANCE':
            case 'DISTANCE':
              extracted.distance = this.parseNumericValue(cleanValue);
              break;
            case 'TOTAL_TRIPS':
              extracted.total_trips = parseInt(cleanValue) || 0;
              break;
            case 'TIPS':
              extracted.tips = this.parseMoneyAmount(cleanValue);
              break;
            case 'BASE_FARE':
              extracted.base_fare = this.parseMoneyAmount(cleanValue);
              break;
            case 'SURGE':
            case 'SURGE_MULTIPLIER':
              extracted.surge_multiplier = parseFloat(cleanValue) || 1.0;
              break;
            case 'PICKUP':
            case 'PICKUP_LOCATION':
              extracted.pickup_location = cleanValue;
              break;
            case 'DESTINATION':
              extracted.destination = cleanValue;
              break;
            case 'ACTUAL_TIME':
            case 'ESTIMATED_TIME':
              extracted.trip_duration = cleanValue;
              break;
            case 'ACTIVE_TIME':
              extracted.active_time = cleanValue;
              break;
            case 'AVERAGE_PER_TRIP':
              extracted.avg_per_trip = this.parseMoneyAmount(cleanValue);
              break;
            case 'DATE_RANGE':
              extracted.date_range = cleanValue;
              break;
          }
        }
      }

      // Calculate quality and confidence
      const quality = this.assessExtractionQuality(extracted, screenshotType);
      const confidence = this.calculateConfidence(extracted, screenshotType);

      return {
        extracted_data: extracted,
        ocr_data: {
          raw_text: response,
          extraction_quality: quality,
          confidence: confidence,
          model_used: 'llava:latest',
          processed_fields: Object.keys(extracted).length
        }
      };

    } catch (error) {
      console.error('Error parsing LLaVA response:', error);
      return {
        extracted_data: null,
        ocr_data: {
          raw_text: response,
          extraction_quality: 'LOW',
          error: 'Failed to parse response'
        }
      };
    }
  }

  private parseMoneyAmount(value: string): number {
    const cleaned = value.replace(/[$,]/g, '').trim();
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  private parseNumericValue(value: string): number {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private assessExtractionQuality(data: any, screenshotType: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    const expectedFields = {
      'initial_offer': ['driver_earnings', 'distance'],
      'final_total': ['driver_earnings', 'distance'],
      'dashboard': ['total_trips', 'driver_earnings', 'distance'],
      'map': ['pickup_location', 'destination']
    };

    const expected = expectedFields[screenshotType as keyof typeof expectedFields] || [];
    const found = expected.filter(field => data[field] && data[field] !== 0).length;
    const ratio = found / expected.length;

    if (ratio >= 0.8) return 'HIGH';
    if (ratio >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private calculateConfidence(data: any, screenshotType: string): number {
    let score = 0;
    const maxScore = 100;

    // Base points for having core data
    if (data.driver_earnings && data.driver_earnings > 0) score += 35;
    if (data.distance && data.distance > 0) score += 25;
    if (data.total_trips && data.total_trips > 0) score += 20;
    
    // Bonus points for additional fields
    if (data.pickup_location) score += 5;
    if (data.destination) score += 5;
    if (data.tips && data.tips > 0) score += 5;
    if (data.surge_multiplier && data.surge_multiplier > 1) score += 5;

    return Math.min(score, maxScore);
  }
}

// API endpoint for processing screenshots with LLaVA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { screenshot_id, image_base64, screenshot_type } = body;

    if (!screenshot_id || !image_base64 || !screenshot_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: screenshot_id, image_base64, screenshot_type' 
      }, { status: 400 });
    }

    console.log(`🚀 Starting LLaVA processing for screenshot ${screenshot_id}`);

    const processor = new LLaVAScreenshotProcessor();
    const result = await processor.processScreenshot(image_base64, screenshot_type);

    // Update screenshot in database with LLaVA results
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('trip_screenshots')
      .update({
        extracted_data: result.extracted_data,
        ocr_data: result.ocr_data,
        is_processed: true,
        processing_notes: `Processed with LLaVA ${new Date().toISOString()}`
      })
      .eq('id', screenshot_id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update screenshot:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update screenshot',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log(`✅ Screenshot ${screenshot_id} processed and updated successfully`);

    return NextResponse.json({
      success: true,
      screenshot_id,
      extracted_data: result.extracted_data,
      processing_quality: result.ocr_data.extraction_quality,
      confidence: result.ocr_data.confidence,
      model_used: 'llava:latest'
    });

  } catch (error) {
    console.error('❌ LLaVA processing endpoint error:', error);
    return NextResponse.json({ 
      error: 'Screenshot processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Test endpoint to verify LLaVA connection
export async function GET(request: NextRequest) {
  try {
    const testResponse = await fetch('http://localhost:11434/api/tags');
    
    if (!testResponse.ok) {
      return NextResponse.json({
        status: 'Ollama unreachable',
        error: `HTTP ${testResponse.status}`
      });
    }

    const models = await testResponse.json();
    const hasLlava = models.models?.some((m: any) => m.name.includes('llava'));

    return NextResponse.json({
      status: 'Connected',
      ollama_running: true,
      llava_available: hasLlava,
      available_models: models.models?.map((m: any) => m.name) || []
    });

  } catch (error) {
    return NextResponse.json({
      status: 'Ollama not running',
      error: error instanceof Error ? error.message : 'Connection failed',
      recommendation: 'Run: ollama serve'
    });
  }
}

export { LLaVAScreenshotProcessor };
