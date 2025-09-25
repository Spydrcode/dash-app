import { supabaseAdmin, type TripData } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Enhanced MCP Analytics for reanalysis with time-based insights
class AdvancedAnalyticsMCP {
  private vehicleDatabase: Record<string, { mpg: number; year: number; cityMpg: number; highwayMpg: number }> = {
    "2003 Honda Odyssey": { mpg: 19, year: 2003, cityMpg: 16, highwayMpg: 23 }
  };

  async reanalyzeTrips(trips: any[], timeframe: string, analysisType: 'daily' | 'weekly' | 'custom' | 'comparison'): Promise<{
    success: boolean;
    results?: any;
    error?: string;
  }> {
    try {
      console.log(`Starting ${analysisType} reanalysis for ${trips.length} trips over ${timeframe}`);

      const enhancedTrips = trips.map(trip => this.enhanceTripWithAdvancedMetrics(trip));
      
      let analysisResults;
      
      switch (analysisType) {
        case 'daily':
          analysisResults = await this.performDailyAnalysis(enhancedTrips);
          break;
        case 'weekly':
          analysisResults = await this.performWeeklyAnalysis(enhancedTrips);
          break;
        case 'comparison':
          analysisResults = await this.performComparisonAnalysis(enhancedTrips);
          break;
        default:
          analysisResults = await this.performCustomAnalysis(enhancedTrips, timeframe);
      }

      return {
        success: true,
        results: {
          timeframe,
          analysis_type: analysisType,
          trips_analyzed: trips.length,
          ...analysisResults,
          reanalysis_timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Reanalysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reanalysis failed'
      };
    }
  }

  private enhanceTripWithAdvancedMetrics(trip: any) {
    const tripData = trip.trip_data || {};
    const dayOfWeek = new Date(trip.created_at).toLocaleDateString('en-US', { weekday: 'long' });
    const hour = new Date(trip.created_at).getHours();
    
    // Enhanced metrics
    const profitPerMile = (trip.total_profit || 0) / (tripData.distance || 1);
    const profitPerHour = this.calculateHourlyRate(tripData);
    const gasEfficiency = (trip.gas_cost || 0) / (trip.total_profit || 1);
    
    return {
      ...trip,
      enhanced_metrics: {
        day_of_week: dayOfWeek,
        hour_of_day: hour,
        profit_per_mile: Math.round(profitPerMile * 100) / 100,
        profit_per_hour: profitPerHour,
        gas_efficiency_ratio: Math.round(gasEfficiency * 100) / 100,
        time_period: this.categorizeTimePeriod(hour),
        is_weekend: ['Saturday', 'Sunday'].includes(dayOfWeek)
      }
    };
  }

  private async performDailyAnalysis(trips: any[]) {
    const dailyGroups = this.groupTripsByDay(trips);
    const dailyAnalysis: Record<string, any> = {};

    for (const [day, dayTrips] of Object.entries(dailyGroups)) {
      const dayStats = this.calculateDayStatistics(dayTrips as any[]);
      dailyAnalysis[day] = {
        ...dayStats,
        insights: await this.generateDayInsights(dayTrips as any[], day)
      };
    }

    return {
      daily_breakdown: dailyAnalysis,
      best_day: this.findBestPerformingDay(dailyAnalysis),
      worst_day: this.findWorstPerformingDay(dailyAnalysis),
      day_comparison: this.compareDayPerformance(dailyAnalysis)
    };
  }

  private async performWeeklyAnalysis(trips: any[]) {
    const weeklyGroups = this.groupTripsByWeek(trips);
    const weeklyAnalysis: Record<string, any> = {};

    for (const [week, weekTrips] of Object.entries(weeklyGroups)) {
      weeklyAnalysis[week] = {
        ...this.calculateWeekStatistics(weekTrips as any[]),
        daily_breakdown: this.analyzeDailyPatternsInWeek(weekTrips as any[])
      };
    }

    return {
      weekly_breakdown: weeklyAnalysis,
      weekly_trends: this.identifyWeeklyTrends(weeklyAnalysis),
      recommendations: this.generateWeeklyRecommendations(weeklyAnalysis)
    };
  }

  private async performComparisonAnalysis(trips: any[]) {
    const dayComparisons = this.compareDayPerformance(this.groupTripsByDay(trips));
    const timeComparisons = this.compareTimePerformance(trips);
    
    return {
      day_comparisons: dayComparisons,
      time_comparisons: timeComparisons,
      peak_performance_analysis: this.identifyPeakPerformance(trips),
      optimization_opportunities: this.identifyOptimizationOpportunities(trips)
    };
  }

  private groupTripsByDay(trips: any[]) {
    return trips.reduce((groups, trip) => {
      const day = new Date(trip.created_at).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      if (!groups[day]) groups[day] = [];
      groups[day].push(trip);
      return groups;
    }, {});
  }

  private calculateDayStatistics(dayTrips: any[]) {
    const totalProfit = dayTrips.reduce((sum, trip) => sum + (trip.total_profit || 0), 0);
    const totalDistance = dayTrips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0);
    const totalGasCost = dayTrips.reduce((sum, trip) => sum + (trip.gas_cost || 0), 0);
    
    return {
      trip_count: dayTrips.length,
      total_profit: Math.round(totalProfit * 100) / 100,
      total_distance: Math.round(totalDistance * 100) / 100,
      total_gas_cost: Math.round(totalGasCost * 100) / 100,
      avg_profit_per_trip: Math.round((totalProfit / dayTrips.length) * 100) / 100,
      profit_per_mile: Math.round((totalProfit / totalDistance) * 100) / 100,
      gas_efficiency_percentage: Math.round(((totalGasCost / totalProfit) * 100) * 100) / 100
    };
  }

