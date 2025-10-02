// Enhanced Data Validator with Flexible Rules and Data Cleaning
// Handles high-volume rideshare operations and data quality issues

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
  
  // Adaptive settings
  enableAdaptiveLimits: boolean;
  strictMode: boolean;
}

// Updated realistic limits for high-volume rideshare operations
export const ENHANCED_RIDESHARE_VALIDATION_RULES: ValidationRules = {
  // Per trip - accommodating real-world variation
  maxTripEarnings: 75.00,    // Allow for longer premium trips
  minTripEarnings: 2.00,     // Allow for very short trips
  maxTripDistance: 50,       // Allow for longer trips
  
  // Daily limits - updated for high-volume operations
  maxDailyTrips: 50,         // Allow for aggressive driving days
  maxDailyEarnings: 500.00,  // Higher earning potential for long days
  
  // Hourly limits - more flexible
  maxTripsPerHour: 8,        // Allow for rush hour efficiency
  maxEarningsPerHour: 80.00, // Allow for premium hours/surge pricing
  
  // Weekly limits  
  maxWeeklyTrips: 250,       // ~35 trips/day average for full-time
  maxWeeklyEarnings: 2500.00, // $2500/week for high performers
  
  // Data quality
  minScreenshotConfidence: 0.5, // 50% confidence minimum
  
  // Adaptive settings
  enableAdaptiveLimits: true,
  strictMode: false
};

export class EnhancedTripDataValidator {
  private rules: ValidationRules;
  private adaptiveLimits: Partial<ValidationRules> = {};

  constructor(rules: ValidationRules = ENHANCED_RIDESHARE_VALIDATION_RULES) {
    this.rules = rules;
  }

  // Clean missing earnings data
  cleanMissingEarningsData(trips: Record<string, unknown>[]): { 
    cleanedTrips: Record<string, unknown>[], 
    fixedCount: number,
    issues: string[]
  } {
    console.log('🧹 Cleaning trips with missing earnings data...');
    
    const cleanedTrips: Record<string, unknown>[] = [];
    let fixedCount = 0;
    const issues: string[] = [];

    for (const trip of trips) {
      const tripData = { ...trip };
      const earnings = ((tripData.trip_data as Record<string, unknown>)?.driver_earnings as number) || (tripData.driver_earnings as number) || 0;
      const distance = ((tripData.trip_data as Record<string, unknown>)?.distance as number) || (tripData.distance as number) || 0;
      
      // Fix missing earnings for trips with distance
      if (distance > 0 && earnings === 0) {
        // Estimate earnings based on distance (conservative estimate)
        const estimatedEarnings = Math.max(2.50, distance * 1.2); // $1.20/mile minimum
        
        if (tripData.trip_data) {
          (tripData.trip_data as Record<string, unknown>).driver_earnings = estimatedEarnings;
          (tripData.trip_data as Record<string, unknown>).estimated_earnings = true;
        } else {
          tripData.driver_earnings = estimatedEarnings;
          tripData.estimated_earnings = true;
        }
        
        fixedCount++;
        issues.push(`Fixed missing earnings for ${distance}mi trip - estimated $${estimatedEarnings.toFixed(2)}`);
      }
      
      cleanedTrips.push(tripData);
    }

    console.log(`✅ Fixed ${fixedCount} trips with missing earnings data`);
    return { cleanedTrips, fixedCount, issues };
  }

