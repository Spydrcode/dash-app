// AI Training System for Rideshare Data Accuracy
// Implements self-learning validation rules and OCR confidence tracking

export interface TrainingData {
  screenshot_id: string;
  extracted_data: any;
  validated_data: any; // Human-corrected data
  ocr_confidence: number;
  correction_type: 'earnings' | 'distance' | 'trip_count' | 'other';
  feedback_timestamp: string;
}

export interface LearningMetrics {
  pattern_frequency: Record<string, number>;
  accuracy_trends: Array<{date: string; accuracy: number}>;
  common_errors: Array<{type: string; frequency: number; pattern: string}>;
  validation_adjustments: Record<string, {old_value: number; new_value: number; reason: string}>;
}

export class AITrainingSystem {
  private trainingData: TrainingData[] = [];
  private learningMetrics: LearningMetrics = {
    pattern_frequency: {},
    accuracy_trends: [],
    common_errors: [],
    validation_adjustments: {}
  };

  // Step 1: Collect training data from user corrections
  recordCorrection(
    screenshotId: string, 
    extractedData: any, 
    correctedData: any, 
    ocrConfidence: number
  ) {
    const correction: TrainingData = {
      screenshot_id: screenshotId,
      extracted_data: extractedData,
      validated_data: correctedData,
      ocr_confidence: ocrConfidence,
      correction_type: this.identifyCorrectionType(extractedData, correctedData),
      feedback_timestamp: new Date().toISOString()
    };
    
    this.trainingData.push(correction);
    this.updateLearningMetrics(correction);
  }

  // NEW: Auto-train from existing uploaded data
  async autoTrainFromExistingData(trips: any[]): Promise<{
    patternsLearned: number;
    rulesAdapted: number;
    confidenceImproved: boolean;
  }> {
    console.log(`🤖 Auto-training from ${trips.length} existing trips...`);
    
    let patternsLearned = 0;
    let rulesAdapted = 0;
    
    // Learn from successful extractions (high confidence data)
    const successfulExtractions = trips.filter(trip => {
      const extractedData = trip.extracted_data || trip.trip_data;
      return extractedData && 
             extractedData.driver_earnings > 0 && 
             extractedData.distance > 0 &&
             (trip.ocr_data?.extraction_quality !== 'LOW');
    });
    
    console.log(`✅ Found ${successfulExtractions.length} successful extractions to learn from`);
    
    // Auto-learn patterns from successful data
    successfulExtractions.forEach(trip => {
      const extractedData = trip.extracted_data || trip.trip_data;
      
      // Learn earnings patterns
      if (extractedData.driver_earnings) {
        this.learnPattern('earnings', extractedData.driver_earnings, trip.ocr_data?.raw_text || '');
        patternsLearned++;
      }
      
      // Learn distance patterns  
      if (extractedData.distance) {
        this.learnPattern('distance', extractedData.distance, trip.ocr_data?.raw_text || '');
        patternsLearned++;
      }
      
      // Learn trip count patterns
      if (extractedData.total_trips) {
        this.learnPattern('trips', extractedData.total_trips, trip.ocr_data?.raw_text || '');
        patternsLearned++;
      }
    });
    
    // Auto-adapt validation rules based on actual data
    const adaptedRules = this.adaptValidationRules(trips);
    if (adaptedRules.maxTripEarnings !== RIDESHARE_VALIDATION_RULES.maxTripEarnings) rulesAdapted++;
    if (adaptedRules.maxDailyTrips !== RIDESHARE_VALIDATION_RULES.maxDailyTrips) rulesAdapted++;
    if (adaptedRules.maxDailyEarnings !== RIDESHARE_VALIDATION_RULES.maxDailyEarnings) rulesAdapted++;
    
    console.log(`🎯 Auto-training complete: ${patternsLearned} patterns learned, ${rulesAdapted} rules adapted`);
    
    return {
      patternsLearned,
      rulesAdapted,
      confidenceImproved: patternsLearned > 0
    };
  }
  
  // Learn extraction patterns from successful data
  private learnPattern(type: string, value: any, ocrText: string) {
    // Increment pattern frequency
    const key = `${type}_${typeof value}`;
    this.learningMetrics.pattern_frequency[key] = (this.learningMetrics.pattern_frequency[key] || 0) + 1;
    
    // Learn text patterns that led to successful extraction
    if (ocrText && ocrText.length > 10) {
      const patternKey = `${type}_text_pattern`;
      this.learningMetrics.pattern_frequency[patternKey] = (this.learningMetrics.pattern_frequency[patternKey] || 0) + 1;
    }
  }

