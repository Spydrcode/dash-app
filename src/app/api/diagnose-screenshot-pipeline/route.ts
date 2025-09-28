// Diagnostic endpoint to check screenshot processing pipeline
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DIAGNOSING SCREENSHOT PROCESSING PIPELINE...');
    
    // Step 1: Check total screenshots in database
    const { data: allScreenshots, error: screenshotError } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, screenshot_type, is_processed, extracted_data, ocr_data, processing_notes')
      .order('created_at', { ascending: false });

    if (screenshotError) {
      console.error('❌ Error fetching screenshots:', screenshotError);
      return NextResponse.json({ error: 'Failed to fetch screenshots' });
    }

    const totalScreenshots = allScreenshots?.length || 0;
    const processedScreenshots = allScreenshots?.filter(s => s.is_processed) || [];
    const unprocessedScreenshots = allScreenshots?.filter(s => !s.is_processed) || [];
    
    console.log(`📸 SCREENSHOT SUMMARY:`);
    console.log(`   Total: ${totalScreenshots} screenshots`);
    console.log(`   Processed: ${processedScreenshots.length}`);
    console.log(`   Unprocessed: ${unprocessedScreenshots.length}`);

    // Step 2: Check data quality of processed screenshots
    const screenshotsWithData = processedScreenshots.filter(s => 
      s.extracted_data && Object.keys(s.extracted_data).length > 0
    );
    const screenshotsWithOCR = processedScreenshots.filter(s => 
      s.ocr_data && Object.keys(s.ocr_data).length > 0
    );

    console.log(`📊 DATA QUALITY:`);
    console.log(`   With extracted_data: ${screenshotsWithData.length}`);
    console.log(`   With ocr_data: ${screenshotsWithOCR.length}`);

    // Step 3: Check trips and associated screenshots
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
          ocr_data
        )
      `)
      .order('created_at', { ascending: false });

    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
      return NextResponse.json({ error: 'Failed to fetch trips' });
    }

    const tripsWithScreenshots = trips?.filter(t => t.trip_screenshots && t.trip_screenshots.length > 0) || [];
    const tripsWithProcessedScreenshots = tripsWithScreenshots.filter(trip => 
      trip.trip_screenshots.some((s: any) => s.is_processed)
    );

    console.log(`🚗 TRIP ANALYSIS:`);
    console.log(`   Total trips: ${trips?.length || 0}`);
    console.log(`   Trips with screenshots: ${tripsWithScreenshots.length}`);
    console.log(`   Trips with processed screenshots: ${tripsWithProcessedScreenshots.length}`);

    // Step 4: Analyze extracted data patterns
    const extractedDataSamples = screenshotsWithData.slice(0, 3).map(s => ({
      id: s.id,
      type: s.screenshot_type,
      extracted_data: s.extracted_data,
      has_earnings: !!s.extracted_data?.driver_earnings,
      has_distance: !!s.extracted_data?.distance,
      has_trips: !!s.extracted_data?.total_trips
    }));

    console.log(`🔍 SAMPLE EXTRACTED DATA:`, extractedDataSamples);

    // Step 5: Check if LLaVA OCR service is running
    let ocrServiceStatus = 'UNKNOWN';
    try {
      const testOCR = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (testOCR.ok) {
        const models = await testOCR.json();
        const hasLlava = models.models?.some((m: any) => m.name.includes('llava'));
        ocrServiceStatus = hasLlava ? 'RUNNING_WITH_LLAVA' : 'RUNNING_NO_LLAVA';
      } else {
        ocrServiceStatus = 'OLLAMA_DOWN';
      }
    } catch (error) {
      ocrServiceStatus = 'OLLAMA_UNREACHABLE';
      console.log('🔧 OCR Service (localhost:11434) is not reachable');
    }

    console.log(`🤖 OCR SERVICE STATUS: ${ocrServiceStatus}`);

    // Step 6: Check trip_data quality
    const tripDataSamples = trips?.slice(0, 3).map(t => ({
      id: t.id,
      has_trip_data: !!t.trip_data,
      trip_data_keys: t.trip_data ? Object.keys(t.trip_data) : [],
      has_earnings: !!t.trip_data?.driver_earnings,
      has_profit: !!t.trip_data?.profit,
      screenshots_count: t.trip_screenshots?.length || 0
    })) || [];

    console.log(`📈 TRIP DATA SAMPLES:`, tripDataSamples);

    // Return comprehensive diagnostic
    return NextResponse.json({
      success: true,
      diagnosis: {
        screenshot_stats: {
          total: totalScreenshots,
          processed: processedScreenshots.length,
          unprocessed: unprocessedScreenshots.length,
          processing_rate: totalScreenshots > 0 ? (processedScreenshots.length / totalScreenshots) * 100 : 0,
          with_extracted_data: screenshotsWithData.length,
          with_ocr_data: screenshotsWithOCR.length
        },
        trip_stats: {
          total_trips: trips?.length || 0,
          trips_with_screenshots: tripsWithScreenshots.length,
          trips_with_processed_screenshots: tripsWithProcessedScreenshots.length
        },
        ocr_service: {
          status: ocrServiceStatus,
          endpoint: 'http://localhost:11434'
        },
        data_samples: {
          extracted_data_samples: extractedDataSamples,
          trip_data_samples: tripDataSamples
        },
        issues_identified: [
          ...(ocrServiceStatus === 'OLLAMA_UNREACHABLE' ? ['OCR service (Ollama) is not running'] : []),
          ...(ocrServiceStatus === 'RUNNING_NO_LLAVA' ? ['LLaVA model not found in Ollama'] : []),
          ...(processedScreenshots.length === 0 ? ['No screenshots have been processed yet'] : []),
          ...(screenshotsWithData.length < processedScreenshots.length ? ['Some processed screenshots lack extracted_data'] : []),
          ...(tripsWithProcessedScreenshots.length === 0 ? ['No trips have processed screenshots'] : [])
        ],
        recommendations: [
          ...(ocrServiceStatus === 'OLLAMA_UNREACHABLE' ? ['Start Ollama service: ollama serve'] : []),
          ...(ocrServiceStatus === 'RUNNING_NO_LLAVA' ? ['Install LLaVA model: ollama pull llava'] : []),
          ...(unprocessedScreenshots.length > 0 ? [`Process ${unprocessedScreenshots.length} unprocessed screenshots`] : []),
          ...(screenshotsWithData.length < 10 ? ['Need more extracted data for accurate AI training'] : [])
        ]
      }
    });

  } catch (error) {
    console.error('❌ Pipeline diagnosis failed:', error);
    return NextResponse.json({ 
      error: 'Pipeline diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}