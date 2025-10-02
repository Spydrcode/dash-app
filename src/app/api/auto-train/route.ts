// API endpoint to trigger auto-training from existing uploaded data
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { AITrainingSystem } from '../../../lib/ai-training-system';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action !== 'auto_train') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    console.log('🤖 Starting auto-training from existing uploaded data...');

    // Fetch all existing trip screenshots for training
    const { data: screenshots, error: screenshotError } = await supabase
      .from('trip_screenshots')
      .select(`
        id,
        screenshot_type,
        ocr_data,
        extracted_data,
        is_processed,
        created_at
      `)
      .eq('is_processed', true)
      .order('created_at', { ascending: false })
      .limit(200); // Train on most recent 200 screenshots

    if (screenshotError) {
      console.error('Error fetching screenshots:', screenshotError);
      return NextResponse.json({ error: 'Failed to fetch training data' }, { status: 500 });
    }

    // Also fetch trip records
    const { data: trips, error: tripError } = await supabase
      .from('trip_screenshots')
      .select(`
        id,
        trip_data,
        total_profit,
        total_distance,
        created_at,
        trip_screenshots:trip_screenshots(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (tripError) {
      console.log('No trip records found, using screenshots only');
    }

    // Initialize AI trainer and run auto-training
    const aiTrainer = new AITrainingSystem();
    
    // Prepare training data from screenshots
    const trainingData = screenshots?.map(screenshot => ({
      ...screenshot,
      trip_data: screenshot.extracted_data,
      ocr_data: screenshot.ocr_data
    })) || [];

    // Add trip data if available
    if (trips && trips.length > 0) {
      trainingData.push(...trips.map(trip => ({
        ...trip,
        extracted_data: trip.trip_data,
        ocr_data: { raw_text: JSON.stringify(trip.trip_data), extraction_quality: 'MEDIUM' },
        screenshot_type: 'daily_summary',
        is_processed: true
      })));
    }

    console.log(`📊 Training on ${trainingData.length} existing records...`);

    // Run auto-training
    const trainingResult = await aiTrainer.autoTrainFromExistingData(trainingData);
    
    // Calculate training statistics
    const stats = {
      total_records_processed: trainingData.length,
      patterns_learned: trainingResult.patternsLearned,
      rules_adapted: trainingResult.rulesAdapted,
      confidence_improved: trainingResult.confidenceImproved,
      successful_extractions: trainingData.filter(d => 
        d.extracted_data?.driver_earnings > 0 && 
        d.extracted_data?.distance > 0
      ).length,
      training_quality: trainingResult.patternsLearned > 10 ? 'EXCELLENT' :
                      trainingResult.patternsLearned > 5 ? 'GOOD' :
                      trainingResult.patternsLearned > 0 ? 'FAIR' : 'INSUFFICIENT_DATA'
    };

    // Store training results for future reference
    const trainingLog = {
      session_id: `auto_train_${new Date().getTime()}`,
      training_type: 'auto_from_existing',
      records_processed: stats.total_records_processed,
      patterns_learned: stats.patterns_learned,
      rules_adapted: stats.rules_adapted,
      training_timestamp: new Date().toISOString(),
      results: trainingResult
    };

    console.log('✅ Auto-training completed:', stats);

    return NextResponse.json({
      success: true,
      message: 'Auto-training completed from existing data',
      stats,
      training_log: trainingLog,
      recommendations: generateTrainingRecommendations(stats)
    });

  } catch (error) {
    console.error('Error in auto-training:', error);
    return NextResponse.json({ error: 'Auto-training failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get training status and statistics
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get('details') === 'true';

    // Fetch current data quality for training assessment
    const { data: screenshots, error } = await supabase
      .from('trip_screenshots')
      .select('extracted_data, ocr_data, is_processed, created_at')
      .eq('is_processed', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'Failed to assess training data' }, { status: 500 });
    }

    const trainingAssessment = {
      total_screenshots: screenshots?.length || 0,
      with_earnings_data: screenshots?.filter(s => 
        s.extracted_data?.driver_earnings || 
        s.extracted_data?.trip_data?.driver_earnings
      ).length || 0,
      with_distance_data: screenshots?.filter(s => 
        s.extracted_data?.distance || 
        s.extracted_data?.trip_data?.distance
      ).length || 0,
      high_quality_extractions: screenshots?.filter(s => 
        s.ocr_data?.extraction_quality !== 'LOW' &&
        s.extracted_data?.driver_earnings > 0 &&
        s.extracted_data?.distance > 0
      ).length || 0,
      auto_training_readiness: 'READY' // Will calculate based on data quality
    };

    // Calculate readiness score
    const qualityRatio = trainingAssessment.high_quality_extractions / (trainingAssessment.total_screenshots || 1);
    trainingAssessment.auto_training_readiness = 
      qualityRatio > 0.6 ? 'EXCELLENT' :
      qualityRatio > 0.4 ? 'GOOD' :
      qualityRatio > 0.2 ? 'FAIR' : 'NEEDS_MORE_DATA';

    return NextResponse.json({
      success: true,
      assessment: trainingAssessment,
      ready_for_training: trainingAssessment.total_screenshots >= 10,
      recommendations: [
        trainingAssessment.total_screenshots < 10 ? 
          'Upload more screenshots to improve training quality' : null,
        trainingAssessment.with_earnings_data < 5 ? 
          'Need more screenshots with earnings data for better accuracy' : null,
        qualityRatio < 0.3 ? 
          'Consider manual corrections to improve training data quality' : null
      ].filter(Boolean),
      details: includeDetails ? screenshots : undefined
    });

  } catch (error) {
    console.error('Error assessing training readiness:', error);
    return NextResponse.json({ error: 'Assessment failed' }, { status: 500 });
  }
}

// Generate recommendations based on training results
function generateTrainingRecommendations(stats: Record<string, unknown>): string[] {
  const recommendations = [];

  if (stats.training_quality === 'INSUFFICIENT_DATA') {
    recommendations.push('Upload more screenshots to improve AI accuracy');
  }

  if ((stats.successful_extractions as number) < 10) {
    recommendations.push('Focus on uploading clear, high-quality screenshots for better training');
  }

  if ((stats.patterns_learned as number) > 20) {
    recommendations.push('🎉 Excellent training! Your AI should now be much more accurate');
  } else if ((stats.patterns_learned as number) > 10) {
    recommendations.push('✅ Good training progress! Consider uploading a few more screenshots');
  }

  if ((stats.rules_adapted as number) > 2) {
    recommendations.push('📊 Validation rules adapted to your driving patterns - expect more realistic insights');
  }

  return recommendations;
}