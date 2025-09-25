import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

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

async function handleReanalysis(params: {
  analysisType?: 'daily' | 'weekly' | 'comparison';
  dateRange?: { start: string; end: string };
  options?: Record<string, any>;
}): Promise<NextResponse> {
  const { analysisType = 'daily', dateRange, options = {} } = params;

  try {
    const currentDate = new Date();
    let analysisResult: Record<string, any> = {};

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
      .gte('trip_date', startDate.toISOString().split('T')[0])
      .lte('trip_date', endDate.toISOString().split('T')[0])
      .order('trip_date', { ascending: false });

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
  tripId: number;
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
    const results: Record<string, any> = {};

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
    
    const dayTrips = trips.filter(trip => trip.trip_date === dayStr);
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
    const tripDate = new Date(trip.trip_date);
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
    fuel_adjusted_profit: trip.profit || 0,
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