  // Step 2: Learn from your actual data patterns
  adaptValidationRules(currentTrips: any[]): ValidationRules {
    const adaptedRules = { ...RIDESHARE_VALIDATION_RULES };
    
    // Learn from your actual earnings patterns
    const earnings = currentTrips
      .map(t => parseFloat(t.trip_data?.driver_earnings || 0))
      .filter(e => e > 0);
    
    if (earnings.length > 10) {
      const maxEarnings = Math.max(...earnings);
      const avgEarnings = earnings.reduce((a, b) => a + b, 0) / earnings.length;
      
      // Adapt max earnings based on YOUR actual data (not generic rules)
      adaptedRules.maxTripEarnings = Math.max(maxEarnings * 1.2, 50);
      console.log(`🎯 Learned: Your max trip earnings should be $${adaptedRules.maxTripEarnings.toFixed(2)} (was $50)`);
    }
    
    // Learn from your actual trip frequency
    const tripsByDay = this.groupTripsByDay(currentTrips);
    const dailyCounts = Object.values(tripsByDay).map(trips => trips.length);
    
    if (dailyCounts.length > 3) {
      const maxDailyTrips = Math.max(...dailyCounts);
      adaptedRules.maxDailyTrips = Math.max(maxDailyTrips * 1.1, 25);
      console.log(`🎯 Learned: Your max daily trips should be ${adaptedRules.maxDailyTrips} (was 25)`);
    }
    
    return adaptedRules;
  }

  // Step 3: Improve OCR accuracy with pattern recognition (now auto-learned)
  improveOCRExtraction(rawText: string, imageType: string): any {
    // Use patterns learned from existing successful extractions
    const patterns = this.getLearnedPatterns(imageType);
    const confidence = this.calculateExtractionConfidence(rawText, patterns);
    
    // Apply learned patterns to improve extraction
    const extractedData: any = {};
    
    if (imageType === 'final_receipt') {
      // Learn your specific app's UI patterns
      const earningsPattern = patterns.earnings || /\$(\d+\.\d{2})/g;
      const distancePattern = patterns.distance || /(\d+\.\d{1,2})\s*(mi|miles)/i;
      
      const earningsMatch = rawText.match(earningsPattern);
      const distanceMatch = rawText.match(distancePattern);
      
      if (earningsMatch) {
        extractedData.driver_earnings = parseFloat(earningsMatch[1] || earningsMatch[0].replace('$', ''));
      }
      
      if (distanceMatch) {
        extractedData.distance = parseFloat(distanceMatch[1]);
      }
      
      // Track confidence based on pattern matches
      const confidence = (earningsMatch ? 0.5 : 0) + (distanceMatch ? 0.5 : 0);
      extractedData.extraction_confidence = confidence;
    }
    
    return extractedData;
  }

  // Step 4: Generate realistic performance benchmarks from YOUR data
  generatePersonalizedBenchmarks(trips: any[]): {
    excellentPerformance: number;
    goodPerformance: number;
    averagePerformance: number;
    targetEarningsPerTrip: number;
    targetTripsPerDay: number;
  } {
    const validTrips = trips.filter(t => 
      t.trip_data?.driver_earnings > 0 && 
      t.trip_data?.distance > 0
    );
    
    if (validTrips.length < 5) {
      // Not enough data - use conservative defaults
      return {
        excellentPerformance: 80,
        goodPerformance: 60,
        averagePerformance: 40,
        targetEarningsPerTrip: 8.0,
        targetTripsPerDay: 12
      };
    }
    
    // Calculate YOUR actual performance quartiles
    const earningsPerTrip = validTrips.map(t => 
      parseFloat(t.trip_data.driver_earnings) / parseInt(t.trip_data.total_trips || 1)
    );
    
    earningsPerTrip.sort((a, b) => a - b);
    const q1 = earningsPerTrip[Math.floor(earningsPerTrip.length * 0.25)];
    const q3 = earningsPerTrip[Math.floor(earningsPerTrip.length * 0.75)];
    const median = earningsPerTrip[Math.floor(earningsPerTrip.length * 0.5)];
    
    return {
      excellentPerformance: q3 * 10, // Top 25% of YOUR performance
      goodPerformance: median * 10,  // YOUR median performance
      averagePerformance: q1 * 10,   // YOUR bottom 25%
      targetEarningsPerTrip: q3,     // Target based on YOUR best performance
      targetTripsPerDay: this.calculateAverageTripsPerDay(validTrips)
    };
  }

  // Step 5: Adaptive screenshot classification
  classifyScreenshotType(ocrText: string, imagePath: string): string {
    const patterns = this.learningMetrics.pattern_frequency;
    
    // Learn from successful classifications
    if (ocrText.includes('trip') && ocrText.includes('$') && patterns.final_receipt > 5) {
      return 'final_receipt';
    }
    
    if (ocrText.includes('estimate') || ocrText.includes('pickup') && patterns.initial_offer > 5) {
      return 'initial_offer';
    }
    
    if (ocrText.includes('odometer') || ocrText.includes('miles') && patterns.dashboard > 3) {
      return 'dashboard_reading';
    }
    
    return 'unknown';
  }

