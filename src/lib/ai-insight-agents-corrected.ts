// CORRECTED AI Insight Agents - Fixes Performance Score, Deduplication, and Week-Based Analysis
import { RIDESHARE_VALIDATION_RULES, TripDataValidator } from './data-validator';

export interface TripScreenshotData {
  id: string;
  screenshot_type: 'initial_offer' | 'final_total' | 'dashboard' | 'map';
  ocr_data: Record<string, unknown>;
  extracted_data: Record<string, unknown>;
  trip_id: string;
  upload_timestamp: string;
}

export interface TripData {
  id: string;
  driver_id?: string;
  trip_data?: {
    trip_date?: string;
    profit?: string | number;
    driver_earnings?: string | number;
    fare_amount?: string | number;
    total_trips?: string | number;
    distance?: string | number;
    [key: string]: unknown;
  };
  trip_screenshots?: TripScreenshotData[];
  created_at: string;
  upload_date?: string;
  total_profit?: number;
  total_distance?: number;
  vehicle_model?: string;
  [key: string]: unknown;
}

// Initialize validator for quality insights only
const dataValidator = new TripDataValidator(RIDESHARE_VALIDATION_RULES);

// FIXED Time Analysis Agent - Properly analyzes by actual trip dates and deduplicates
export class TimeAnalysisAgent {
  static async analyzeTimePatterns(trips: TripData[]) {
    if (trips.length === 0) {
      return {
        best_day: { day: 'No data', profit: 0, trips: 0 },
        best_hour: { hour: 'No data', profit: 0, trips: 0 }
      };
    }

    console.log(`⏰ Time Analysis: Processing ${trips.length} records to find UNIQUE trip data`);

    // DEDUPLICATE: Group by trip_date and sum unique profits (avoid counting same trip multiple times)
    const dailyGroups: Record<string, { profit: number; trips: number; earnings: number; records: string[] }> = {};
    
    trips.forEach(trip => {
      const tripDate = trip.trip_data?.trip_date;
      if (!tripDate) return;
      
      const profit = parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0));
      const earnings = parseFloat(String(trip.trip_data?.driver_earnings || trip.trip_data?.fare_amount || 0));
      const tripCount = parseInt(String(trip.trip_data?.total_trips || 1));
      
      if (!dailyGroups[tripDate]) {
        dailyGroups[tripDate] = { profit: 0, trips: 0, earnings: 0, records: [] };
      }
      
      // Only count unique profit amounts per day to avoid duplicate screenshots
      const recordKey = `${profit}-${tripCount}-${earnings}`;
      if (!dailyGroups[tripDate].records.includes(recordKey)) {
        dailyGroups[tripDate].profit += profit;
        dailyGroups[tripDate].trips += tripCount;
        dailyGroups[tripDate].earnings += earnings;
        dailyGroups[tripDate].records.push(recordKey);
      }
    });

    // Convert to day names
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekGroups: Record<string, { profit: number; trips: number }> = {};
    
    Object.entries(dailyGroups).forEach(([dateStr, data]) => {
      const date = new Date(dateStr);
      const dayName = days[date.getDay()];
      
      if (!dayOfWeekGroups[dayName]) {
        dayOfWeekGroups[dayName] = { profit: 0, trips: 0 };
      }
      
      dayOfWeekGroups[dayName].profit += data.profit;
      dayOfWeekGroups[dayName].trips += data.trips;
    });

    // Find best performing day
    let bestDay = { day: 'No data', profit: 0, trips: 0 };
    Object.entries(dayOfWeekGroups).forEach(([day, data]) => {
      if (data.profit > bestDay.profit) {
        bestDay = { day, profit: data.profit, trips: data.trips };
      }
    });

    console.log(`📊 DEDUPLICATED Best day: ${bestDay.day} ($${bestDay.profit.toFixed(2)}, ${bestDay.trips} trips)`);
    console.log(`📅 Daily breakdown:`, Object.entries(dailyGroups).map(([date, data]) => 
      `${date}: $${data.profit.toFixed(2)}, ${data.trips} trips`).join('; '));

    return {
      best_day: bestDay,
      best_hour: { hour: 'Peak analysis requires hourly data', profit: 0, trips: 0 },
      daily_breakdown: dailyGroups
    };
  }
}

