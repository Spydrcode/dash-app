// Flexible Screenshot Data Detection System
// Each screenshot type has its own data structure and validation rules

export interface ScreenshotDataStructure {
  screenshot_type: 'initial_offer' | 'final_total' | 'dashboard_odometer' | 'trip_  private parseOcrResponse(response: string, template: Record<string, unknown>): ScreenshotDataStructure {ummary' | 'earnings_summary' | 'map_route' | 'unknown';
  data_confidence: number; // 0-1 confidence score
  detected_elements: string[]; // List of data elements found
  extracted_data: Record<string, unknown>; // Flexible data structure
  missing_elements: string[]; // Expected but not found
  ocr_raw: {
    text: string;
    numbers: number[];
    confidence: number;
  };
}

export const SCREENSHOT_DATA_TEMPLATES = {
  initial_offer: {
    expected_fields: ['pickup_location', 'dropoff_location', 'estimated_fare', 'estimated_time', 'distance'],
    required_fields: ['estimated_fare', 'distance'],
    data_structure: {
      pickup_location: null,
      dropoff_location: null,
      estimated_fare: null,
      estimated_tip: null,
      estimated_time: null,
      distance: null,
      platform: null,
      surge_multiplier: null,
      trip_type: 'estimated'
    }
  },
  
  final_total: {
    expected_fields: ['total_earnings', 'actual_tip', 'trip_time', 'final_fare'],
    required_fields: ['total_earnings'],
    data_structure: {
      total_earnings: null,
      base_fare: null,
      actual_tip: null,
      trip_time: null,
      final_fare: null,
      fees: null,
      bonus: null,
      trip_type: 'completed'
    }
  },
  
  dashboard_odometer: {
    expected_fields: ['odometer_reading', 'fuel_level'],
    required_fields: ['odometer_reading'],
    data_structure: {
      odometer_reading: null,
      fuel_level: null,
      dashboard_time: null,
      trip_type: 'odometer_reading'
    }
  },
  
  trip_summary: {
    expected_fields: ['total_trips', 'total_earnings', 'total_distance', 'active_time'],
    required_fields: ['total_trips', 'total_earnings'],
    data_structure: {
      total_trips: null,
      total_earnings: null,
      total_distance: null,
      active_time: null,
      summary_period: null,
      trip_type: 'summary'
    }
  },
  
  earnings_summary: {
    expected_fields: ['gross_earnings', 'net_earnings', 'tips', 'bonuses', 'fees'],
    required_fields: ['gross_earnings'],
    data_structure: {
      gross_earnings: null,
      net_earnings: null,
      tips_total: null,
      bonuses: null,
      fees_deducted: null,
      tax_info: null,
      period: null,
      trip_type: 'earnings'
    }
  },
  
  map_route: {
    expected_fields: ['route_distance', 'estimated_time', 'pickup_address', 'dropoff_address'],
    required_fields: ['route_distance'],
    data_structure: {
      route_distance: null,
      estimated_time: null,
      pickup_address: null,
      dropoff_address: null,
      route_type: null,
      trip_type: 'route_info'
    }
  }
};

export class FlexibleScreenshotProcessor {
  
  async processScreenshot(imageBase64: string, options: Record<string, unknown> = {}) {
    console.log('📸 Processing screenshot with flexible data detection...');
    
    try {
      // Step 1: Detect screenshot type using GPT-4V
      const detectedType = await this.detectScreenshotType(imageBase64, options.suggestedType as string);
      console.log(`🔍 Detected screenshot type: ${detectedType}`);
      
      // Step 2: Extract data based on detected type
      const extractedData = await this.extractDataForType(imageBase64, detectedType);
      
      // Step 3: Validate and structure data
      const structuredData = this.structureDataForType(extractedData, detectedType);
      
      return structuredData;
      
    } catch (error) {
      console.error('❌ Screenshot processing failed:', error);
      return this.createFallbackStructure(imageBase64);
    }
  }

