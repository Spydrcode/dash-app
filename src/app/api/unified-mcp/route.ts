import GPTOnlyAICoordinator from "@/lib/gpt-only-ai-coordinator";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// TypeScript interfaces
interface ReanalysisParams {
  analysisType?: 'daily' | 'weekly' | 'comparison';
  dateRange?: { start: string; end: string };
  options?: Record<string, unknown>;
}

interface TripData {
  id?: string;
  created_at?: string;
  total_distance?: number;
  total_profit?: number;
  total_earnings?: number;
  trip_screenshots?: ScreenshotData[];
  trip_data?: Record<string, unknown>;
  trip_time?: string;
  actual_final_tip?: unknown;
  initial_estimated_tip?: unknown;
  driver_earnings?: unknown;
  distance?: unknown;
  gas_cost?: unknown;
  profit?: unknown;
  [key: string]: unknown;
}

interface ScreenshotData {
  screenshot_type?: string;
  is_processed?: boolean;
  upload_timestamp?: string;
  extracted_data?: Record<string, unknown>;
  [key: string]: unknown;
}



// Interfaces moved inline to reduce unused warnings

// Unified MCP API endpoint for all analytics and reanalysis functions
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'reanalyze':
        return await handleReanalysis(params);
      
      case 'tip_variance':
        return await handleTipVariance(params);
      
      case 'multi_screenshot':
        return await handleMultiScreenshot(params);
      
      case 'combined_analysis':
        return await handleCombinedAnalysis(params);
      
      case 'ai_insights':
        return await handleAIInsights(params);
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Unified MCP API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'API request failed'
    }, { status: 500 });
  }
}

async function handleReanalysis(params: ReanalysisParams): Promise<NextResponse> {
  const { analysisType = 'daily', dateRange, options = {} } = params;

  try {
    const currentDate = new Date();
    let analysisResult: Record<string, unknown> = {};

    // Get trips based on date range or default timeframes
    let startDate: Date;
    let endDate: Date = new Date();

    if (dateRange) {
      startDate = new Date(dateRange.start);
      endDate = new Date(dateRange.end);
    } else {
      switch (analysisType) {
        case 'daily':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          startDate = new Date();
          startDate.setDate(startDate.getDate() - startDate.getDay());
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'comparison':
          // Last 30 days for comparison analysis
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          break;
      }
    }

    // Fetch trips from database
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const { data: trips, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .gte('trip_data->trip_date', startDate.toISOString().split('T')[0])
      .lte('trip_data->trip_date', endDate.toISOString().split('T')[0])
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    // Perform analysis based on type
    switch (analysisType) {
      case 'daily':
        analysisResult = analyzeDailyPerformance(trips || []);
        break;
      case 'weekly':
        analysisResult = analyzeWeeklyPerformance(trips || [], startDate);
        break;
      case 'comparison':
        analysisResult = analyzeComparisonData(trips || []);
        break;
    }

    // Store reanalysis session
    if (supabaseAdmin) {
      await supabaseAdmin.from('reanalysis_sessions').insert({
        analysis_type: analysisType,
        analysis_date: currentDate.toISOString(),
        results: analysisResult,
        parameters: { dateRange, options }
      });
    }

    return NextResponse.json({
      success: true,
      analysis_type: analysisType,
      date_range: { start: startDate.toISOString(), end: endDate.toISOString() },
      trip_count: trips?.length || 0,
      results: analysisResult,
      honda_odyssey_optimized: true
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Reanalysis failed'
    }, { status: 500 });
  }
}

async function handleTipVariance(params: {
  tripId: string | number;
  initialTip?: number;
  finalTip?: number;
}): Promise<NextResponse> {
  const { tripId, initialTip, finalTip } = params;

  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    // Get trip data
    const { data: trip, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error || !trip) {
      throw new Error('Trip not found');
    }

    // Get or calculate tip variance
    const tipVarianceData = calculateTipVariance(
      initialTip || trip.initial_estimated_tip || 0,
      finalTip || trip.actual_final_tip || 0,
      trip
    );

    // Update trip with tip variance data
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('trips')
        .update({
          initial_estimated_tip: initialTip,
          actual_final_tip: finalTip,
          tip_variance: tipVarianceData.variance_amount,
          tip_accuracy: tipVarianceData.accuracy
        })
        .eq('id', tripId);
    }

    return NextResponse.json({
      success: true,
      trip_id: tripId,
      tip_analysis: tipVarianceData,
      honda_odyssey_fuel_adjusted: true
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Tip variance analysis failed'
    }, { status: 500 });
  }
}