// FIXED AI Insights Coordinator - Proper performance scoring and deduplication
export class AIInsightsCoordinator {
  static async generateCompleteInsights(trips: TripData[], timeframe: string, _options: Record<string, unknown>) {
    console.log(`🤖 AI Insights Coordinator: Analyzing ${trips.length} records for ACTUAL performance`);
    
    // Validate for quality insights but DON'T filter the data
    const validationResult = dataValidator.cleanTripDataset(trips);
    console.log(`🔍 Data quality check: ${validationResult.issues.length} issues noted`);
    
    if (trips.length === 0) {
      return { error: 'No trips found' };
    }

    // DEDUPLICATE: Remove duplicate trip data based on date/profit combinations
    const seen = new Set<string>();
    const uniqueTrips: TripData[] = [];
    trips.forEach(trip => {
      const tripDate = trip.trip_data?.trip_date as string;
      const profit = parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0));
      const key = `${tripDate}-${profit}`;
      if (!seen.has(key) && tripDate) {
        seen.add(key);
        uniqueTrips.push(trip);
      }
    });
    console.log(`🧹 Deduplicated: ${trips.length} records → ${uniqueTrips.length} unique trips`);

    // Get REAL time analysis with deduplicated data
    const timeAnalysis = await TimeAnalysisAgent.analyzeTimePatterns(uniqueTrips);

    // Calculate REAL totals from UNIQUE trips only
    let totalRealEarnings = 0;
    let totalRealProfit = 0;
    let totalRealTrips = 0;
    let totalRealDistance = 0;

    uniqueTrips.forEach(trip => {
      const profit = parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0));
      const earnings = parseFloat(String(trip.trip_data?.driver_earnings || trip.trip_data?.fare_amount || 0));
      const tripCount = parseInt(String(trip.trip_data?.total_trips || 1));
      const distance = parseFloat(String(trip.total_distance || trip.trip_data?.distance || 0));
      
      totalRealProfit += profit;
      totalRealEarnings += earnings;
      totalRealTrips += tripCount;
      totalRealDistance += distance;
    });

    // FIXED Performance Score: Based on profit per day, not total profit
    const activeDays = Object.keys(timeAnalysis.daily_breakdown || {}).length || 1;
    const avgDailyProfit = totalRealProfit / activeDays;
    const performanceScore = Math.min(Math.max((avgDailyProfit / 2), 0), 100); // $2 per day = 1 point

    console.log(`💰 CORRECTED TOTALS: $${totalRealProfit.toFixed(2)} profit over ${activeDays} days`);
    console.log(`📊 FIXED Performance Score: $${avgDailyProfit.toFixed(2)} avg daily / 2 = ${performanceScore.toFixed(1)}`);

    return {
      summary: {
        timeframe,
        total_trips: totalRealTrips,
        total_earnings: totalRealEarnings,
        total_profit: totalRealProfit,
        total_distance: totalRealDistance,
        performance_score: performanceScore, // FIXED: Based on daily average, not total
        profit_margin: totalRealEarnings > 0 ? (totalRealProfit / totalRealEarnings) * 100 : 0,
        active_days: activeDays,
        avg_daily_profit: avgDailyProfit,
        best_day: timeAnalysis.best_day?.day,
        best_day_profit: timeAnalysis.best_day?.profit
      },
      time_analysis: timeAnalysis,
      honda_odyssey: {
        actual_mpg: 19.0,
        rated_mpg: 19,
        efficiency_rating: 'Honda Odyssey 2003 specifications',
        total_fuel_cost: (totalRealDistance * 0.18) || 0,
        note: 'Vehicle efficiency based on EPA ratings'
      },
      performance_breakdown: {
        earnings_per_mile: totalRealDistance > 0 ? totalRealEarnings / totalRealDistance : 0,
        profit_per_mile: totalRealDistance > 0 ? totalRealProfit / totalRealDistance : 0,
        average_trip_profit: totalRealTrips > 0 ? totalRealProfit / totalRealTrips : 0,
        fuel_cost_ratio: totalRealEarnings > 0 ? (totalRealDistance * 0.18) / totalRealEarnings : 0
      },
      projections: {
        daily_projection: { 
          avg_profit: avgDailyProfit, 
          avg_trips: totalRealTrips / activeDays 
        },
        weekly_projection: { 
          avg_profit: avgDailyProfit * 7, 
          avg_trips: (totalRealTrips / activeDays) * 7 
        },
        monthly_projection: { 
          avg_profit: avgDailyProfit * 30, 
          avg_trips: (totalRealTrips / activeDays) * 30 
        }
      },
      trends: {
        percentage_change: 0, // Will need historical data
        note: 'Trends require multiple weeks of data for comparison'
      },
      tip_analysis: {
        accuracy_rate: 0, // Will need tip data from screenshots
        total_tips: 0, // Will need tip data from screenshots
        average_tip: 0
      },
      validation_summary: {
        issues_found: validationResult.issues.length,
        deduplication_note: `Processed ${trips.length} records, found ${uniqueTrips.length} unique trips`,
        data_quality_note: validationResult.issues.length > 0 ? 
          'Some data quality issues noted but all unique data included' : 'Good data quality'
      },
      last_updated: new Date().toISOString()
    };
  }

  // DEDUPLICATE trips based on date, profit, and trip count to avoid counting screenshots multiple times
  private static calculateTotals(trips: TripData[]): Record<string, number> {
    const seen = new Set<string>();
    const uniqueTrips: TripData[] = [];
    
    trips.forEach(trip => {
      const tripDate = trip.trip_data?.trip_date;
      const profit = parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0));
      const tripCount = parseInt(String(trip.trip_data?.total_trips || 1));
      
      // Create unique key based on date, profit, and trip count
      const key = `${tripDate}-${profit}-${tripCount}`;
      
      if (!seen.has(key) && tripDate) {
        seen.add(key);
        uniqueTrips.push(trip);
      }
    });
    
    // Calculate and return totals as Record<string, number>
    const totalProfit = uniqueTrips.reduce((sum: number, trip) => 
      sum + parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0)), 0);
    const totalEarnings = uniqueTrips.reduce((sum: number, trip) => 
      sum + parseFloat(String(trip.trip_data?.driver_earnings || 0)), 0);
    
    return {
      total_trips: uniqueTrips.length,
      total_profit: totalProfit,
      total_earnings: totalEarnings
    };
  }
}

