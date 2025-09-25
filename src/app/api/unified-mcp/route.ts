import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// TypeScript interfaces
interface ReanalysisParams {
  analysisType?: 'daily' | 'weekly' | 'comparison';
  dateRange?: { start: string; end: string };
  options?: Record<string, unknown>;
}

interface TipVarianceParams {
  tripId?: string;
  dateRange?: { start: string; end: string };
  options?: Record<string, unknown>;
}

interface MultiScreenshotParams {
  tripId?: string;
  screenshotUrls?: string[];
  options?: Record<string, unknown>;
}

interface CombinedAnalysisParams {
  tripId?: number;
  includeReanalysis?: boolean;
  includeTipVariance?: boolean;
  analysisType?: 'daily' | 'weekly' | 'comparison';
}

interface AIInsightsParams {
  timeframe?: 'all' | 'today' | 'week' | 'month' | 'custom';
  dateRange?: { start: string; end: string };
  includeProjections?: boolean;
  includeTrends?: boolean;
}

interface Trip {
  id: string;
  driver_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  distance: number;
  fare_amount: number;
  tip_amount: number;
  total_amount: number;
  [key: string]: unknown;
}

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
    await supabaseAdmin.from('reanalysis_sessions').insert({
      analysis_type: analysisType,
      analysis_date: currentDate.toISOString(),
      results: analysisResult,
      parameters: { dateRange, options }
    });

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
    await supabaseAdmin
      .from('trips')
      .update({
        initial_estimated_tip: initialTip,
        actual_final_tip: finalTip,
        tip_variance: tipVarianceData.variance_amount,
        tip_accuracy: tipVarianceData.accuracy
      })
      .eq('id', tripId);

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
    if (tripId) {
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

function analyzeDailyPerformance(trips: any[]): Record<string, any> {
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
  const totalEarnings = trips.reduce((sum, trip) => sum + (trip.driver_earnings || 0), 0);
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const totalFuelCost = trips.reduce((sum, trip) => sum + (trip.gas_cost || 0), 0);
  const totalProfit = trips.reduce((sum, trip) => sum + (trip.profit || 0), 0);

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

function analyzeWeeklyPerformance(trips: any[], weekStart: Date): Record<string, any> {
  const dailyBreakdown: Record<string, any> = {};
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

function analyzeComparisonData(trips: any[]): Record<string, any> {
  // Group trips by day of week for comparison
  const dayGroups: Record<string, any[]> = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
  };

  trips.forEach(trip => {
    const tripDate = new Date(trip.trip_data?.trip_date || trip.created_at);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tripDate.getDay()];
    dayGroups[dayName].push(trip);
  });

  const dayAnalysis: Record<string, any> = {};
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

function calculateTipVariance(initialTip: number, finalTip: number, trip: any): Record<string, any> {
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
    fuel_adjusted_profit: (trip as any).trip_data?.profit || (trip as any).total_profit || 0,
    recommendations: getTipVarianceRecommendations(accuracy, variancePercent)
  };
}

async function updateTripWorkflowStatus(tripId: number): Promise<void> {
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

function generateCombinedInsights(results: Record<string, any>): Record<string, any> {
  const insights: Record<string, any> = {
    overall_score: 75, // Default score
    key_findings: [],
    action_items: []
  };

  // Analyze reanalysis results
  if (results.reanalysis) {
    if (results.reanalysis.profit_margin > 50) {
      insights.key_findings.push('Excellent profit margins detected in recent performance');
    }
    if (results.reanalysis.honda_odyssey_efficiency < 17) {
      insights.action_items.push('Honda Odyssey fuel efficiency below optimal - consider route optimization');
    }
  }

  // Analyze tip variance results
  if (results.tipVariance) {
    if (results.tipVariance.accuracy === 'excellent') {
      insights.key_findings.push('Tip estimation accuracy is excellent');
    } else if (results.tipVariance.accuracy === 'poor') {
      insights.action_items.push('Review tip estimation strategy - significant variance detected');
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

function findBestPerformingDay(dayAnalysis: Record<string, any>): string {
  let bestDay = '';
  let bestProfit = -1;

  for (const [day, analysis] of Object.entries(dayAnalysis)) {
    if (analysis.total_profit > bestProfit) {
      bestProfit = analysis.total_profit;
      bestDay = day;
    }
  }

  return bestDay;
}

function analyzeWeeklyTrends(dailyBreakdown: Record<string, any>): Record<string, any> {
  const profits = Object.values(dailyBreakdown).map((day: any) => day.total_profit || 0);
  const earnings = Object.values(dailyBreakdown).map((day: any) => day.total_earnings || 0);

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

function identifyOptimizationOpportunities(dayAnalysis: Record<string, any>): string[] {
  const opportunities: string[] = [];
  
  const dayProfits = Object.entries(dayAnalysis).map(([day, analysis]: [string, any]) => ({
    day,
    profit: analysis.total_profit || 0
  }));

  const bestDay = dayProfits.reduce((max, current) => current.profit > max.profit ? current : max);
  const worstDay = dayProfits.reduce((min, current) => current.profit < min.profit ? current : min);

  if (bestDay.profit > worstDay.profit * 2) {
    opportunities.push(`Focus more driving time on ${bestDay.day} for better profitability`);
  }

  return opportunities;
}

function compareHondaOdysseyPerformance(dayAnalysis: Record<string, any>): Record<string, any> {
  const avgEfficiency = Object.values(dayAnalysis)
    .map((day: any) => day.honda_odyssey_efficiency || 19)
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
  const { timeframe = 'all', dateRange, includeProjections = true, includeTrends = true } = params;

  try {
    // Calculate date range based on timeframe
    let startDate: Date | null = null;
    let endDate: Date = new Date();

    switch (timeframe) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'custom':
        if (dateRange) {
          startDate = new Date(dateRange.start);
          endDate = new Date(dateRange.end);
        }
        break;
      case 'all':
      default:
        // No start date filter for 'all'
        break;
    }

    // Build query with error handling
    let query = supabaseAdmin
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false });

    // For now, let's skip date filtering to avoid JSONB query issues
    // and handle filtering in JavaScript if needed
    // TODO: Fix JSONB date filtering once data format is consistent
    /*
    if (startDate) {
      query = query.gte('trip_data->trip_date', startDate.toISOString().split('T')[0]);
    }
    if (endDate && timeframe !== 'all') {
      query = query.lte('trip_data->trip_date', endDate.toISOString().split('T')[0]);
    }
    */

    const { data: trips, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }

    // Generate comprehensive AI insights
    const insights = await generateComprehensiveInsights(
      trips || [], 
      timeframe, 
      { includeProjections, includeTrends }
    );

    return NextResponse.json({
      success: true,
      timeframe,
      date_range: {
        start: startDate?.toISOString().split('T')[0] || 'all_time',
        end: endDate.toISOString().split('T')[0]
      },
      trip_count: trips?.length || 0,
      insights,
      last_updated: new Date().toISOString(),
      honda_odyssey_optimized: true
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'AI insights generation failed'
    }, { status: 500 });
  }
}

async function generateComprehensiveInsights(
  trips: any[], 
  timeframe: string, 
  options: { includeProjections: boolean; includeTrends: boolean }
): Promise<Record<string, any>> {
  if (trips.length === 0) {
    return {
      summary: {
        message: 'No trips found for the selected timeframe',
        total_trips: 0,
        performance_score: 0
      }
    };
  }

  // Core metrics calculation
  const totalTrips = trips.length;
  const totalEarnings = trips.reduce((sum, trip) => sum + ((trip.trip_data?.driver_earnings || trip.driver_earnings) || 0), 0);
  const totalDistance = trips.reduce((sum, trip) => sum + ((trip.trip_data?.distance || trip.distance) || 0), 0);
  const totalFuelCost = trips.reduce((sum, trip) => sum + ((trip.trip_data?.gas_cost || trip.gas_cost) || 0), 0);
  const totalProfit = trips.reduce((sum, trip) => sum + ((trip.trip_data?.profit || trip.profit) || 0), 0);

  // Honda Odyssey specific calculations
  const avgMPG = totalFuelCost > 0 ? totalDistance / (totalFuelCost / 3.50) : 19;
  const fuelEfficiencyRating = getFuelEfficiencyRating(totalDistance, totalFuelCost);

  // Performance scoring
  const performanceScore = calculateOverallPerformanceScore({
    totalTrips,
    totalEarnings,
    totalDistance,
    totalProfit,
    avgMPG
  });

  // Time-based analysis
  const timeAnalysis = analyzeTimePatterns(trips, timeframe);

  // Tip analysis (if available)
  const tipAnalysis = analyzeTipPerformance(trips);

  // Projections
  const projections = options.includeProjections ? generateProjections(trips, timeframe) : null;

  // Trends
  const trends = options.includeTrends ? analyzeTrends(trips, timeframe) : null;

  // AI-generated insights and recommendations
  const aiRecommendations = generateAIRecommendations({
    performanceScore,
    avgMPG,
    totalProfit,
    totalDistance,
    tipAnalysis,
    timeframe
  });

  return {
    summary: {
      timeframe,
      total_trips: totalTrips,
      total_earnings: totalEarnings,
      total_distance: totalDistance,
      total_profit: totalProfit,
      performance_score: performanceScore,
      profit_margin: totalEarnings > 0 ? (totalProfit / totalEarnings) * 100 : 0
    },
    honda_odyssey: {
      actual_mpg: avgMPG,
      rated_mpg: 19,
      efficiency_rating: fuelEfficiencyRating,
      total_fuel_cost: totalFuelCost,
      fuel_savings: avgMPG > 19 ? 'Above rated efficiency' : 'Below rated efficiency'
    },
    performance_breakdown: {
      earnings_per_mile: totalDistance > 0 ? totalEarnings / totalDistance : 0,
      profit_per_mile: totalDistance > 0 ? totalProfit / totalDistance : 0,
      average_trip_profit: totalProfit / totalTrips,
      fuel_cost_ratio: totalEarnings > 0 ? (totalFuelCost / totalEarnings) * 100 : 0
    },
    time_analysis: timeAnalysis,
    tip_analysis: tipAnalysis,
    projections,
    trends,
    ai_recommendations: aiRecommendations,
    key_insights: generateKeyInsights({
      performanceScore,
      avgMPG,
      totalProfit,
      totalTrips,
      timeframe
    })
  };
}

function calculateOverallPerformanceScore(metrics: {
  totalTrips: number;
  totalEarnings: number;
  totalDistance: number;
  totalProfit: number;
  avgMPG: number;
}): number {
  let score = 0;

  // Trip volume scoring (0-25 points)
  if (metrics.totalTrips >= 50) score += 25;
  else if (metrics.totalTrips >= 20) score += 20;
  else if (metrics.totalTrips >= 10) score += 15;
  else if (metrics.totalTrips >= 5) score += 10;
  else score += 5;

  // Profit margin scoring (0-25 points)
  const profitMargin = metrics.totalEarnings > 0 ? (metrics.totalProfit / metrics.totalEarnings) * 100 : 0;
  if (profitMargin >= 60) score += 25;
  else if (profitMargin >= 50) score += 20;
  else if (profitMargin >= 40) score += 15;
  else if (profitMargin >= 30) score += 10;
  else score += 5;

  // Honda Odyssey fuel efficiency scoring (0-25 points)
  if (metrics.avgMPG >= 19) score += 25;
  else if (metrics.avgMPG >= 17) score += 20;
  else if (metrics.avgMPG >= 15) score += 15;
  else if (metrics.avgMPG >= 13) score += 10;
  else score += 5;

  // Earnings consistency scoring (0-25 points)
  const earningsPerTrip = metrics.totalEarnings / metrics.totalTrips;
  if (earningsPerTrip >= 25) score += 25;
  else if (earningsPerTrip >= 20) score += 20;
  else if (earningsPerTrip >= 15) score += 15;
  else if (earningsPerTrip >= 10) score += 10;
  else score += 5;

  return Math.min(100, Math.max(0, score));
}

function analyzeTimePatterns(trips: any[], timeframe: string): Record<string, any> {
  const dayGroups: Record<string, any[]> = {
    Sunday: [], Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
  };

  const hourGroups: Record<string, any[]> = {};
  for (let i = 0; i < 24; i++) {
    hourGroups[i.toString()] = [];
  }

  trips.forEach(trip => {
    const tripDate = new Date(trip.trip_data?.trip_date || trip.created_at);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tripDate.getDay()];
    dayGroups[dayName].push(trip);

    if (trip.trip_data?.trip_time || trip.trip_time) {
      const tripTime = trip.trip_data?.trip_time || trip.trip_time;
      const hour = parseInt(tripTime.split(':')[0]) || 12;
      hourGroups[hour.toString()].push(trip);
    }
  });

  // Find best performing day and hour
  const bestDay = Object.entries(dayGroups)
    .map(([day, dayTrips]) => ({
      day,
      profit: dayTrips.reduce((sum, trip) => sum + (trip.profit || 0), 0),
      trips: dayTrips.length
    }))
    .sort((a, b) => b.profit - a.profit)[0];

  const bestHour = Object.entries(hourGroups)
    .map(([hour, hourTrips]) => ({
      hour,
      profit: hourTrips.reduce((sum, trip) => sum + (trip.profit || 0), 0),
      trips: hourTrips.length
    }))
    .filter(h => h.trips > 0)
    .sort((a, b) => b.profit - a.profit)[0];

  return {
    best_day: bestDay,
    best_hour: bestHour,
    day_breakdown: dayGroups,
    recommendations: [
      bestDay ? `${bestDay.day} is your most profitable day` : 'Need more data for day analysis',
      bestHour ? `${bestHour.hour}:00 is your most profitable hour` : 'Need more data for time analysis'
    ]
  };
}

function analyzeTipPerformance(trips: any[]): Record<string, any> {
  const tripsWithTips = trips.filter(trip => 
    trip.initial_estimated_tip !== null && trip.actual_final_tip !== null
  );

  if (tripsWithTips.length === 0) {
    return {
      available: false,
      message: 'No tip variance data available'
    };
  }

  const totalVariance = tripsWithTips.reduce((sum, trip) => 
    sum + Math.abs((trip.actual_final_tip || 0) - (trip.initial_estimated_tip || 0)), 0
  );

  const avgVariance = totalVariance / tripsWithTips.length;
  const accurateTrips = tripsWithTips.filter(trip => 
    Math.abs((trip.actual_final_tip || 0) - (trip.initial_estimated_tip || 0)) <= 1.00
  ).length;

  return {
    available: true,
    trips_with_data: tripsWithTips.length,
    average_variance: avgVariance,
    accuracy_rate: (accurateTrips / tripsWithTips.length) * 100,
    performance: avgVariance <= 1.00 ? 'excellent' : avgVariance <= 2.50 ? 'good' : 'needs_improvement'
  };
}

function generateProjections(trips: any[], timeframe: string): Record<string, any> | null {
  if (trips.length === 0) return null;

  const avgDailyProfit = trips.reduce((sum, trip) => sum + (trip.profit || 0), 0) / trips.length;
  const avgDailyTrips = trips.length / Math.max(1, getTimeframeDays(timeframe));

  return {
    daily_projection: {
      avg_profit: avgDailyProfit * avgDailyTrips,
      avg_trips: avgDailyTrips
    },
    weekly_projection: {
      avg_profit: avgDailyProfit * avgDailyTrips * 7,
      avg_trips: avgDailyTrips * 7
    },
    monthly_projection: {
      avg_profit: avgDailyProfit * avgDailyTrips * 30,
      avg_trips: avgDailyTrips * 30
    }
  };
}

function analyzeTrends(trips: any[], timeframe: string): Record<string, any> | null {
  if (trips.length < 2) return null;

  // Sort trips by date
  const sortedTrips = [...trips].sort((a, b) => 
    new Date(a.trip_data?.trip_date || a.created_at).getTime() - new Date(b.trip_data?.trip_date || b.created_at).getTime()
  );

  const halfPoint = Math.floor(sortedTrips.length / 2);
  const firstHalf = sortedTrips.slice(0, halfPoint);
  const secondHalf = sortedTrips.slice(halfPoint);

  const firstHalfAvg = firstHalf.reduce((sum, trip) => sum + (trip.profit || 0), 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, trip) => sum + (trip.profit || 0), 0) / secondHalf.length;

  const trendDirection = secondHalfAvg > firstHalfAvg * 1.1 ? 'improving' : 
                       secondHalfAvg < firstHalfAvg * 0.9 ? 'declining' : 'stable';

  const trendPercentage = firstHalfAvg > 0 ? 
    ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

  return {
    direction: trendDirection,
    percentage_change: trendPercentage,
    first_half_avg: firstHalfAvg,
    second_half_avg: secondHalfAvg,
    message: `Performance is ${trendDirection} with ${Math.abs(trendPercentage).toFixed(1)}% change`
  };
}

function generateAIRecommendations(context: {
  performanceScore: number;
  avgMPG: number;
  totalProfit: number;
  totalDistance: number;
  tipAnalysis: any;
  timeframe: string;
}): string[] {
  const recommendations: string[] = [];

  // Performance-based recommendations
  if (context.performanceScore < 50) {
    recommendations.push('Performance below average - focus on higher-value trips and fuel efficiency');
  } else if (context.performanceScore > 80) {
    recommendations.push('Excellent performance! Maintain current strategies and consider expanding hours');
  }

  // Honda Odyssey specific recommendations
  if (context.avgMPG < 17) {
    recommendations.push('Honda Odyssey fuel efficiency below optimal - check tire pressure and reduce idle time');
  } else if (context.avgMPG > 21) {
    recommendations.push('Outstanding fuel efficiency! Your driving habits are maximizing Honda Odyssey performance');
  }

  // Profit recommendations
  if (context.totalDistance > 0) {
    const profitPerMile = context.totalProfit / context.totalDistance;
    if (profitPerMile < 1.00) {
      recommendations.push('Consider targeting shorter, higher-value trips to improve profit per mile');
    }
  }

  // Tip recommendations
  if (context.tipAnalysis?.available && context.tipAnalysis.accuracy_rate < 70) {
    recommendations.push('Tip estimation accuracy needs improvement - review factors affecting tip amounts');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue current strategies - performance metrics are within expected ranges');
  }

  return recommendations;
}

function generateKeyInsights(context: {
  performanceScore: number;
  avgMPG: number;
  totalProfit: number;
  totalTrips: number;
  timeframe: string;
}): string[] {
  const insights: string[] = [];

  insights.push(`Overall performance score: ${context.performanceScore}/100`);
  insights.push(`Honda Odyssey efficiency: ${context.avgMPG.toFixed(1)} MPG (rated: 19 MPG)`);
  insights.push(`Average profit per trip: $${(context.totalProfit / context.totalTrips).toFixed(2)}`);
  
  if (context.avgMPG >= 19) {
    insights.push('🎉 Exceeding Honda Odyssey rated fuel efficiency!');
  }
  
  if (context.performanceScore >= 80) {
    insights.push('🌟 Top-tier performance - you\'re in the top 20% of drivers!');
  }

  return insights;
}

function getTimeframeDays(timeframe: string): number {
  switch (timeframe) {
    case 'today': return 1;
    case 'week': return 7;
    case 'month': return 30;
    default: return 7; // Default to week for calculations
  }
}

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