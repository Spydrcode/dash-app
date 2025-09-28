// Data Validation Rules for Realistic Rideshare Analysis
// Prevents inflated or unrealistic data from affecting AI insights

export interface ValidationRules {
  // Per trip limits
  maxTripEarnings: number;
  minTripEarnings: number;
  maxTripDistance: number;
  maxDailyTrips: number;
  maxDailyEarnings: number;
  
  // Per hour limits
  maxTripsPerHour: number;
  maxEarningsPerHour: number;
  
  // Weekly limits
  maxWeeklyTrips: number;
  maxWeeklyEarnings: number;
  
  // Data quality
  minScreenshotConfidence: number;
}

// Conservative realistic limits for rideshare driving
export const RIDESHARE_VALIDATION_RULES: ValidationRules = {
  // Per trip - based on typical rideshare ranges
  maxTripEarnings: 50.00,    // Very high but possible for long trips
  minTripEarnings: 2.50,     // Minimum after Uber/Lyft fees
  maxTripDistance: 30,       // Miles - longer trips are rare
  
  // Daily limits - realistic for full-time driving
  maxDailyTrips: 25,         // Even aggressive drivers rarely exceed this
  maxDailyEarnings: 350.00,  // $350/day is exceptional performance
  
  // Hourly limits
  maxTripsPerHour: 4,        // 15 minutes average per trip
  maxEarningsPerHour: 45.00, // $45/hour is very good
  
  // Weekly limits  
  maxWeeklyTrips: 120,       // ~17 trips/day average
  maxWeeklyEarnings: 1500.00, // $1500/week is excellent
  
  // Data quality
  minScreenshotConfidence: 0.6 // 60% OCR confidence minimum
};

export class TripDataValidator {
  private rules: ValidationRules;

  constructor(rules: ValidationRules = RIDESHARE_VALIDATION_RULES) {
    this.rules = rules;
  }

  // Validate individual trip data
  validateTrip(trip: any): { isValid: boolean; issues: string[]; sanitizedTrip?: any } {
    const issues: string[] = [];
    const sanitizedTrip = { ...trip };

    // Extract trip earnings
    const earnings = trip.trip_data?.driver_earnings || trip.trip_data?.total_amount || trip.driver_earnings || 0;
    const distance = trip.trip_data?.distance || trip.distance || 0;
    
    // Check earnings bounds
    if (earnings > this.rules.maxTripEarnings) {
      issues.push(`Trip earnings $${earnings} exceeds realistic maximum of $${this.rules.maxTripEarnings}`);
      sanitizedTrip.trip_data = { ...sanitizedTrip.trip_data, driver_earnings: this.rules.maxTripEarnings };
    }
    
    if (earnings < this.rules.minTripEarnings && earnings > 0) {
      issues.push(`Trip earnings $${earnings} below realistic minimum of $${this.rules.minTripEarnings}`);
    }

    // Check distance bounds
    if (distance > this.rules.maxTripDistance) {
      issues.push(`Trip distance ${distance} miles exceeds realistic maximum of ${this.rules.maxTripDistance}`);
      sanitizedTrip.trip_data = { ...sanitizedTrip.trip_data, distance: this.rules.maxTripDistance };
    }

    // Check for obviously bad data
    if (earnings > 0 && distance === 0) {
      issues.push('Trip has earnings but no distance - suspicious data');
    }

    if (distance > 0 && earnings === 0) {
      issues.push('Trip has distance but no earnings - incomplete data');
    }

    const isValid = issues.length === 0;
    return { isValid, issues, sanitizedTrip: isValid ? trip : sanitizedTrip };
  }