  // Helper methods
  private identifyCorrectionType(extracted: any, corrected: any): 'earnings' | 'distance' | 'trip_count' | 'other' {
    if (extracted.driver_earnings !== corrected.driver_earnings) return 'earnings';
    if (extracted.distance !== corrected.distance) return 'distance';
    if (extracted.total_trips !== corrected.total_trips) return 'trip_count';
    return 'other';
  }

  private updateLearningMetrics(correction: TrainingData) {
    // Update pattern frequency
    const type = correction.correction_type;
    this.learningMetrics.pattern_frequency[type] = (this.learningMetrics.pattern_frequency[type] || 0) + 1;
    
    // Track accuracy trends
    const accuracy = correction.ocr_confidence;
    this.learningMetrics.accuracy_trends.push({
      date: correction.feedback_timestamp.split('T')[0],
      accuracy
    });
    
    // Identify common errors
    const errorPattern = this.identifyErrorPattern(correction);
    const existingError = this.learningMetrics.common_errors.find(e => e.pattern === errorPattern);
    
    if (existingError) {
      existingError.frequency++;
    } else {
      this.learningMetrics.common_errors.push({
        type: correction.correction_type,
        frequency: 1,
        pattern: errorPattern
      });
    }
  }

  private identifyErrorPattern(correction: TrainingData): string {
    const extracted = correction.extracted_data;
    const validated = correction.validated_data;
    
    if (extracted.driver_earnings === 0 && validated.driver_earnings > 0) {
      return 'missing_earnings_extraction';
    }
    
    if (extracted.distance === 0 && validated.distance > 0) {
      return 'missing_distance_extraction';
    }
    
    if (Math.abs(extracted.driver_earnings - validated.driver_earnings) > 5) {
      return 'significant_earnings_error';
    }
    
    return 'other_extraction_error';
  }

  // Calculate extraction confidence based on learned patterns
  private calculateExtractionConfidence(rawText: string, patterns: Record<string, RegExp>): number {
    let confidence = 0;
    let patternMatches = 0;
    
    Object.entries(patterns).forEach(([type, pattern]) => {
      if (rawText.match(pattern)) {
        patternMatches++;
        // Weight based on learned frequency
        const frequency = this.learningMetrics.pattern_frequency[`${type}_text_pattern`] || 1;
        confidence += Math.min(frequency / 10, 0.4); // Max 0.4 per pattern
      }
    });
    
    return Math.min(confidence, 0.95); // Max 95% confidence
  }

  private getLearnedPatterns(imageType: string): Record<string, RegExp> {
    // Enhanced patterns based on learned successful extractions
    const basePatterns = {
      earnings: /\$(\d+\.\d{2})/g,
      distance: /(\d+\.\d{1,2})\s*(mi|miles)/i,
      trips: /(\d+)\s*(trip|delivery|ride)/i
    };
    
    // Adapt patterns based on learning frequency
    const earningsFreq = this.learningMetrics.pattern_frequency['earnings_number'] || 0;
    const distanceFreq = this.learningMetrics.pattern_frequency['distance_number'] || 0;
    
    if (earningsFreq > 5) {
      // More flexible earnings pattern if we've seen many successful extractions
      basePatterns.earnings = /\$?(\d+\.?\d{0,2})/g;
    }
    
    if (distanceFreq > 5) {
      // More flexible distance pattern
      basePatterns.distance = /(\d+\.?\d{0,2})\s*(mi|miles|mile|m)/i;
    }
    
    return basePatterns;
  }

  private groupTripsByDay(trips: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    
    trips.forEach(trip => {
      const date = trip.trip_data?.trip_date || trip.created_at?.split('T')[0];
      if (date) {
        if (!groups[date]) groups[date] = [];
        groups[date].push(trip);
      }
    });
    
    return groups;
  }

  private calculateAverageTripsPerDay(trips: any[]): number {
    const dailyGroups = this.groupTripsByDay(trips);
    const dailyCounts = Object.values(dailyGroups).map(dayTrips => 
      dayTrips.reduce((sum, trip) => sum + parseInt(trip.trip_data?.total_trips || 1), 0)
    );
    
    return dailyCounts.length > 0 
      ? dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length 
      : 10;
  }

  // Export learning data for model fine-tuning
  exportTrainingData(): {
    corrections: TrainingData[];
    patterns: LearningMetrics;
    recommendations: string[];
  } {
    const recommendations = [];
    
    if (this.learningMetrics.common_errors.find(e => e.pattern === 'missing_earnings_extraction')) {
      recommendations.push('Consider using a specialized rideshare OCR model');
    }
    
    if (this.learningMetrics.accuracy_trends.slice(-5).every(t => t.accuracy < 0.7)) {
      recommendations.push('Recent OCR accuracy is declining - consider image quality improvements');
    }
    
    return {
      corrections: this.trainingData,
      patterns: this.learningMetrics,
      recommendations
    };
  }
}

// Import existing validation rules
import { RIDESHARE_VALIDATION_RULES, ValidationRules } from './data-validator';

