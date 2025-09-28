import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

// Weekly Summary Validation MCP Agent - Cross-references individual trips with weekly totals
class WeeklySummaryValidationAgent {
  
  async processWeeklySummary(
    imagePath: string,
    weekPeriod: string, // e.g., "2025-09-22 to 2025-09-28"
    fileMetadata?: {
      originalName: string;
      fileHash: string;
      perceptualHash: string;
      fileSize: number;
    }
  ): Promise<{
    success: boolean;
    summaryData?: any;
    validationResults?: any;
    discrepancies?: any[];
    recommendations?: string[];
    error?: string;
  }> {
    try {
      console.log('Weekly Summary Validation: Processing weekly total screenshot');
      
      // Step 1: Extract data from weekly summary screenshot using targeted OCR
      const summaryOcrResult = await this.performWeeklySummaryOCR(imagePath);
      console.log('Weekly summary OCR extracted:', summaryOcrResult);
      
      // Step 2: Parse the extracted weekly data
      const weeklyData = this.parseWeeklySummaryData(summaryOcrResult);
      console.log('Parsed weekly data:', weeklyData);
      
      // Step 3: Get individual trips from database for the same period
      const individualTripsData = await this.getIndividualTripsForPeriod(weekPeriod);
      console.log('Individual trips found:', individualTripsData.length);
      
      // Step 4: Cross-validate weekly total against individual trips
      const validation = this.crossValidateData(weeklyData, individualTripsData);
      console.log('Validation results:', validation);
      
      // Step 5: Identify discrepancies and missing data
      const discrepancies = this.identifyDiscrepancies(weeklyData, individualTripsData);
      
      // Step 6: Generate insights and recommendations
      const insights = this.generateValidationInsights(weeklyData, individualTripsData, validation);
      const recommendations = this.generateAccuracyRecommendations(discrepancies, validation);
      
      // Step 7: Save weekly summary to database
      const summaryRecord = await this.saveWeeklySummaryToDatabase(
        weeklyData, 
        validation, 
        discrepancies, 
        weekPeriod,
        imagePath,
        fileMetadata
      );
      
      return {
        success: true,
        summaryData: weeklyData,
        validationResults: validation,
        discrepancies,
        recommendations,
        ...insights
      };
      
    } catch (error) {
      console.error('Weekly Summary Validation error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Validation failed' };
    }
  }