  private compareDayPerformance(dailyGroups: any) {
    const days = Object.keys(dailyGroups);
    const comparisons: Record<string, any> = {};

    for (let i = 0; i < days.length - 1; i++) {
      for (let j = i + 1; j < days.length; j++) {
        const day1 = days[i];
        const day2 = days[j];
        const stats1 = this.calculateDayStatistics(dailyGroups[day1]);
        const stats2 = this.calculateDayStatistics(dailyGroups[day2]);

        comparisons[`${day1} vs ${day2}`] = {
          profit_difference: Math.round((stats1.total_profit - stats2.total_profit) * 100) / 100,
          trip_count_difference: stats1.trip_count - stats2.trip_count,
          efficiency_difference: Math.round((stats1.profit_per_mile - stats2.profit_per_mile) * 100) / 100,
          better_day: stats1.total_profit > stats2.total_profit ? day1 : day2,
          combined_average: {
            profit: Math.round(((stats1.total_profit + stats2.total_profit) / 2) * 100) / 100,
            profit_margin: Math.round((((stats1.total_profit + stats2.total_profit) / 2) / ((stats1.total_profit + stats2.total_profit + stats1.total_gas_cost + stats2.total_gas_cost) / 2) * 100) * 100) / 100
          }
        };
      }
    }

    return comparisons;
  }