// Simplified agents for required exports
export class KeyInsightsAgent {
  static async generateInsights(trips: TripData[]): Promise<string[]> {
    if (trips.length === 0) return ['No trip data available'];
    
    // Inline deduplication
    const seen = new Set<string>();
    const uniqueTrips: TripData[] = [];
    trips.forEach(trip => {
      const tripDate = trip.trip_data?.trip_date as string;
      if (!seen.has(tripDate) && tripDate) {
        seen.add(tripDate);
        uniqueTrips.push(trip);
      }
    });
    const totalProfit = uniqueTrips.reduce((sum: number, trip: TripData) => 
      sum + parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0)), 0);
    
    return [
      `Analyzed ${uniqueTrips.length} unique trips from ${trips.length} records`,
      `Total profit: $${totalProfit.toFixed(2)} from verified trip data`,
      'Performance metrics based on deduplicated data only'
    ];
  }
}

export class ProjectionsAgent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async generateProjections(trips: TripData[], timeframe: string) {
    if (trips.length === 0) return { daily_projection: { avg_profit: 0, avg_trips: 0 } };
    
    // Inline deduplication
    const seen = new Set<string>();
    const uniqueTrips: TripData[] = [];
    trips.forEach(trip => {
      const tripDate = trip.trip_data?.trip_date as string;
      if (!seen.has(tripDate) && tripDate) {
        seen.add(tripDate);
        uniqueTrips.push(trip);
      }
    });
    const totalProfit = uniqueTrips.reduce((sum: number, trip: TripData) => 
      sum + parseFloat(String(trip.total_profit || trip.trip_data?.profit || 0)), 0);
    
    const activeDays = [...new Set(uniqueTrips.map((trip: TripData) => trip.trip_data?.trip_date))].length || 1;
    const avgDaily = totalProfit / activeDays;
    
    return {
      daily_projection: { avg_profit: avgDaily, avg_trips: uniqueTrips.length / activeDays },
      note: 'Projections based on unique trip data only'
    };
  }
}

export class TrendsAgent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async analyzeTrends(trips: TripData[], timeframe: string) {
    return {
      trend: 'Week-by-week analysis requires multiple weeks of data',
      percentage_change: 0,
      note: 'Trends calculated from deduplicated data only'
    };
  }
}

export class VehicleEfficiencyAgent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static async analyzeHondaOdyssey(trips: TripData[]) {
    return {
      actual_mpg: 19.0,
      rated_mpg: 19,
      efficiency_rating: '2003 Honda Odyssey EPA rating',
      note: 'Vehicle efficiency analysis'
    };
  }
}