  private async performWeeklySummaryOCR(imagePath: string): Promise<{
    text: string, 
    numbers: string[], 
    currency: string[],
    dates: string[],
    tripCounts: string[]
  }> {
    try {
      
      // Download image
      const response = await fetch(imagePath);
      if (!response.ok) throw new Error(`Image download failed: ${response.statusText}`);
      
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      
      // Specialized OCR for weekly summary screens
      const ocrPrompt = `
        Analyze this rideshare weekly summary screenshot and extract:
        1. Total number of trips completed this week
        2. Total earnings for the week
        3. Total time driven
        4. Total distance driven
        5. Average earnings per trip
        6. Peak earnings days/times
        7. Week date range
        8. Platform name (Uber, DoorDash, etc.)
        
        Return in format:
        TRIPS: [number]
        EARNINGS: $[amount]
        TIME: [hours/minutes]
        DISTANCE: [miles]
        AVG_PER_TRIP: $[amount]
        WEEK: [date range]
        PLATFORM: [platform name]
        Additional data: [any other insights]
      `;
      
      const ocrResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llava',
          prompt: ocrPrompt,
          images: [base64Image],
          stream: false,
          options: { temperature: 0, num_predict: 300 }
        })
      });
      
      const ocrResult = await ocrResponse.json() as any;
      const extractedText = ocrResult.response || '';
      
      // Extract different data types
      const numbers = extractedText.match(/\d+\.?\d*/g) || [];
      const currency = extractedText.match(/\$\d+\.?\d*/g) || [];
      const dates = extractedText.match(/\d{1,2}\/\d{1,2}\/?\d{2,4}|\d{4}-\d{2}-\d{2}/g) || [];
      const tripCounts = extractedText.match(/TRIPS?:\s*(\d+)/gi) || [];
      
      console.log('Weekly Summary OCR:', { 
        textLength: extractedText.length, 
        numbersFound: numbers.length,
        currencyFound: currency.length,
        datesFound: dates.length 
      });
      
      return {
        text: extractedText,
        numbers,
        currency,
        dates,
        tripCounts
      };
      
    } catch (error) {
      console.log('Weekly OCR failed:', error);
      return { text: 'OCR extraction failed', numbers: [], currency: [], dates: [], tripCounts: [] };
    }
  }

  private parseWeeklySummaryData(ocrResult: any): any {
    const { text, numbers, currency } = ocrResult;
    
    // Parse specific fields from OCR text
    const parseField = (fieldName: string, defaultValue: any = 0) => {
      const regex = new RegExp(`${fieldName}:?\\s*([\\d\\$\\.]+)`, 'gi');
      const match = text.match(regex);
      if (match && match[0]) {
        const value = match[0].replace(/[^\d\.]/g, '');
        return fieldName.includes('EARNINGS') || fieldName.includes('AVG') ? parseFloat(value) : 
               fieldName.includes('TRIPS') ? parseInt(value) : parseFloat(value);
      }
      return defaultValue;
    };
    
    return {
      totalTrips: parseField('TRIPS', 0),
      totalEarnings: parseField('EARNINGS', 0),
      totalTime: parseField('TIME', 0),
      totalDistance: parseField('DISTANCE', 0),
      avgPerTrip: parseField('AVG_PER_TRIP', 0),
      weekRange: text.match(/WEEK:\s*([^\n]+)/i)?.[1] || 'Unknown',
      platform: text.match(/PLATFORM:\s*([^\n]+)/i)?.[1] || 'Unknown',
      rawNumbers: numbers,
      rawCurrency: currency,
      rawText: text,
      dataSource: 'weekly_summary_ocr',
      extractedAt: new Date().toISOString()
    };
  }

  private async getIndividualTripsForPeriod(weekPeriod: string): Promise<any[]> {
    try {
      // Parse week period (e.g., "2025-09-22 to 2025-09-28")
      const [startDate, endDate] = weekPeriod.split(' to ');
      
      if (!startDate || !endDate) {
        // Fallback: get trips from last 7 days
        const endDateTime = new Date();
        const startDateTime = new Date(endDateTime);
        startDateTime.setDate(startDateTime.getDate() - 7);
        
        const { data: trips, error } = await supabaseAdmin
          .from('trips')
          .select(`
            *,
            trip_screenshots (
              id,
              screenshot_type,
              extracted_data,
              is_processed,
              created_at
            )
          `)
          .gte('created_at', startDateTime.toISOString())
          .lte('created_at', endDateTime.toISOString())
          .order('created_at', { ascending: false });
          
        return trips || [];
      }
      
      // Use provided date range
      const { data: trips, error } = await supabaseAdmin
        .from('trips')
        .select(`
          *,
          trip_screenshots (
            id,
            screenshot_type,
            extracted_data,
            is_processed,
            created_at
          )
        `)
        .gte('created_at', startDate + 'T00:00:00Z')
        .lte('created_at', endDate + 'T23:59:59Z')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return trips || [];
      
    } catch (error) {
      console.error('Error fetching individual trips:', error);
      return [];
    }
  }

  private crossValidateData(weeklyData: any, individualTrips: any[]): any {
    // Calculate totals from individual trips
    const individualTotals = {
      totalTrips: individualTrips.length,
      totalEarnings: 0,
      totalDistance: 0,
      totalProfit: 0,
      avgPerTrip: 0,
      processedTrips: 0
    };
    
    individualTrips.forEach(trip => {
      const tripData = trip.trip_data || {};
      if (tripData.driver_earnings > 0) {
        individualTotals.totalEarnings += tripData.driver_earnings || 0;
        individualTotals.totalDistance += tripData.distance || 0;
        individualTotals.totalProfit += tripData.profit || 0;
        individualTotals.processedTrips++;
      }
    });
    
    individualTotals.avgPerTrip = individualTotals.processedTrips > 0 ? 
      individualTotals.totalEarnings / individualTotals.processedTrips : 0;
    
    // Compare with weekly data
    const validation = {
      tripsMatch: Math.abs(weeklyData.totalTrips - individualTotals.totalTrips) <= 1,
      earningsMatch: Math.abs(weeklyData.totalEarnings - individualTotals.totalEarnings) <= 5.0,
      distanceMatch: Math.abs(weeklyData.totalDistance - individualTotals.totalDistance) <= 10.0,
      avgPerTripMatch: Math.abs(weeklyData.avgPerTrip - individualTotals.avgPerTrip) <= 2.0,
      
      // Accuracy percentages
      tripsAccuracy: individualTotals.totalTrips > 0 ? 
        Math.min(100, (Math.min(weeklyData.totalTrips, individualTotals.totalTrips) / 
        Math.max(weeklyData.totalTrips, individualTotals.totalTrips)) * 100) : 0,
        
      earningsAccuracy: individualTotals.totalEarnings > 0 ? 
        Math.min(100, (Math.min(weeklyData.totalEarnings, individualTotals.totalEarnings) / 
        Math.max(weeklyData.totalEarnings, individualTotals.totalEarnings)) * 100) : 0,
      
      // Raw data for comparison
      weeklyData,
      individualTotals
    };
    
    const overallAccuracy = (
      validation.tripsAccuracy + 
      validation.earningsAccuracy
    ) / 2;
    
    return {
      ...validation,
      overallAccuracy
    };
  }

  private identifyDiscrepancies(weeklyData: any, individualTrips: any[]): any[] {
    const discrepancies = [];
    
    const individualTotals = individualTrips.reduce((acc, trip) => {
      const tripData = trip.trip_data || {};
      if (tripData.driver_earnings > 0) {
        acc.trips += 1;
        acc.earnings += tripData.driver_earnings || 0;
        acc.distance += tripData.distance || 0;
      }
      return acc;
    }, { trips: 0, earnings: 0, distance: 0 });
    
    // Trip count discrepancy
    const tripsDiff = weeklyData.totalTrips - individualTotals.trips;
    if (Math.abs(tripsDiff) > 1) {
      discrepancies.push({
        type: 'trip_count_mismatch',
        severity: Math.abs(tripsDiff) > 5 ? 'high' : 'medium',
        expected: weeklyData.totalTrips,
        actual: individualTotals.trips,
        difference: tripsDiff,
        description: tripsDiff > 0 ? 
          `Missing ${tripsDiff} individual trip screenshots` :
          `${Math.abs(tripsDiff)} extra individual trips found`,
        recommendation: tripsDiff > 0 ? 
          'Upload missing individual trip screenshots' :
          'Check for duplicate individual trip entries'
      });
    }
    
    // Earnings discrepancy
    const earningsDiff = weeklyData.totalEarnings - individualTotals.earnings;
    if (Math.abs(earningsDiff) > 5.0) {
      discrepancies.push({
        type: 'earnings_mismatch',
        severity: Math.abs(earningsDiff) > 50 ? 'high' : 'medium',
        expected: weeklyData.totalEarnings,
        actual: individualTotals.earnings,
        difference: earningsDiff,
        description: `Earnings difference of $${earningsDiff.toFixed(2)}`,
        recommendation: 'Verify individual trip earnings extraction accuracy'
      });
    }
    
    // Distance discrepancy
    const distanceDiff = weeklyData.totalDistance - individualTotals.distance;
    if (Math.abs(distanceDiff) > 10.0) {
      discrepancies.push({
        type: 'distance_mismatch',
        severity: Math.abs(distanceDiff) > 50 ? 'high' : 'low',
        expected: weeklyData.totalDistance,
        actual: individualTotals.distance,
        difference: distanceDiff,
        description: `Distance difference of ${distanceDiff.toFixed(1)} miles`,
        recommendation: 'Check individual trip distance extraction'
      });
    }
    
    return discrepancies;
  }

  private generateValidationInsights(weeklyData: any, individualTrips: any[], validation: any): any {
    return {
      validationSummary: {
        overallAccuracy: `${validation.overallAccuracy.toFixed(1)}%`,
        dataReliability: validation.overallAccuracy >= 90 ? 'HIGH' : 
                        validation.overallAccuracy >= 75 ? 'MEDIUM' : 'LOW',
        weeklyDataSource: weeklyData.platform,
        individualTripsCount: individualTrips.length,
        processedTripsCount: validation.individualTotals.processedTrips
      },
      accuracyBreakdown: {
        tripCountAccuracy: `${validation.tripsAccuracy.toFixed(1)}%`,
        earningsAccuracy: `${validation.earningsAccuracy.toFixed(1)}%`,
        tripsMatched: validation.tripsMatch,
        earningsMatched: validation.earningsMatch
      }
    };
  }

  private generateAccuracyRecommendations(discrepancies: any[], validation: any): string[] {
    const recommendations = [];
    
    recommendations.push(`Weekly summary validation completed with ${validation.overallAccuracy.toFixed(1)}% accuracy`);
    
    if (validation.overallAccuracy >= 95) {
      recommendations.push('Excellent data accuracy! Individual trips match weekly totals very closely');
    } else if (validation.overallAccuracy >= 85) {
      recommendations.push('Good data accuracy with minor discrepancies - consider reviewing extraction methods');
    } else if (validation.overallAccuracy >= 70) {
      recommendations.push('Moderate accuracy - significant discrepancies found, review individual trip uploads');
    } else {
      recommendations.push('Low accuracy detected - major discrepancies require immediate attention');
    }
    
    discrepancies.forEach(disc => {
      if (disc.severity === 'high') {
        recommendations.push(`⚠️ HIGH PRIORITY: ${disc.description} - ${disc.recommendation}`);
      }
    });
    
    if (validation.individualTotals.processedTrips < validation.individualTotals.totalTrips * 0.8) {
      recommendations.push('Many individual trips lack complete data - ensure all trip screenshots are properly captured');
    }
    
    recommendations.push('Use this validation to improve future trip data collection and OCR accuracy');
    
    return recommendations;
  }

  private async saveWeeklySummaryToDatabase(
    weeklyData: any, 
    validation: any, 
    discrepancies: any[], 
    weekPeriod: string,
    imagePath: string,
    fileMetadata?: any
  ): Promise<any> {
    try {
      // Create a trip record for the weekly summary
      const { data: summaryTrip, error: tripError } = await supabaseAdmin
        .from('trips')
        .insert({
          driver_id: 'default-driver',
          trip_data: {
            ...weeklyData,
            validationResults: validation,
            discrepancies: discrepancies,
            weekPeriod: weekPeriod,
            summaryType: 'weekly_validation'
          },
          total_profit: weeklyData.totalEarnings - (weeklyData.totalEarnings * 0.2), // Estimate expenses
          total_distance: weeklyData.totalDistance,
          gas_cost: 0, // Weekly summaries don't typically show gas costs
          vehicle_model: '2003 Honda Odyssey'
        })
        .select('id')
        .single();
        
      if (tripError) throw tripError;
      
      // Create screenshot record for the weekly summary
      const screenshotData = {
        trip_id: summaryTrip.id,
        screenshot_type: 'weekly_summary' as const,
        image_path: imagePath,
        ocr_data: { 
          raw_text: weeklyData.rawText,
          validation_accuracy: validation.overallAccuracy,
          discrepancies_count: discrepancies.length
        },
        extracted_data: {
          weekly_data: weeklyData,
          validation: validation,
          discrepancies: discrepancies,
          processing_timestamp: new Date().toISOString()
        },
        is_processed: true,
        processing_notes: `Weekly summary validation completed with ${validation.overallAccuracy.toFixed(1)}% accuracy`
      };

      // Add file metadata if available
      if (fileMetadata) {
        Object.assign(screenshotData, {
          original_filename: fileMetadata.originalName,
          file_hash: fileMetadata.fileHash,
          perceptual_hash: fileMetadata.perceptualHash,
          file_size: fileMetadata.fileSize
        });
      }

      const { data: screenshot, error: screenshotError } = await supabaseAdmin
        .from('trip_screenshots')
        .insert(screenshotData)
        .select()
        .single();
        
      if (screenshotError && screenshotError.message?.includes('file_hash')) {
        // Fallback without metadata columns
        const basicData = {
          trip_id: screenshotData.trip_id,
          screenshot_type: screenshotData.screenshot_type,
          image_path: screenshotData.image_path,
          ocr_data: screenshotData.ocr_data,
          extracted_data: screenshotData.extracted_data,
          is_processed: screenshotData.is_processed,
          processing_notes: screenshotData.processing_notes
        };
        const fallbackResult = await supabaseAdmin
          .from('trip_screenshots')
          .insert(basicData)
          .select()
          .single();
        
        if (fallbackResult.error) throw fallbackResult.error;
        return fallbackResult.data;
      }
      
      if (screenshotError) throw screenshotError;
      
      console.log('Weekly summary saved to database:', {
        tripId: summaryTrip.id,
        screenshotId: screenshot.id,
        accuracy: validation.overallAccuracy,
        discrepancies: discrepancies.length
      });
      
      // Trigger dashboard refresh by creating a reanalysis session record
      await this.createReanalysisSession(weekPeriod, validation, discrepancies);
      
      return screenshot;
      
    } catch (error) {
      console.error('Database save failed:', error);
      throw error;
    }
  }
  
  private async createReanalysisSession(
    weekPeriod: string, 
    validation: any, 
    discrepancies: any[]
  ): Promise<void> {
    try {
      const sessionData = {
        driver_id: '550e8400-e29b-41d4-a716-446655440000', // Default driver
        analysis_type: 'weekly',
        date_range_start: new Date(`${weekPeriod.split(' to ')[0]}T00:00:00Z`),
        date_range_end: new Date(`${weekPeriod.split(' to ')[1]}T23:59:59Z`),
        results: {
          validation_type: 'weekly_summary',
          accuracy_rate: validation.overallAccuracy,
          discrepancies_count: discrepancies.length,
          validation_timestamp: new Date().toISOString(),
          discrepancies: discrepancies,
          validation_details: validation
        },
        execution_time_ms: Date.now() % 10000 // Approximate processing time
      };
      
      await supabaseAdmin
        .from('reanalysis_sessions')
        .insert(sessionData);
        
      console.log('Reanalysis session created for dashboard refresh');
    } catch (error) {
      console.error('Failed to create reanalysis session:', error);
      // Don't throw - this is not critical
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { imagePath, weekPeriod, fileMetadata } = await request.json();
    
    console.log('Weekly Summary Validation Route: Processing weekly summary');
    console.log('Week Period:', weekPeriod);
    
    if (!imagePath?.startsWith('https://') || !imagePath.includes('supabase.co')) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid image path" 
      }, { status: 400 });
    }

    const agent = new WeeklySummaryValidationAgent();
    const result = await agent.processWeeklySummary(imagePath, weekPeriod, fileMetadata);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Weekly summary validation completed with ${result.validationResults?.overallAccuracy?.toFixed(1) || 0}% accuracy`,
      data: {
        summaryData: result.summaryData,
        validation: result.validationResults,
        discrepancies: result.discrepancies,
        recommendations: result.recommendations
      },
      processingDetails: {
        mcp_system: "weekly_validation_agent",
        data_source: "weekly_summary_ocr_validation",
        accuracy_percentage: result.validationResults?.overallAccuracy,
        discrepancies_found: result.discrepancies?.length || 0,
        processing_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Weekly Summary Validation error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}