  private categorizeTimePeriod(hour: number): string {
    if (hour >= 6 && hour < 10) return 'Morning Rush';
    if (hour >= 10 && hour < 14) return 'Lunch Period';
    if (hour >= 14 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening Rush';
    if (hour >= 21 && hour < 24) return 'Late Evening';
    return 'Late Night/Early Morning';
  }

  private calculateHourlyRate(tripData: TripData): number {
    const durationStr = tripData.duration || "25 minutes";
    const minutes = parseInt(durationStr.match(/\d+/)?.[0] || "25");
    const hours = minutes / 60;
    return Math.round(((tripData.profit || 0) / hours) * 100) / 100;
  }

  private findBestPerformingDay(dailyAnalysis: any) {
    let bestDay = '';
    let bestProfit = 0;
    
    for (const [day, stats] of Object.entries(dailyAnalysis)) {
      if ((stats as any).total_profit > bestProfit) {
        bestProfit = (stats as any).total_profit;
        bestDay = day;
      }
    }
    
    return { day: bestDay, profit: bestProfit };
  }

  private findWorstPerformingDay(dailyAnalysis: any) {
    let worstDay = '';
    let worstProfit = Infinity;
    
    for (const [day, stats] of Object.entries(dailyAnalysis)) {
      if ((stats as any).total_profit < worstProfit) {
        worstProfit = (stats as any).total_profit;
        worstDay = day;
      }
    }
    
    return { day: worstDay, profit: worstProfit };
  }

  private async generateDayInsights(dayTrips: any[], day: string) {
    const stats = this.calculateDayStatistics(dayTrips);
    const dayOfWeek = day.split(',')[0]; // Extract day name
    
    const insights = [
      `${dayOfWeek} performance: ${stats.trip_count} trips generating $${stats.total_profit} profit`,
      `Average profit per trip: $${stats.avg_profit_per_trip}`,
      `Profit efficiency: $${stats.profit_per_mile} per mile`,
    ];

    if (stats.gas_efficiency_percentage > 20) {
      insights.push(`Gas costs are ${stats.gas_efficiency_percentage}% of profit - consider route optimization`);
    }

    if (stats.profit_per_mile < 1.50) {
      insights.push('Consider targeting longer distance or higher-value trips');
    }

    return insights;
  }

  private groupTripsByWeek(trips: any[]) {
    return trips.reduce((groups, trip) => {
      const date = new Date(trip.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (!groups[`Week of ${weekKey}`]) groups[`Week of ${weekKey}`] = [];
      groups[`Week of ${weekKey}`].push(trip);
      return groups;
    }, {});
  }

  private calculateWeekStatistics(weekTrips: any[]) {
    const dailyBreakdown = this.groupTripsByDay(weekTrips);
    const totalProfit = weekTrips.reduce((sum, trip) => sum + (trip.total_profit || 0), 0);
    
    return {
      total_trips: weekTrips.length,
      total_profit: Math.round(totalProfit * 100) / 100,
      daily_average: Math.round((totalProfit / 7) * 100) / 100,
      active_days: Object.keys(dailyBreakdown).length,
      best_day_profit: Math.max(...Object.values(dailyBreakdown).map(trips => 
        this.calculateDayStatistics(trips as any[]).total_profit
      ))
    };
  }

  private analyzeDailyPatternsInWeek(weekTrips: any[]) {
    const dailyGroups = this.groupTripsByDay(weekTrips);
    const patterns: Record<string, any> = {};
    
    for (const [day, trips] of Object.entries(dailyGroups)) {
      const dayName = day.split(',')[0];
      patterns[dayName] = this.calculateDayStatistics(trips as any[]);
    }
    
    return patterns;
  }

  private identifyWeeklyTrends(weeklyAnalysis: any) {
    const weeks = Object.keys(weeklyAnalysis);
    if (weeks.length < 2) return { trend: 'insufficient_data' };
    
    const profits = weeks.map(week => weeklyAnalysis[week].total_profit);
    const isImproving = profits[profits.length - 1] > profits[0];
    
    return {
      trend: isImproving ? 'improving' : 'declining',
      profit_change: Math.round((profits[profits.length - 1] - profits[0]) * 100) / 100,
      weekly_average: Math.round((profits.reduce((sum, p) => sum + p, 0) / profits.length) * 100) / 100
    };
  }

  private generateWeeklyRecommendations(weeklyAnalysis: any) {
    const recommendations = [];
    const weeks = Object.values(weeklyAnalysis);
    const avgWeeklyProfit = weeks.reduce((sum: number, week: any) => sum + week.total_profit, 0) / weeks.length;
    
    recommendations.push(`Your average weekly profit is $${Math.round(avgWeeklyProfit * 100) / 100}`);
    
    if (avgWeeklyProfit < 200) {
      recommendations.push('Consider increasing your weekly trip frequency or targeting higher-value rides');
    }
    
    return recommendations;
  }

  private compareTimePerformance(trips: any[]) {
    const timeGroups = {
      morning: trips.filter(t => new Date(t.created_at).getHours() >= 6 && new Date(t.created_at).getHours() < 12),
      afternoon: trips.filter(t => new Date(t.created_at).getHours() >= 12 && new Date(t.created_at).getHours() < 17),
      evening: trips.filter(t => new Date(t.created_at).getHours() >= 17 && new Date(t.created_at).getHours() < 22),
      night: trips.filter(t => new Date(t.created_at).getHours() >= 22 || new Date(t.created_at).getHours() < 6)
    };

    const comparisons: Record<string, any> = {};
    for (const [time, timeTrips] of Object.entries(timeGroups)) {
      if (timeTrips.length > 0) {
        comparisons[time] = this.calculateDayStatistics(timeTrips);
      }
    }

    return comparisons;
  }

  private identifyPeakPerformance(trips: any[]) {
    const enhanced = trips.map(t => this.enhanceTripWithAdvancedMetrics(t));
    
    // Find best performing time periods
    const timeGroups: Record<string, any[]> = {};
    enhanced.forEach(trip => {
      const period = trip.enhanced_metrics.time_period;
      if (!timeGroups[period]) timeGroups[period] = [];
      timeGroups[period].push(trip);
    });

    const peakPerformance: Record<string, any> = {};
    for (const [period, periodTrips] of Object.entries(timeGroups)) {
      const stats = this.calculateDayStatistics(periodTrips as any[]);
      peakPerformance[period] = {
        ...stats,
        performance_rating: stats.profit_per_mile > 2 ? 'Excellent' : stats.profit_per_mile > 1.5 ? 'Good' : 'Average'
      };
    }

    return peakPerformance;
  }

  private identifyOptimizationOpportunities(trips: any[]) {
    const opportunities = [];
    const enhanced = trips.map(t => this.enhanceTripWithAdvancedMetrics(t));
    
    // Analyze patterns
    const lowProfitTrips = enhanced.filter(t => t.enhanced_metrics.profit_per_mile < 1.5);
    const highGasTrips = enhanced.filter(t => t.enhanced_metrics.gas_efficiency_ratio > 0.25);
    
    if (lowProfitTrips.length > trips.length * 0.3) {
      opportunities.push({
        type: 'low_profit_trips',
        description: `${lowProfitTrips.length} trips have profit per mile below $1.50`,
        recommendation: 'Focus on longer distance trips or higher-value rides'
      });
    }

    if (highGasTrips.length > trips.length * 0.2) {
      opportunities.push({
        type: 'high_gas_cost',
        description: `${highGasTrips.length} trips have gas costs over 25% of profit`,
        recommendation: 'Consider route optimization or maintenance for better Honda Odyssey fuel efficiency'
      });
    }

    return opportunities;
  }

  private async performCustomAnalysis(trips: any[], timeframe: string) {
    // Custom analysis based on specific timeframe
    return {
      timeframe,
      total_trips: trips.length,
      analysis: this.calculateDayStatistics(trips),
      insights: await this.generateDayInsights(trips, timeframe)
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      startDate, 
      endDate, 
      analysisType = 'custom', 
      tripIds = [], 
      driverId = '550e8400-e29b-41d4-a716-446655440000'
    } = body;

    console.log('Reanalysis request:', { startDate, endDate, analysisType, tripIds: tripIds.length });

    // Fetch trips based on criteria
    let query = supabaseAdmin
      .from('trips')
      .select('*')
      .eq('driver_id', driverId);

    if (tripIds.length > 0) {
      query = query.in('id', tripIds);
    } else if (startDate && endDate) {
      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { data: trips, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch trips: ${error.message}`);
    }

    if (!trips || trips.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No trips found for the specified criteria',
        criteria: { startDate, endDate, analysisType, tripCount: 0 }
      });
    }

    // Perform advanced reanalysis
    const analytics = new AdvancedAnalyticsMCP();
    const timeframe = startDate && endDate 
      ? `${startDate} to ${endDate}` 
      : `${trips.length} selected trips`;
    
    const reanalysisResult = await analytics.reanalyzeTrips(
      trips, 
      timeframe, 
      analysisType as 'daily' | 'weekly' | 'custom' | 'comparison'
    );

    if (!reanalysisResult.success) {
      throw new Error(reanalysisResult.error || 'Reanalysis failed');
    }

    return NextResponse.json({
      success: true,
      reanalysis: reanalysisResult.results,
      summary: {
        trips_analyzed: trips.length,
        date_range: { startDate, endDate },
        analysis_type: analysisType,
        total_profit: trips.reduce((sum, trip) => sum + (trip.total_profit || 0), 0),
        total_distance: trips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0),
        avg_profit_per_trip: trips.reduce((sum, trip) => sum + (trip.total_profit || 0), 0) / trips.length
      }
    });

  } catch (error) {
    console.error('Reanalysis API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Reanalysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}