  private async detectScreenshotType(imageBase64: string, suggestedType?: string): Promise<string> {
    try {
      const prompt = `Analyze this rideshare/delivery app screenshot and identify its type. 

Look for these indicators:
- INITIAL OFFER: Shows pickup/dropoff locations, estimated fare, estimated time, "Accept" button
- FINAL TOTAL: Shows completed trip earnings, actual tip, total payment, "Rate rider" 
- DASHBOARD ODOMETER: Shows vehicle dashboard with odometer/mileage reading
- TRIP SUMMARY: Shows multiple trips summary, total earnings, trip count for a period
- EARNINGS SUMMARY: Shows earnings breakdown, tips, bonuses, fees for a time period
- MAP ROUTE: Shows map with pickup/dropoff pins, route line, distance/time

Respond with ONLY one word: initial_offer, final_total, dashboard_odometer, trip_summary, earnings_summary, map_route, or unknown`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` } 
              }
            ]
          }],
          max_tokens: 20,
          temperature: 0.1
        })
      });

      if (response.ok) {
        const result = await response.json();
        const detected = result.choices?.[0]?.message?.content?.trim().toLowerCase() || 'unknown';
        
        // Validate detected type
        if (Object.keys(SCREENSHOT_DATA_TEMPLATES).includes(detected)) {
          return detected;
        }
      }
      
      // Fallback to suggested type or unknown
      return suggestedType || 'unknown';
      
    } catch (error) {
      console.error('⚠️ Type detection failed:', error);
      return suggestedType || 'unknown';
    }
  }

  private async extractDataForType(imageBase64: string, screenshotType: string): Promise<Record<string, unknown>> {
    const template = SCREENSHOT_DATA_TEMPLATES[screenshotType as keyof typeof SCREENSHOT_DATA_TEMPLATES];
    
    if (!template) {
      return this.extractGenericData(imageBase64);
    }

    const prompt = this.buildExtractionPrompt(screenshotType, template);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` } 
              }
            ]
          }],
          max_tokens: 300,
          temperature: 0
        })
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || '';
        return this.parseExtractionResponse(content, screenshotType);
      }
      
      throw new Error('OCR failed');
      
    } catch (error) {
      console.error('⚠️ Data extraction failed:', error);
      return this.extractGenericData(imageBase64);
    }
  }

  private buildExtractionPrompt(screenshotType: string, template: Record<string, unknown>): string {
    const expectedFields = Array.isArray(template.expected_fields) ? template.expected_fields.join(', ') : 'basic data';
    
    return `Extract data from this ${screenshotType.replace('_', ' ')} screenshot.

Expected data elements: ${expectedFields}

Instructions:
- Extract only the data that is clearly visible
- Use null for any missing/unclear data
- Be conservative - if uncertain, use null
- Focus on numbers, amounts, distances, locations

Return ONLY valid JSON with this structure:
${JSON.stringify(template.data_structure, null, 2)}

Fill in the values you can clearly see, leave others as null.`;
  }

  private parseExtractionResponse(response: string, screenshotType: string): Record<string, unknown> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn('⚠️ Could not parse extraction response');
    }
    
    // Fallback to basic number extraction
    return this.extractBasicNumbers(response, screenshotType);
  }

  private extractBasicNumbers(text: string, screenshotType: string): Record<string, unknown> {
    const numbers = text.match(/\$?(\d+\.?\d*)/g)?.map(n => parseFloat(n.replace('$', ''))) || [];
    const template = SCREENSHOT_DATA_TEMPLATES[screenshotType as keyof typeof SCREENSHOT_DATA_TEMPLATES];
    
    if (!template) return {};
    
    const result: Record<string, unknown> = { ...template.data_structure as Record<string, unknown> };
    
    // Basic heuristic assignment based on screenshot type
    switch (screenshotType) {
      case 'initial_offer':
        if (numbers[0]) result.estimated_fare = numbers[0];
        if (numbers[1]) result.distance = numbers[1];
        if (numbers[2]) result.estimated_time = numbers[2];
        break;
        
      case 'final_total':
        if (numbers[0]) result.total_earnings = numbers[0];
        if (numbers[1]) result.actual_tip = numbers[1];
        break;
        
      case 'dashboard_odometer':
        if (numbers[0]) result.odometer_reading = numbers[0];
        break;
        
      case 'trip_summary':
        if (numbers[0]) result.total_trips = numbers[0];
        if (numbers[1]) result.total_earnings = numbers[1];
        if (numbers[2]) result.total_distance = numbers[2];
        break;
    }
    
    return result;
  }

  private extractGenericData(): Record<string, unknown> {
    // Fallback generic extraction
    return {
      raw_text: 'OCR extraction failed',
      numbers_found: [],
      confidence: 0.1
    };
  }

  private structureDataForType(extractedData: Record<string, unknown>, screenshotType: string): ScreenshotDataStructure {
    const template = SCREENSHOT_DATA_TEMPLATES[screenshotType as keyof typeof SCREENSHOT_DATA_TEMPLATES];
    
    if (!template) {
      return this.createFallbackStructure('');
    }

    // Identify what data was found vs missing
    const detectedElements: string[] = [];
    const missingElements: string[] = [];
    
    for (const field of template.expected_fields) {
      if (extractedData[field] !== null && extractedData[field] !== undefined) {
        detectedElements.push(field);
      } else {
        missingElements.push(field);
      }
    }

    // Calculate confidence based on required fields found
    const requiredFound = template.required_fields.filter(field => 
      extractedData[field] !== null && extractedData[field] !== undefined
    );
    const confidence = requiredFound.length / template.required_fields.length;

    return {
      screenshot_type: (screenshotType as ScreenshotDataStructure['screenshot_type']) || 'unknown',
      data_confidence: confidence,
      detected_elements: detectedElements,
      extracted_data: extractedData,
      missing_elements: missingElements,
      ocr_raw: {
        text: (typeof extractedData.raw_text === 'string' ? extractedData.raw_text : ''),
        numbers: (Array.isArray(extractedData.numbers_found) ? extractedData.numbers_found : []),
        confidence: confidence
      }
    };
  }

  private createFallbackStructure(): ScreenshotDataStructure {
    return {
      screenshot_type: 'unknown',
      data_confidence: 0.1,
      detected_elements: [],
      extracted_data: {
        processing_error: 'Could not process screenshot',
        raw_text: 'Extraction failed'
      },
      missing_elements: ['all_data'],
      ocr_raw: {
        text: 'Processing failed',
        numbers: [],
        confidence: 0.1
      }
    };
  }

  // Method to combine data from multiple screenshots of the same trip
  static combineScreenshotData(screenshots: ScreenshotDataStructure[]): Record<string, unknown> {
    console.log(`🔄 Combining data from ${screenshots.length} screenshots...`);
    
    const combinedData: Record<string, unknown> = {
      trip_type: 'combined',
      data_sources: screenshots.map(s => s.screenshot_type),
      combined_confidence: 0,
      screenshots_processed: screenshots.length
    };

    let totalConfidence = 0;
    let processedCount = 0;

    // Merge data from all screenshots
    for (const screenshot of screenshots) {
      if (screenshot.data_confidence > 0.3) { // Only use reliable data
        Object.assign(combinedData, screenshot.extracted_data);
        totalConfidence += screenshot.data_confidence;
        processedCount++;
      }
    }

    combinedData.combined_confidence = processedCount > 0 ? totalConfidence / processedCount : 0;

    // Calculate profit if we have enough data
    if (typeof combinedData.total_earnings === 'number' && typeof combinedData.distance === 'number') {
      const fuelCost = (combinedData.distance * 0.18) || 0; // Honda Odyssey fuel cost
      combinedData.estimated_profit = combinedData.total_earnings - fuelCost;
    }

    const confidencePercent = typeof combinedData.combined_confidence === 'number' 
      ? (combinedData.combined_confidence * 100).toFixed(1) 
      : '0.0';
    console.log(`✅ Combined data confidence: ${confidencePercent}%`);
    
    return combinedData;
  }
}