  // Validate and clean trip data with flexible rules
  validateAndCleanTrip(trip: Record<string, unknown>): { 
    isValid: boolean; 
    cleanedTrip: Record<string, unknown>;
    issues: string[]; 
    fixes: string[];
  } {
    const issues: string[] = [];
    const fixes: string[] = [];
    const cleanedTrip = { ...trip };

    // Extract values
    let earnings = ((cleanedTrip.trip_data as Record<string, unknown>)?.driver_earnings as number) || (cleanedTrip.driver_earnings as number) || 0;
    const distance = ((cleanedTrip.trip_data as Record<string, unknown>)?.distance as number) || (cleanedTrip.distance as number) || 0;
    
    // Fix missing earnings
    if (distance > 0 && earnings === 0) {
      const estimatedEarnings = Math.max(2.50, distance * 1.2);
      
      if (cleanedTrip.trip_data) {
        (cleanedTrip.trip_data as Record<string, unknown>).driver_earnings = estimatedEarnings;
        (cleanedTrip.trip_data as Record<string, unknown>).estimated_earnings = true;
      } else {
        cleanedTrip.driver_earnings = estimatedEarnings;
        cleanedTrip.estimated_earnings = true;
      }
      
      earnings = estimatedEarnings;
      fixes.push(`Estimated earnings: $${estimatedEarnings.toFixed(2)} for ${distance}mi trip`);
    }

    // Apply adaptive limits if enabled
    const currentLimits = this.rules.enableAdaptiveLimits ? this.getAdaptiveLimits() : this.rules;
    
    // Validate with current limits
    if (earnings > currentLimits.maxTripEarnings && earnings > 0) {
      if (this.rules.strictMode) {
        issues.push(`Trip earnings $${earnings} exceeds limit of $${currentLimits.maxTripEarnings}`);
      } else {
        // In flexible mode, cap but don't invalidate
        const cappedEarnings = currentLimits.maxTripEarnings;
        if (cleanedTrip.trip_data) {
          (cleanedTrip.trip_data as Record<string, unknown>).driver_earnings = cappedEarnings;
          (cleanedTrip.trip_data as Record<string, unknown>).capped_earnings = true;
          (cleanedTrip.trip_data as Record<string, unknown>).original_earnings = earnings;
        } else {
          cleanedTrip.driver_earnings = cappedEarnings;
          cleanedTrip.capped_earnings = true;
          cleanedTrip.original_earnings = earnings;
        }
        fixes.push(`Capped excessive earnings from $${earnings} to $${cappedEarnings}`);
      }
    }

    if (distance > currentLimits.maxTripDistance && distance > 0) {
      if (this.rules.strictMode) {
        issues.push(`Trip distance ${distance} miles exceeds limit of ${currentLimits.maxTripDistance}`);
      } else {
        fixes.push(`Long trip: ${distance} miles (above typical ${currentLimits.maxTripDistance} mile limit)`);
      }
    }

    const isValid = this.rules.strictMode ? issues.length === 0 : true;
    
    return { isValid, cleanedTrip, issues, fixes };
  }

  // Get adaptive limits based on historical data
  private getAdaptiveLimits(): ValidationRules {
    return { ...this.rules, ...this.adaptiveLimits };
  }

  // Update adaptive limits based on observed patterns
  updateAdaptiveLimits(trips: Record<string, unknown>[]): void {
    if (!this.rules.enableAdaptiveLimits || trips.length < 20) return;

    console.log('📊 Updating adaptive validation limits based on historical data...');

    // Analyze earnings distribution
    const earnings = trips
      .map(trip => ((trip.trip_data as Record<string, unknown>)?.driver_earnings as number) || (trip.driver_earnings as number) || 0)
      .filter(e => e > 0)
      .sort((a, b) => a - b);

    if (earnings.length > 0) {
      // Set adaptive max trip earnings to 95th percentile + buffer
      const p95Index = Math.floor(earnings.length * 0.95);
      const p95Earnings = earnings[p95Index];
      this.adaptiveLimits.maxTripEarnings = Math.max(
        this.rules.maxTripEarnings,
        p95Earnings * 1.2 // 20% buffer above 95th percentile
      );
    }

    // Analyze daily patterns
    const dailyStats = this.analyzeDailyPatterns(trips);
    if (dailyStats.maxDailyTrips > this.rules.maxDailyTrips) {
      this.adaptiveLimits.maxDailyTrips = Math.min(
        dailyStats.maxDailyTrips * 1.1, // 10% buffer
        60 // Absolute maximum
      );
    }

    if (dailyStats.maxDailyEarnings > this.rules.maxDailyEarnings) {
      this.adaptiveLimits.maxDailyEarnings = Math.min(
        dailyStats.maxDailyEarnings * 1.1,
        600 // Absolute maximum
      );
    }

    console.log('✅ Adaptive limits updated:', this.adaptiveLimits);
  }

  // Analyze daily patterns for adaptive limits
  private analyzeDailyPatterns(trips: Record<string, unknown>[]): {
    maxDailyTrips: number;
    maxDailyEarnings: number;
    avgDailyTrips: number;
    avgDailyEarnings: number;
  } {
    const dailyData: Record<string, { trips: number; earnings: number }> = {};

    trips.forEach(trip => {
      const date = new Date(trip.created_at as string).toDateString();
      if (!dailyData[date]) {
        dailyData[date] = { trips: 0, earnings: 0 };
      }
      
      dailyData[date].trips++;
      dailyData[date].earnings += ((trip.trip_data as Record<string, unknown>)?.driver_earnings as number) || (trip.driver_earnings as number) || 0;
    });

    const dailyValues = Object.values(dailyData);
    const maxDailyTrips = Math.max(...dailyValues.map(d => d.trips));
    const maxDailyEarnings = Math.max(...dailyValues.map(d => d.earnings));
    const avgDailyTrips = dailyValues.reduce((sum, d) => sum + d.trips, 0) / dailyValues.length;
    const avgDailyEarnings = dailyValues.reduce((sum, d) => sum + d.earnings, 0) / dailyValues.length;

    return { maxDailyTrips, maxDailyEarnings, avgDailyTrips, avgDailyEarnings };
  }