  // Validate daily aggregates  
  validateDayData(trips: any[], date: string): { isValid: boolean; issues: string[]; validTrips: any[] } {
    const issues: string[] = [];
    const validTrips: any[] = [];
    
    let dailyEarnings = 0;
    let dailyTrips = 0;

    // Validate each trip and accumulate totals
    for (const trip of trips) {
      const validation = this.validateTrip(trip);
      
      if (validation.isValid) {
        validTrips.push(trip);
        dailyEarnings += trip.trip_data?.driver_earnings || trip.trip_data?.total_amount || 0;
        dailyTrips++;
      } else {
        // Use sanitized version if available
        if (validation.sanitizedTrip) {
          validTrips.push(validation.sanitizedTrip);
          dailyEarnings += validation.sanitizedTrip.trip_data?.driver_earnings || 0;
          dailyTrips++;
        }
        issues.push(...validation.issues);
      }
    }

    // Check daily limits
    if (dailyTrips > this.rules.maxDailyTrips) {
      issues.push(`${dailyTrips} trips on ${date} exceeds realistic daily maximum of ${this.rules.maxDailyTrips}`);
    }

    if (dailyEarnings > this.rules.maxDailyEarnings) {
      issues.push(`$${dailyEarnings} earnings on ${date} exceeds realistic daily maximum of $${this.rules.maxDailyEarnings}`);
    }

    // Check hourly distribution
    const hourlyStats = this.analyzeHourlyDistribution(validTrips);
    for (const [hour, stats] of Object.entries(hourlyStats)) {
      if (stats.trips > this.rules.maxTripsPerHour) {
        issues.push(`${stats.trips} trips in hour ${hour} exceeds realistic maximum of ${this.rules.maxTripsPerHour}`);
      }
      if (stats.earnings > this.rules.maxEarningsPerHour) {
        issues.push(`$${stats.earnings} earnings in hour ${hour} exceeds realistic maximum of $${this.rules.maxEarningsPerHour}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      validTrips
    };
  }

  // Analyze hourly distribution
  private analyzeHourlyDistribution(trips: any[]): Record<string, { trips: number; earnings: number }> {
    const hourlyStats: Record<string, { trips: number; earnings: number }> = {};

    for (const trip of trips) {
      const tripDate = new Date(trip.created_at);
      const hour = tripDate.getHours();
      
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { trips: 0, earnings: 0 };
      }
      
      hourlyStats[hour].trips++;
      hourlyStats[hour].earnings += trip.trip_data?.driver_earnings || trip.trip_data?.total_amount || 0;
    }

    return hourlyStats;
  }

  // Clean and validate trip dataset
  cleanTripDataset(trips: any[]): {
    validTrips: any[];
    removedTrips: any[];
    issues: string[];
    stats: {
      originalCount: number;
      validCount: number;
      cleanedCount: number;
      issueCount: number;
    }
  } {
    const validTrips: any[] = [];
    const removedTrips: any[] = [];
    const allIssues: string[] = [];

    console.log(`🧹 Validating ${trips.length} trips for realistic data...`);

    // Group trips by day for better validation
    const tripsByDay = this.groupTripsByDay(trips);
    
    for (const [date, dayTrips] of Object.entries(tripsByDay)) {
      const dayValidation = this.validateDayData(dayTrips as any[], date);
      
      if (dayValidation.isValid) {
        validTrips.push(...dayValidation.validTrips);
      } else {
        // Include valid trips from the day, exclude problematic ones
        validTrips.push(...dayValidation.validTrips);
        allIssues.push(`Issues on ${date}: ${dayValidation.issues.join(', ')}`);
      }
    }

    // Additional cleanup - remove obvious outliers
    const cleanedTrips = this.removeOutliers(validTrips);
    
    const stats = {
      originalCount: trips.length,
      validCount: validTrips.length,
      cleanedCount: cleanedTrips.length,
      issueCount: allIssues.length
    };

    console.log(`✅ Data validation complete:`, stats);
    if (allIssues.length > 0) {
      console.log(`⚠️ Issues found:`, allIssues.slice(0, 5)); // Show first 5 issues
    }

    return {
      validTrips: cleanedTrips,
      removedTrips,
      issues: allIssues,
      stats
    };
  }

  // Group trips by day for analysis
  private groupTripsByDay(trips: any[]): Record<string, any[]> {
    const tripsByDay: Record<string, any[]> = {};
    
    for (const trip of trips) {
      const date = new Date(trip.created_at).toDateString();
      if (!tripsByDay[date]) {
        tripsByDay[date] = [];
      }
      tripsByDay[date].push(trip);
    }
    
    return tripsByDay;
  }

  // Remove statistical outliers
  private removeOutliers(trips: any[]): any[] {
    if (trips.length < 10) return trips; // Need minimum data for outlier detection

    const earnings = trips.map(trip => 
      trip.trip_data?.driver_earnings || trip.trip_data?.total_amount || 0
    ).filter(e => e > 0);

    if (earnings.length === 0) return trips;

    // Calculate quartiles
    earnings.sort((a, b) => a - b);
    const q1Index = Math.floor(earnings.length * 0.25);
    const q3Index = Math.floor(earnings.length * 0.75);
    const q1 = earnings[q1Index];
    const q3 = earnings[q3Index];
    const iqr = q3 - q1;
    
    // Define outlier bounds (1.5 * IQR method)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    // Filter out extreme outliers only
    const cleanTrips = trips.filter(trip => {
      const earnings = trip.trip_data?.driver_earnings || trip.trip_data?.total_amount || 0;
      return earnings >= lowerBound && earnings <= upperBound;
    });

    if (cleanTrips.length < trips.length) {
      console.log(`🎯 Removed ${trips.length - cleanTrips.length} statistical outliers`);
    }

    return cleanTrips;
  }

  // Validate screenshot data quality
  validateScreenshotData(trip: any): boolean {
    if (!trip.trip_screenshots || trip.trip_screenshots.length === 0) {
      return false; // No screenshots = can't validate
    }

    // Check if screenshots have processed data
    const processedScreenshots = trip.trip_screenshots.filter((screenshot: any) => 
      screenshot.is_processed && screenshot.extracted_data
    );

    return processedScreenshots.length > 0;
  }

  // Get validation summary
  getValidationSummary(trips: any[]): {
    totalTrips: number;
    validTrips: number;
    hasScreenshots: number;
    avgDailyTrips: number;
    avgDailyEarnings: number;
    dataQualityScore: number;
  } {
    const validationResult = this.cleanTripDataset(trips);
    const validTrips = validationResult.validTrips;
    
    const tripsWithScreenshots = trips.filter(trip => this.validateScreenshotData(trip)).length;
    
    // Calculate daily averages
    const tripsByDay = this.groupTripsByDay(validTrips);
    const activeDays = Object.keys(tripsByDay).length;
    const avgDailyTrips = activeDays > 0 ? validTrips.length / activeDays : 0;
    
    const totalEarnings = validTrips.reduce((sum, trip) => 
      sum + (trip.trip_data?.driver_earnings || trip.trip_data?.total_amount || 0), 0
    );
    const avgDailyEarnings = activeDays > 0 ? totalEarnings / activeDays : 0;
    
    // Calculate data quality score
    const screenshotQuality = trips.length > 0 ? (tripsWithScreenshots / trips.length) * 100 : 0;
    const dataIntegrity = trips.length > 0 ? (validTrips.length / trips.length) * 100 : 0;
    const dataQualityScore = (screenshotQuality + dataIntegrity) / 2;
    
    return {
      totalTrips: trips.length,
      validTrips: validTrips.length,
      hasScreenshots: tripsWithScreenshots,
      avgDailyTrips: Math.round(avgDailyTrips * 10) / 10,
      avgDailyEarnings: Math.round(avgDailyEarnings * 100) / 100,
      dataQualityScore: Math.round(dataQualityScore)
    };
  }
}