async function handleMultiScreenshot(params: {
  tripId: number;
  screenshots: Array<{
    type: 'initial_offer' | 'final_total' | 'navigation';
    filePath: string;
  }>;
}): Promise<NextResponse> {
  const { tripId, screenshots } = params;

  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const screenshotResults = [];

    for (const screenshot of screenshots) {
      // Store screenshot record
      const { data: savedScreenshot, error } = await supabaseAdmin
        .from('trip_screenshots')
        .insert({
          trip_id: tripId,
          screenshot_type: screenshot.type,
          file_path: screenshot.filePath,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to save ${screenshot.type} screenshot:`, error);
        continue;
      }

      screenshotResults.push({
        type: screenshot.type,
        id: savedScreenshot.id,
        status: 'processed'
      });
    }

    // Update trip status based on available screenshots
    await updateTripWorkflowStatus(tripId);

    // If we have both initial and final, run tip variance analysis
    const hasInitial = screenshots.some(s => s.type === 'initial_offer');
    const hasFinal = screenshots.some(s => s.type === 'final_total');
    
    let tipVarianceResult = null;
    if (hasInitial && hasFinal) {
      const tipVarianceResponse = await handleTipVariance({ tripId });
      const tipVarianceData = await tipVarianceResponse.json();
      tipVarianceResult = tipVarianceData.tip_analysis;
    }

    return NextResponse.json({
      success: true,
      trip_id: tripId,
      screenshots_processed: screenshotResults,
      tip_variance: tipVarianceResult,
      workflow_status: hasInitial && hasFinal ? 'complete' : 'in_progress',
      next_steps: getNextWorkflowSteps(screenshots.map(s => s.type))
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Multi-screenshot processing failed'
    }, { status: 500 });
  }
}

async function handleCombinedAnalysis(params: {
  tripId?: number;
  includeReanalysis?: boolean;
  includeTipVariance?: boolean;
  analysisType?: 'daily' | 'weekly' | 'comparison';
}): Promise<NextResponse> {
  const { tripId, includeReanalysis = true, includeTipVariance = true, analysisType = 'daily' } = params;

  try {
    const results: Record<string, unknown> = {};

    // Run reanalysis if requested
    if (includeReanalysis) {
      const reanalysisResponse = await handleReanalysis({ analysisType });
      const reanalysisData = await reanalysisResponse.json();
      results.reanalysis = reanalysisData.results;
    }

    // Run tip variance for specific trip if requested
    if (includeTipVariance && tripId) {
      const tipVarianceResponse = await handleTipVariance({ tripId });
      const tipVarianceData = await tipVarianceResponse.json();
      results.tipVariance = tipVarianceData.tip_analysis;
    }

    // Get trip details if tripId provided
    if (tripId && supabaseAdmin) {
      const { data: trip } = await supabaseAdmin
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();
      
      results.tripDetails = trip;
    }

    // Generate combined insights
    results.combinedInsights = generateCombinedInsights(results);

    return NextResponse.json({
      success: true,
      analysis_components: Object.keys(results),
      results,
      honda_odyssey_optimized: true,
      processing_time: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Combined analysis failed'
    }, { status: 500 });
  }
}

// Helper functions



// _calculateEnhancedPerformanceScore function removed - unused

// Unused function - keeping for potential future use
// function analyzeEnhancedTimePatterns(trips: TripData[]): Record<string, unknown> {



// _analyzeEnhancedTrends function removed - unused

// _generateEnhancedRecommendations function removed - unused

// _generateEnhancedKeyInsights function removed - unused

function analyzeDailyPerformance(trips: TripData[]): Record<string, unknown> {
  if (trips.length === 0) {
    return {
      total_trips: 0,
      total_earnings: 0,
      total_distance: 0,
      total_fuel_cost: 0,
      total_profit: 0,
      honda_odyssey_mpg: 19,
      recommendations: ['No trips found for analysis']
    };
  }

  const totalTrips = trips.length;
  const totalEarnings = trips.reduce((sum, trip) => sum + (typeof trip.driver_earnings === 'number' ? trip.driver_earnings : 0), 0);
  const totalDistance = trips.reduce((sum, trip) => sum + (typeof trip.distance === 'number' ? trip.distance : 0), 0);
  const totalFuelCost = trips.reduce((sum, trip) => sum + (typeof trip.gas_cost === 'number' ? trip.gas_cost : 0), 0);
  const totalProfit = trips.reduce((sum, trip) => sum + (typeof trip.profit === 'number' ? trip.profit : 0), 0);

  return {
    total_trips: totalTrips,
    total_earnings: totalEarnings,
    total_distance: totalDistance,
    average_fare: totalEarnings / totalTrips,
    total_fuel_cost: totalFuelCost,
    total_profit: totalProfit,
    profit_margin: totalEarnings > 0 ? (totalProfit / totalEarnings) * 100 : 0,
    honda_odyssey_efficiency: totalFuelCost > 0 ? totalDistance / (totalFuelCost / 3.50) : 19,
    earnings_per_mile: totalDistance > 0 ? totalEarnings / totalDistance : 0,
    fuel_efficiency_rating: getFuelEfficiencyRating(totalDistance, totalFuelCost),
    recommendations: generateDailyRecommendations(totalProfit, totalDistance, totalFuelCost)
  };
}

function analyzeWeeklyPerformance(trips: TripData[], weekStart: Date): Record<string, unknown> {
  const dailyBreakdown: Record<string, Record<string, unknown>> = {};
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group trips by day
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(weekStart);
    currentDay.setDate(weekStart.getDate() + i);
    const dayStr = currentDay.toISOString().split('T')[0];
    const dayName = days[i];
    
    const dayTrips = trips.filter(trip => trip.trip_data?.trip_date === dayStr);
    dailyBreakdown[dayName] = analyzeDailyPerformance(dayTrips);
  }

  const weekTotals = analyzeDailyPerformance(trips);
  const bestDay = findBestPerformingDay(dailyBreakdown);

  return {
    week_start: weekStart.toISOString().split('T')[0],
    daily_breakdown: dailyBreakdown,
    week_totals: weekTotals,
    best_day: bestDay,
    trends: analyzeWeeklyTrends(dailyBreakdown),
    honda_odyssey_weekly_efficiency: weekTotals.honda_odyssey_efficiency
  };
}

function analyzeComparisonData(trips: TripData[]): Record<string, unknown> {
  // Group trips by day of week for comparison
  const dayGroups: Record<string, TripData[]> = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  };

  trips.forEach(trip => {
    const tripDate = new Date((trip.trip_data?.trip_date as string) || (trip.created_at as string));
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tripDate.getDay()];
    dayGroups[dayName].push(trip);
  });

  const dayAnalysis: Record<string, unknown> = {};
  for (const [day, dayTrips] of Object.entries(dayGroups)) {
    dayAnalysis[day] = analyzeDailyPerformance(dayTrips);
  }

  return {
    comparison_type: 'day_of_week',
    day_analysis: dayAnalysis,
    best_performance_day: findBestPerformingDay(dayAnalysis),
    optimization_opportunities: identifyOptimizationOpportunities(dayAnalysis),
    honda_odyssey_comparison: compareHondaOdysseyPerformance(dayAnalysis)
  };
}

function calculateTipVariance(initialTip: number, finalTip: number, trip: TripData): Record<string, unknown> {
  const varianceAmount = finalTip - initialTip;
  const variancePercent = initialTip > 0 ? (varianceAmount / initialTip) * 100 : 0;
  
  let accuracy: string;
  if (Math.abs(variancePercent) <= 10) accuracy = 'excellent';
  else if (Math.abs(variancePercent) <= 25) accuracy = 'good';
  else if (Math.abs(variancePercent) <= 50) accuracy = 'fair';
  else accuracy = 'poor';

  return {
    initial_estimated_tip: initialTip,
    actual_final_tip: finalTip,
    variance_amount: varianceAmount,
    variance_percent: variancePercent,
    accuracy,
    tip_performance: varianceAmount > 0 ? 'better_than_expected' : 'lower_than_expected',
    fuel_adjusted_profit: ((trip as Record<string, unknown>).trip_data as Record<string, unknown>)?.profit as number || (trip as Record<string, unknown>).total_profit as number || 0,
    recommendations: getTipVarianceRecommendations(accuracy, variancePercent)
  };
}

async function updateTripWorkflowStatus(tripId: number): Promise<void> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return;
  }

  // Check what screenshots we have
  const { data: screenshots } = await supabaseAdmin
    .from('trip_screenshots')
    .select('screenshot_type')
    .eq('trip_id', tripId);

  const types = screenshots?.map(s => s.screenshot_type) || [];
  
  let status = 'initial_screenshot';
  if (types.includes('initial_offer') && types.includes('final_total')) {
    status = 'complete_workflow';
  } else if (types.includes('final_total')) {
    status = 'final_screenshot';
  }

  await supabaseAdmin
    .from('trips')
    .update({ trip_status: status })
    .eq('id', tripId);
}

function getNextWorkflowSteps(screenshotTypes: string[]): string[] {
  const hasInitial = screenshotTypes.includes('initial_offer');
  const hasFinal = screenshotTypes.includes('final_total');
  const hasNavigation = screenshotTypes.includes('navigation');

  const nextSteps: string[] = [];

  if (!hasInitial) {
    nextSteps.push('Upload initial offer screenshot');
  }
  if (!hasFinal) {
    nextSteps.push('Upload final total screenshot after trip completion');
  }
  if (!hasNavigation) {
    nextSteps.push('Upload navigation screenshot for route analysis');
  }
  if (hasInitial && hasFinal) {
    nextSteps.push('Tip variance analysis complete - review insights');
  }

  return nextSteps.length > 0 ? nextSteps : ['All screenshots uploaded - workflow complete'];
}

function generateCombinedInsights(results: Record<string, unknown>): Record<string, unknown> {
  const insights: Record<string, unknown> = {
    overall_score: 75, // Default score
    key_findings: [],
    action_items: []
  };

  // Analyze reanalysis results
  if (results.reanalysis) {
    if ((results.reanalysis as Record<string, unknown>).profit_margin as number > 50) {
      (insights.key_findings as string[]).push('Excellent profit margins detected in recent performance');
    }
    if ((results.reanalysis as Record<string, unknown>).honda_odyssey_efficiency as number < 17) {
      (insights.action_items as string[]).push('Honda Odyssey fuel efficiency below optimal - consider route optimization');
    }
  }

  // Analyze tip variance results
  if (results.tipVariance) {
    if ((results.tipVariance as Record<string, unknown>).accuracy === 'excellent') {
      (insights.key_findings as string[]).push('Tip estimation accuracy is excellent');
    } else if ((results.tipVariance as Record<string, unknown>).accuracy === 'poor') {
      (insights.action_items as string[]).push('Review tip estimation strategy - significant variance detected');
    }
  }

  return insights;
}

function getFuelEfficiencyRating(distance: number, fuelCost: number): string {
  if (fuelCost === 0) return 'no_data';
  
  const mpg = distance / (fuelCost / 3.50); // Assuming $3.50/gallon
  const odysseyRatedMPG = 19;

  if (mpg >= odysseyRatedMPG) return 'excellent';
  if (mpg >= 17) return 'good';
  if (mpg >= 15) return 'fair';
  return 'needs_improvement';
}

function generateDailyRecommendations(profit: number, distance: number, fuelCost: number): string[] {
  const recommendations: string[] = [];

  if (profit < 50) {
    recommendations.push('Consider targeting higher-value trips to increase daily profit');
  }
  if (distance > 100) {
    recommendations.push('High mileage day - monitor Honda Odyssey maintenance needs');
  }
  if (fuelCost > 20) {
    recommendations.push('High fuel costs - consider route optimization and fuel-efficient driving');
  }
  if (recommendations.length === 0) {
    recommendations.push('Excellent performance day - maintain current strategies');
  }

  return recommendations;
}

function findBestPerformingDay(dayAnalysis: Record<string, unknown>): string {
  let bestDay = '';
  let bestProfit = -1;

  for (const [day, analysis] of Object.entries(dayAnalysis)) {
    if ((analysis as Record<string, unknown>).total_profit as number > bestProfit) {
      bestProfit = (analysis as Record<string, unknown>).total_profit as number;
      bestDay = day;
    }
  }

  return bestDay;
}

function analyzeWeeklyTrends(dailyBreakdown: Record<string, unknown>): Record<string, unknown> {
  const profits = Object.values(dailyBreakdown).map((day) => {
    const dayRecord = day as Record<string, unknown>;
    return typeof dayRecord.total_profit === 'number' ? dayRecord.total_profit : 0;
  });
  const earnings = Object.values(dailyBreakdown).map((day) => {
    const dayRecord = day as Record<string, unknown>;
    return typeof dayRecord.total_earnings === 'number' ? dayRecord.total_earnings : 0;
  });

  return {
    profit_trend: calculateTrend(profits),
    earnings_trend: calculateTrend(earnings),
    consistency_score: calculateConsistency(profits),
    honda_odyssey_performance: 'optimal'
  };
}

function calculateTrend(values: number[]): string {
  if (values.length < 2) return 'insufficient_data';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (secondAvg > firstAvg * 1.1) return 'improving';
  if (secondAvg < firstAvg * 0.9) return 'declining';
  return 'stable';
}

function calculateConsistency(values: number[]): number {
  if (values.length === 0) return 0;
  
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return 0;
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, 100 - (stdDev / avg) * 100);
}

function identifyOptimizationOpportunities(dayAnalysis: Record<string, unknown>): string[] {
  const opportunities: string[] = [];
  
  const dayProfits = Object.entries(dayAnalysis).map(([day, analysis]) => ({
    day,
    profit: ((analysis as Record<string, unknown>).total_profit as number) || 0
  }));

  const bestDay = dayProfits.reduce((max, current) => current.profit > max.profit ? current : max);
  const worstDay = dayProfits.reduce((min, current) => current.profit < min.profit ? current : min);

  if (bestDay.profit > worstDay.profit * 2) {
    opportunities.push(`Focus more driving time on ${bestDay.day} for better profitability`);
  }

  return opportunities;
}

function compareHondaOdysseyPerformance(dayAnalysis: Record<string, unknown>): Record<string, unknown> {
  const avgEfficiency = Object.values(dayAnalysis)
    .map((day) => {
      const dayRecord = day as Record<string, unknown>;
      return typeof dayRecord.honda_odyssey_efficiency === 'number' ? dayRecord.honda_odyssey_efficiency : 19;
    })
    .reduce((sum, eff) => sum + eff, 0) / Object.keys(dayAnalysis).length;

  return {
    average_mpg: avgEfficiency,
    rated_mpg: 19,
    performance_vs_rated: avgEfficiency >= 19 ? 'above_rated' : 'below_rated',
    efficiency_score: Math.min(100, (avgEfficiency / 19) * 100)
  };
}

async function handleAIInsights(params: {
  timeframe?: 'all' | 'today' | 'week' | 'month' | 'custom';
  dateRange?: { start: string; end: string };
  includeProjections?: boolean;
  includeTrends?: boolean;
}): Promise<NextResponse> {
  const { timeframe = 'all' } = params;

  try {
    console.log(`🤖 GPT-ONLY AI INSIGHTS: Generating insights for timeframe: ${timeframe}`);

    // Initialize GPT-Only AI Coordinator
    const gptCoordinator = new GPTOnlyAICoordinator();

    // Get current cumulative insights (no expensive reprocessing)
    const insights = await gptCoordinator.getCurrentInsights();

    if (insights.error) {
      throw new Error((insights.error as string) || 'Unknown error occurred');
    }

    console.log(`📊 GPT Insights Retrieved: ${((insights.summary as Record<string, unknown>)?.total_trips as number || 0)} trips, $${(((insights.summary as Record<string, unknown>)?.total_earnings as number || 0).toFixed(2))} earnings`);

    return NextResponse.json({
      success: true,
      timeframe: ((insights.summary as Record<string, unknown>)?.timeframe as string || timeframe),
      date_range: {
        start: 'cumulative_data',
        end: new Date().toISOString().split('T')[0]
      },
      trip_count: ((insights.summary as Record<string, unknown>)?.total_trips as number || 0),
      screenshot_count: insights.screenshots_processed || 0,
      summary: insights.summary,
      performance_breakdown: insights.performance_breakdown,
      time_analysis: insights.time_analysis,
      gpt_insights: insights.ai_insights,
      key_insights: [
        ((insights.ai_insights as Record<string, unknown>)?.key_insights as string || 'GPT analysis available'),
        `Performance Score: ${((insights.summary as Record<string, unknown>)?.performance_score as number || 0)}/100`,
        `Token Usage: ${((insights.token_usage as Record<string, unknown>)?.total_30day_tokens as number || 0)} tokens in 30 days`
      ],
      ai_recommendations: ((insights.ai_insights as Record<string, unknown>)?.recommendations as string[] || ['Continue uploading screenshots for better insights']),
      token_usage: insights.token_usage,
      gpt_only_system: true,
      model_info: {
        vision_model: 'gpt-4o',
        insights_model: 'gpt-4-turbo',
        caching_enabled: true,
        local_models_removed: true
      },
      last_updated: insights.last_updated,
      cumulative_insights: true
    });

  } catch (error) {
    console.error('❌ GPT-Only AI insights error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'GPT AI insights generation failed',
      fallback_available: true,
      recommendation: 'Check OpenAI API key and try again'
    }, { status: 500 });
  }
}

// Unused functions removed to fix linting errors







// _generateProjections function removed - unused









function getTipVarianceRecommendations(accuracy: string, variancePercent: number): string[] {
  const recommendations: string[] = [];
  
  if (accuracy === 'poor') {
    recommendations.push('Review tip estimation strategy');
    recommendations.push('Analyze trip characteristics that affect tipping');
  }
  
  if (variancePercent < -25) {
    recommendations.push('Consider factors that may reduce tip amounts');
    recommendations.push('Focus on service quality improvements');
  }
  
  if (variancePercent > 25) {
    recommendations.push('Identify trip patterns that generate higher tips');
    recommendations.push('Replicate successful service approaches');
  }

  return recommendations;
}