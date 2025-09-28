// Test Enhanced Data Validation and AI Agents
// This endpoint tests the new data cleaning and validation system

import { ENHANCED_RIDESHARE_VALIDATION_RULES, EnhancedTripDataValidator } from '@/lib/enhanced-data-validator';
import { SpecializedAICoordinator } from '@/lib/specialized-ai-agents';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing enhanced data validation and AI agents...');

    // Fetch your actual trip data
    const { data: trips, error } = await supabaseAdmin
      .from('trips')
      .select(`
        *,
        trip_screenshots(*)
      `)
      .eq('driver_id', '550e8400-e29b-41d4-a716-446655440000')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!trips || trips.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No trips found for testing'
      });
    }

    // Test 1: Enhanced Data Validation
    const validator = new EnhancedTripDataValidator(ENHANCED_RIDESHARE_VALIDATION_RULES);
    const dataProcessing = validator.processTripsDataset(trips);
    
    console.log('✅ Enhanced validation completed:', dataProcessing.cleaningStats);

    // Test 2: Data Quality Report
    const qualityReport = validator.generateDataQualityReport(trips);
    console.log('📊 Data quality report:', qualityReport);

    // Test 3: Specialized AI Agents (if we have processed trips)
    let aiAnalysis = null;
    if (dataProcessing.processedTrips.length > 0) {
      try {
        const aiCoordinator = new SpecializedAICoordinator();
        
        // Create summary for AI analysis
        const summary = {
          total_trips: dataProcessing.processedTrips.length,
          total_earnings: dataProcessing.processedTrips.reduce((sum, trip) => 
            sum + (trip.trip_data?.driver_earnings || trip.driver_earnings || 0), 0),
          total_distance: dataProcessing.processedTrips.reduce((sum, trip) => 
            sum + (trip.trip_data?.distance || trip.distance || 0), 0),
          total_profit: dataProcessing.processedTrips.reduce((sum, trip) => 
            sum + (trip.trip_data?.profit || trip.profit || 0), 0),
          performance_score: 75
        };

        aiAnalysis = await aiCoordinator.generateEnhancedInsights(
          dataProcessing.processedTrips.slice(0, 20), // Test with first 20 trips
          summary
        );

        console.log('🤖 AI analysis completed successfully');
      } catch (aiError) {
        console.error('⚠️ AI analysis failed:', aiError);
        aiAnalysis = { 
          error: 'AI analysis failed', 
          message: aiError instanceof Error ? aiError.message : 'Unknown AI error'
        };
      }
    }

    // Sample issues for display (first 10)
    const sampleIssues = dataProcessing.issues.slice(0, 10);
    const sampleFixes = dataProcessing.fixes.slice(0, 10);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      test_results: {
        data_processing: {
          original_trips: dataProcessing.cleaningStats.originalCount,
          processed_trips: dataProcessing.cleaningStats.processedCount,
          earnings_fixed: dataProcessing.cleaningStats.earningsFixed,
          estimated_trips: dataProcessing.cleaningStats.estimatedTrips,
          valid_trips: dataProcessing.cleaningStats.validTrips,
          capped_trips: dataProcessing.cleaningStats.cappedTrips
        },
        data_quality: {
          overall_score: qualityReport.overallScore,
          completeness: qualityReport.completeness,
          consistency: qualityReport.consistency,
          accuracy: qualityReport.accuracy,
          recommendations: qualityReport.recommendations
        },
        sample_issues: sampleIssues,
        sample_fixes: sampleFixes,
        ai_analysis: aiAnalysis
      },
      validation_rules_used: {
        max_daily_trips: ENHANCED_RIDESHARE_VALIDATION_RULES.maxDailyTrips,
        max_trip_earnings: ENHANCED_RIDESHARE_VALIDATION_RULES.maxTripEarnings,
        max_trips_per_hour: ENHANCED_RIDESHARE_VALIDATION_RULES.maxTripsPerHour,
        adaptive_enabled: ENHANCED_RIDESHARE_VALIDATION_RULES.enableAdaptiveLimits,
        strict_mode: ENHANCED_RIDESHARE_VALIDATION_RULES.strictMode
      },
      ollama_status: await checkOllamaStatus()
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to check Ollama status
async function checkOllamaStatus(): Promise<any> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        models: data.models?.map((m: any) => m.name) || []
      };
    }
    return { available: false, reason: `HTTP ${response.status}` };
  } catch (error) {
    return { 
      available: false, 
      reason: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}