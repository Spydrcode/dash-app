// Complete Data Pipeline Diagnosis - Check every stage of screenshot processing
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    console.log('🔍 COMPLETE DATA PIPELINE DIAGNOSIS...');
    
    // STAGE 1: Check raw screenshot uploads
    const { data: screenshots, error: screenshotError } = await supabaseAdmin
      .from('trip_screenshots')
      .select('*')
      .order('created_at', { ascending: false });

    if (screenshotError) {
      return NextResponse.json({ error: 'Failed to fetch screenshots', details: screenshotError });
    }

    console.log(`📸 SCREENSHOT ANALYSIS: ${screenshots?.length || 0} total screenshots`);
    
    // Analyze screenshot processing status
    const processedScreenshots = screenshots?.filter(s => s.is_processed) || [];
    const withExtractedData = screenshots?.filter(s => s.extracted_data && Object.keys(s.extracted_data).length > 0) || [];
    const withOCRData = screenshots?.filter(s => s.ocr_data && Object.keys(s.ocr_data).length > 0) || [];
    
    // STAGE 2: Check trips and their relationship to screenshots
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        id,
        trip_data,
        created_at,
        trip_screenshots (
          id,
          screenshot_type,
          is_processed,
          extracted_data,
          ocr_data,
          processing_notes
        )
      `)
      .order('created_at', { ascending: false });

    if (tripsError) {
      return NextResponse.json({ error: 'Failed to fetch trips', details: tripsError });
    }

    console.log(`🚗 TRIP ANALYSIS: ${trips?.length || 0} total trips`);

    // STAGE 3: Analyze data extraction quality
    const dataQualityAnalysis = {
      screenshots_with_earnings: 0,
      screenshots_with_distance: 0,
      screenshots_with_trips_count: 0,
      complete_extractions: 0,
      partial_extractions: 0,
      failed_extractions: 0
    };

    withExtractedData.forEach(screenshot => {
      const data = screenshot.extracted_data;
      let fieldCount = 0;
      
      if (data.driver_earnings && data.driver_earnings > 0) {
        dataQualityAnalysis.screenshots_with_earnings++;
        fieldCount++;
      }
      if (data.distance && data.distance > 0) {
        dataQualityAnalysis.screenshots_with_distance++;
        fieldCount++;
      }
      if (data.total_trips && data.total_trips > 0) {
        dataQualityAnalysis.screenshots_with_trips_count++;
        fieldCount++;
      }

      if (fieldCount >= 3) dataQualityAnalysis.complete_extractions++;
      else if (fieldCount >= 1) dataQualityAnalysis.partial_extractions++;
      else dataQualityAnalysis.failed_extractions++;
    });

    // STAGE 4: Check Ollama connection
    let ollamaStatus = 'UNKNOWN';
    let availableModels: string[] = [];
    
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (ollamaResponse.ok) {
        const result = await ollamaResponse.json();
        availableModels = result.models?.map((m: { name: string }) => m.name) || [];
        ollamaStatus = 'CONNECTED';
        console.log(`🤖 OLLAMA STATUS: Connected with ${availableModels.length} models`);
      } else {
        ollamaStatus = 'ERROR';
      }
    } catch {
      ollamaStatus = 'DISCONNECTED';
      console.log('❌ OLLAMA STATUS: Not reachable');
    }

    // STAGE 5: Sample actual data to show what we have
    const sampleScreenshots = withExtractedData.slice(0, 5).map(s => ({
      id: s.id,
      type: s.screenshot_type,
      processed: s.is_processed,
      extracted_data: s.extracted_data,
      quality: s.ocr_data?.extraction_quality,
      model_used: s.processing_notes?.includes('LLaVA') ? 'LLaVA' : 'Other'
    }));

    const sampleTrips = trips?.slice(0, 3).map(t => ({
      id: t.id,
      created_at: t.created_at,
      has_trip_data: !!t.trip_data,
      trip_data_fields: t.trip_data ? Object.keys(t.trip_data) : [],
      screenshots_count: t.trip_screenshots?.length || 0,
      processed_screenshots: t.trip_screenshots?.filter((s: { is_processed?: boolean }) => s.is_processed).length || 0
    })) || [];

    // STAGE 6: Identify specific problems
    const problems = [];
    const recommendations = [];

    if (ollamaStatus !== 'CONNECTED') {
      problems.push('Ollama AI service not connected - screenshot processing will fail');
      recommendations.push('Start Ollama: ollama serve');
    }

    if (!availableModels.includes('llava:latest')) {
      problems.push('LLaVA vision model not available for screenshot OCR');
      recommendations.push('Install LLaVA: ollama pull llava');
    }

    if (processedScreenshots.length < screenshots?.length * 0.5) {
      problems.push(`Only ${processedScreenshots.length}/${screenshots?.length} screenshots processed`);
      recommendations.push('Run batch screenshot processing to extract data from images');
    }

    if (dataQualityAnalysis.complete_extractions < 5) {
      problems.push(`Only ${dataQualityAnalysis.complete_extractions} complete data extractions found`);
      recommendations.push('Improve screenshot quality or OCR processing parameters');
    }

    const diagnosis = {
      pipeline_status: problems.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
      
      stage_1_uploads: {
        total_screenshots: screenshots?.length || 0,
        by_type: screenshots?.reduce((acc: Record<string, number>, s) => {
          acc[s.screenshot_type] = (acc[s.screenshot_type] || 0) + 1;
          return acc;
        }, {}) || {}
      },

      stage_2_processing: {
        processed: processedScreenshots.length,
        unprocessed: (screenshots?.length || 0) - processedScreenshots.length,
        processing_rate: screenshots?.length ? (processedScreenshots.length / screenshots.length) * 100 : 0,
        with_extracted_data: withExtractedData.length,
        with_ocr_data: withOCRData.length
      },

      stage_3_extraction: dataQualityAnalysis,

      stage_4_ollama: {
        status: ollamaStatus,
        available_models: availableModels,
        llava_available: availableModels.includes('llava:latest'),
        deepseek_available: availableModels.includes('deepseek-r1:latest')
      },

      stage_5_compilation: {
        total_trips: trips?.length || 0,
        trips_with_screenshots: trips?.filter(t => t.trip_screenshots && t.trip_screenshots.length > 0).length || 0,
        avg_screenshots_per_trip: trips?.length ? 
          (screenshots?.length || 0) / trips.length : 0
      },

      data_samples: {
        sample_screenshots: sampleScreenshots,
        sample_trips: sampleTrips
      },

      problems_identified: problems,
      recommendations: recommendations,

      next_steps: [
        'Ensure Ollama is running with LLaVA model',
        'Process all screenshots through LLaVA OCR',
        'Create JSON dataset from extracted screenshot data',
        'Train AI agents on compiled JSON data',
        'Generate accurate insights from trained models'
      ]
    };

    console.log(`🎯 DIAGNOSIS COMPLETE: ${problems.length} problems found`);
    console.log(`📊 DATA QUALITY: ${dataQualityAnalysis.complete_extractions} complete extractions from ${screenshots?.length} screenshots`);

    return NextResponse.json({
      success: true,
      diagnosis: diagnosis,
      summary: {
        status: diagnosis.pipeline_status,
        total_screenshots: screenshots?.length || 0,
        extraction_success_rate: screenshots?.length ? 
          (dataQualityAnalysis.complete_extractions / screenshots.length) * 100 : 0,
        ollama_connected: ollamaStatus === 'CONNECTED',
        action_needed: problems.length > 0
      }
    });

  } catch (error) {
    console.error('❌ Pipeline diagnosis failed:', error);
    return NextResponse.json({ 
      error: 'Pipeline diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}