  // Main cleaning and validation method
  processTripsDataset(trips: Record<string, unknown>[]): {
    processedTrips: Record<string, unknown>[];
    cleaningStats: {
      originalCount: number;
      processedCount: number;
      earningsFixed: number;
      cappedTrips: number;
      estimatedTrips: number;
      validTrips: number;
    };
    issues: string[];
    fixes: string[];
  } {
    console.log(`🚀 Processing ${trips.length} trips with enhanced validation...`);

    // Step 1: Update adaptive limits
    this.updateAdaptiveLimits(trips);

    // Step 2: Clean missing earnings data
    const { cleanedTrips, fixedCount } = this.cleanMissingEarningsData(trips);

    // Step 3: Process each trip
    const processedTrips: Record<string, unknown>[] = [];
    const allIssues: string[] = [];
    const allFixes: string[] = [];
    let cappedTrips = 0;
    let estimatedTrips = 0;
    let validTrips = 0;

    for (const trip of cleanedTrips) {
      const result = this.validateAndCleanTrip(trip);
      
      processedTrips.push(result.cleanedTrip);
      allIssues.push(...result.issues);
      allFixes.push(...result.fixes);
      
      if (result.isValid) validTrips++;
      if ((result.cleanedTrip.estimated_earnings as boolean) || ((result.cleanedTrip.trip_data as Record<string, unknown>)?.estimated_earnings as boolean)) estimatedTrips++;
      if ((result.cleanedTrip.capped_earnings as boolean) || ((result.cleanedTrip.trip_data as Record<string, unknown>)?.capped_earnings as boolean)) cappedTrips++;
    }

    const cleaningStats = {
      originalCount: trips.length,
      processedCount: processedTrips.length,
      earningsFixed: fixedCount,
      cappedTrips,
      estimatedTrips,
      validTrips
    };

    console.log('✅ Dataset processing complete:', cleaningStats);
    
    // Show sample of issues/fixes
    if (allIssues.length > 0) {
      console.log('⚠️ Issues found (sample):', allIssues.slice(0, 3));
    }
    if (allFixes.length > 0) {
      console.log('🔧 Fixes applied (sample):', allFixes.slice(0, 3));
    }

    return {
      processedTrips,
      cleaningStats,
      issues: allIssues,
      fixes: allFixes
    };
  }

  // Generate data quality report
  generateDataQualityReport(trips: Record<string, unknown>[]): {
    overallScore: number;
    completeness: number;
    consistency: number;
    accuracy: number;
    recommendations: string[];
  } {
    const result = this.processTripsDataset(trips);
    
    // Calculate quality metrics
    const completeness = trips.length > 0 ? 
      (trips.length - result.cleaningStats.earningsFixed) / trips.length * 100 : 0;
    
    const consistency = trips.length > 0 ? 
      (result.cleaningStats.validTrips / trips.length) * 100 : 0;
    
    const accuracy = trips.length > 0 ? 
      ((trips.length - result.cleaningStats.cappedTrips) / trips.length) * 100 : 0;
    
    const overallScore = (completeness + consistency + accuracy) / 3;

    const recommendations: string[] = [];
    
    if (completeness < 90) {
      recommendations.push('Improve data completeness - ensure all trip screenshots include earnings information');
    }
    
    if (consistency < 85) {
      recommendations.push('Review trip data for inconsistencies - some values may need manual verification');
    }
    
    if (accuracy < 95) {
      recommendations.push('Consider reviewing trips with capped values for potential data entry errors');
    }
    
    if (result.cleaningStats.estimatedTrips > trips.length * 0.1) {
      recommendations.push('High number of estimated earnings - verify screenshot quality and OCR accuracy');
    }

    return {
      overallScore: Math.round(overallScore),
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      accuracy: Math.round(accuracy),
      recommendations
    };
  }
}

// Export both old and new for compatibility
export { RIDESHARE_VALIDATION_RULES } from './data-validator';
export const TripDataValidator = EnhancedTripDataValidator;