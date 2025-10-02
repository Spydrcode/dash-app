// Enhanced OpenAI GPT Service with Token Tracking & Intelligent Caching
// Uses ONLY GPT-4 models with comprehensive usage monitoring

import { supabaseAdmin } from './supabase';

export interface TokenUsage {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_estimate: number;
  timestamp: string;
  request_type: 'vision' | 'insights' | 'analysis';
  screenshot_id?: string;
}

export interface CachedInsight {
  id: string;
  insight_hash: string;
  insights_data: Record<string, unknown>;
  token_usage: TokenUsage;
  created_at: string;
  screenshots_processed: string[];
  trip_count: number;
  total_earnings: number;
}

// GPT Pricing (per 1K tokens) - Updated rates
const GPT_PRICING = {
  'gpt-4': {
    input: 0.03,   // $0.03 per 1K input tokens
    output: 0.06   // $0.06 per 1K output tokens
  },
  'gpt-4-turbo': {
    input: 0.01,   // $0.01 per 1K input tokens  
    output: 0.03   // $0.03 per 1K output tokens
  },
  'gpt-4o': {
    input: 0.005,  // $0.005 per 1K input tokens (vision-capable)
    output: 0.015  // $0.015 per 1K output tokens
  }
};

export class GPTServiceWithTracking {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private totalTokensUsed = 0;
  private totalCostAccumulated = 0;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.error('❌ OPENAI_API_KEY not found in environment');
      throw new Error('OpenAI API key is required');
    }
  }

  // Main screenshot processing with GPT-4o vision
  async processScreenshotWithGPT4(imageBase64: string, screenshotType: string, screenshotId: string): Promise<Record<string, unknown>> {
    console.log(`👁️ Processing ${screenshotType} screenshot ${screenshotId} with GPT-4o vision...`);

    try {
      // Check if this screenshot was already processed (avoid reprocessing)
      const existingResult = await this.getCachedScreenshotResult(screenshotId);
      if (existingResult) {
        console.log(`✅ Found cached result for screenshot ${screenshotId}`);
        return existingResult;
      }

      const prompt = this.buildVisionPrompt(screenshotType);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ GPT-4o API error:`, errorData);
        throw new Error(`GPT-4o API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      
      // Track token usage
      const tokenUsage: TokenUsage = {
        model: 'gpt-4o',
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        total_tokens: result.usage.total_tokens,
        cost_estimate: this.calculateCost('gpt-4o', result.usage.prompt_tokens, result.usage.completion_tokens),
        timestamp: new Date().toISOString(),
        request_type: 'vision',
        screenshot_id: screenshotId
      };

      await this.saveTokenUsage(tokenUsage);
      this.updateRunningTotals(tokenUsage);

      console.log(`📊 GPT-4o Vision: ${tokenUsage.total_tokens} tokens ($${tokenUsage.cost_estimate.toFixed(4)})`);

      // Parse and cache the result
      const parsedResult = this.parseVisionResponse(result.choices[0].message.content);
      await this.cacheScreenshotResult(screenshotId, parsedResult, tokenUsage);

      return parsedResult;

    } catch (error) {
      console.error(`❌ GPT-4o vision processing failed for ${screenshotId}:`, error);
      return {
        error: 'Vision processing failed',
        extracted_data: {},
        ocr_data: {
          extraction_quality: 'LOW',
          confidence: 0,
          model_used: 'gpt-4o-failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // AI insights generation with GPT-4 Turbo
  async generateInsights(tripsData: Record<string, unknown>, analysisType: Record<string, unknown>): Promise<Record<string, unknown>> {
    const model = 'gpt-4-turbo';
    console.log(`🧠 Generating insights with ${model}...`);
    
    const data = { tripsData, analysisType };

    try {
      // Check for cached insights first
      const cachedInsights = await this.getCachedInsights(data);
      if (cachedInsights) {
        console.log(`✅ Using cached insights (saved ${cachedInsights.token_usage.total_tokens} tokens)`);
        return cachedInsights.insights_data;
      }

      const prompt = this.buildInsightPrompt(data);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert rideshare analytics AI. Provide detailed, actionable insights based on trip data. Focus on realistic performance metrics and specific recommendations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ ${model} API error:`, errorData);
        throw new Error(`${model} API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Track token usage
      const tokenUsage: TokenUsage = {
        model,
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        total_tokens: result.usage.total_tokens,
        cost_estimate: this.calculateCost(model, result.usage.prompt_tokens, result.usage.completion_tokens),
        timestamp: new Date().toISOString(),
        request_type: 'insights'
      };

      await this.saveTokenUsage(tokenUsage);
      this.updateRunningTotals(tokenUsage);

      console.log(`📊 ${model} Insights: ${tokenUsage.total_tokens} tokens ($${tokenUsage.cost_estimate.toFixed(4)})`);

      // Parse and cache the insights
      const parsedInsights = this.parseInsightResponse(result.choices[0].message.content);
      await this.cacheInsights(data, parsedInsights, tokenUsage);

      return parsedInsights;

    } catch (error) {
      console.error(`❌ ${model} insights generation failed:`, error);
      return this.generateFallbackInsights();
    }
  }

  // Token usage tracking methods
  private async saveTokenUsage(usage: TokenUsage): Promise<void> {
    try {
      await supabaseAdmin
        .from('token_usage_log')
        .insert({
          model: usage.model,
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          cost_estimate: usage.cost_estimate,
          request_type: usage.request_type,
          screenshot_id: usage.screenshot_id,
          created_at: usage.timestamp
        });
    } catch {
      console.error('Failed to save token usage');
    }
  }

  private updateRunningTotals(usage: TokenUsage): void {
    this.totalTokensUsed += usage.total_tokens;
    this.totalCostAccumulated += usage.cost_estimate;
  }

  // Smart caching methods
  private async getCachedScreenshotResult(screenshotId: string): Promise<Record<string, unknown> | null> {
    try {
      const { data } = await supabaseAdmin
        .from('screenshot_cache')
        .select('*')
        .eq('screenshot_id', screenshotId)
        .single();

      return data?.result_data || null;
    } catch (_error) {
      return null;
    }
  }

  private async cacheScreenshotResult(screenshotId: string, result: Record<string, unknown>, tokenUsage: TokenUsage): Promise<void> {
    try {
      await supabaseAdmin
        .from('screenshot_cache')
        .upsert({
          screenshot_id: screenshotId,
          result_data: result,
          token_usage: tokenUsage,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to cache screenshot result:', error);
    }
  }

  private async getCachedInsights(data: Record<string, unknown>): Promise<CachedInsight | null> {
    try {
      const dataHash = this.generateDataHash(data);
      
      const { data: cached } = await supabaseAdmin
        .from('insights_cache')
        .select('*')
        .eq('insight_hash', dataHash)
        .single();

      // Check if cache is still valid (within 24 hours)
      if (cached && this.isCacheValid(cached.created_at)) {
        return cached;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  private async cacheInsights(data: Record<string, unknown>, insights: Record<string, unknown>, tokenUsage: TokenUsage): Promise<void> {
    try {
      const dataHash = this.generateDataHash(data);
      
      await supabaseAdmin
        .from('insights_cache')
        .upsert({
          insight_hash: dataHash,
          insights_data: insights,
          token_usage: tokenUsage,
          trip_count: (data.totals as Record<string, unknown>)?.trips as number || 0,
          total_earnings: (data.totals as Record<string, unknown>)?.earnings as number || 0,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to cache insights:', error);
    }
  }

  // Public methods for token monitoring
  public async getTokenUsageSummary(): Promise<Record<string, unknown>> {
    try {
      const { data: usageData } = await supabaseAdmin
        .from('token_usage_log')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      if (!usageData) {
        return { total_tokens: 0, total_cost: 0, requests_count: 0 };
      }

      const totalTokens = usageData.reduce((sum, record) => sum + record.total_tokens, 0);
      const totalCost = usageData.reduce((sum, record) => sum + record.cost_estimate, 0);
      const requestsByModel = usageData.reduce((acc, record) => {
        acc[record.model] = (acc[record.model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_tokens: totalTokens,
        total_cost: totalCost,
        requests_count: usageData.length,
        requests_by_model: requestsByModel,
        avg_tokens_per_request: usageData.length > 0 ? totalTokens / usageData.length : 0,
        daily_breakdown: this.calculateDailyBreakdown(usageData),
        current_session: {
          tokens: this.totalTokensUsed,
          cost: this.totalCostAccumulated
        }
      };
    } catch {
      console.error('Failed to get token usage summary');
      return { error: 'Failed to retrieve usage data' };
    }
  }

  // Utility methods
  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = GPT_PRICING[model as keyof typeof GPT_PRICING] || GPT_PRICING['gpt-4'];
    const promptCost = (promptTokens / 1000) * pricing.input;
    const completionCost = (completionTokens / 1000) * pricing.output;
    return promptCost + completionCost;
  }

  private generateDataHash(data: Record<string, unknown>): string {
    // Simple hash based on trip count and earnings to detect when insights need updating
    const key = `${(data.totals as Record<string, unknown>)?.trips || 0}-${(data.totals as Record<string, unknown>)?.earnings || 0}-${data.timeframe || 'all'}`;
    return Buffer.from(key).toString('base64').slice(0, 32);
  }

  private isCacheValid(timestamp: string): boolean {
    const cacheAge = Date.now() - new Date(timestamp).getTime();
    return cacheAge < 24 * 60 * 60 * 1000; // 24 hours
  }

  private calculateDailyBreakdown(usageData: Record<string, unknown>[]): Record<string, Record<string, unknown>> {
    const breakdown: Record<string, Record<string, unknown>> = {};
    
    usageData.forEach(record => {
      const date = (record.created_at as string).split('T')[0];
      if (!breakdown[date]) {
        breakdown[date] = { tokens: 0, cost: 0, requests: 0 };
      }
      (breakdown[date].tokens as number) += record.total_tokens as number;
      (breakdown[date].cost as number) += record.cost_estimate as number;
      (breakdown[date].requests as number) += 1;
    });

    return breakdown;
  }

  // Prompt building methods
  private buildVisionPrompt(screenshotType: string): string {
    const prompts = {
      'initial_offer': `Analyze this rideshare trip offer screenshot and extract ALL visible data. Return ONLY a JSON object:
{
  "driver_earnings": [dollar amount as number, e.g. 8.50],
  "distance": [miles as number, e.g. 2.3],
  "pickup_location": "[exact pickup address if visible]",
  "destination": "[exact destination address if visible]",
  "estimated_time": "[time estimate if shown]",
  "surge_multiplier": [surge rate as number, 1.0 if none],
  "total_trips": 1
}
Extract only clearly visible numeric values. Use null for missing data.`,

      'final_total': `Analyze this completed rideshare trip screenshot and extract ALL visible data. Return ONLY a JSON object:
{
  "driver_earnings": [total earnings as number, e.g. 12.75],
  "distance": [actual miles driven as number, e.g. 3.1],
  "trip_duration": "[actual trip time, e.g. 15 min]",
  "tips": [tip amount as number, e.g. 2.00],
  "base_fare": [base fare if shown],
  "surge_multiplier": [surge rate if shown],
  "total_trips": 1
}
Extract only clearly visible numeric values. Use null for missing data.`,

      'dashboard': `Analyze this rideshare dashboard screenshot and extract ALL summary data. Return ONLY a JSON object:
{
  "total_trips": [number of trips as integer],
  "driver_earnings": [total earnings as number],
  "distance": [total miles as number],
  "active_time": "[total time active if shown]",
  "avg_per_trip": [average earnings per trip if calculated]
}
Extract only clearly visible numeric values. Use null for missing data.`
    };

    return prompts[screenshotType as keyof typeof prompts] || prompts.dashboard;
  }

  private buildInsightPrompt(data: Record<string, unknown>): string {
    return `Analyze this rideshare performance data and provide comprehensive insights:

DATA SUMMARY:
- Total Trips: ${(data.totals as Record<string, unknown>)?.trips || 0}
- Total Earnings: $${(data.totals as Record<string, unknown>)?.earnings || 0}
- Total Profit: $${(data.totals as Record<string, unknown>)?.profit || 0}
- Total Distance: ${(data.totals as Record<string, unknown>)?.distance || 0} miles
- Active Days: ${(data.totals as Record<string, unknown>)?.activeDays || 1}
- Timeframe: ${data.timeframe || 'unknown'}

Provide analysis in this EXACT JSON format:
{
  "performance_score": [0-100 rating based on profit/trip ratio],
  "key_insights": [
    "[Specific insight about earnings efficiency]",
    "[Pattern about trip selection or timing]",  
    "[Observation about fuel/distance optimization]"
  ],
  "recommendations": [
    "[Actionable recommendation for improving profits]",
    "[Specific strategy for better trip selection]"
  ],
  "trends": "[Overall trend description with specific metrics]",
  "fuel_efficiency": "[Analysis of distance vs earnings ratio]",
  "profit_analysis": {
    "avg_per_trip": [calculated average profit per trip],
    "profit_margin": [profit percentage vs earnings],
    "efficiency_rating": "[excellent/good/fair/poor]"
  }
}

Focus on specific numbers and percentages. Be actionable and realistic.`;
  }

  // Response parsing methods
  private parseVisionResponse(response: string): Record<string, unknown> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedData = JSON.parse(jsonMatch[0]);
        
        return {
          extracted_data: extractedData,
          ocr_data: {
            raw_text: response,
            extraction_quality: this.assessExtractionQuality(extractedData),
            confidence: this.calculateConfidence(extractedData),
            model_used: 'gpt-4o',
            processed_at: new Date().toISOString()
          }
        };
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (error) {
      console.error('Failed to parse GPT-4o vision response:', error);
      return {
        extracted_data: {},
        ocr_data: {
          extraction_quality: 'LOW',
          confidence: 0,
          model_used: 'gpt-4o',
          error: 'Failed to parse response'
        }
      };
    }
  }

  private parseInsightResponse(response: string): Record<string, unknown> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return {
          ...insights,
          generated_at: new Date().toISOString(),
          model_used: 'gpt-4-turbo'
        };
      } else {
        // Fallback parsing for non-JSON responses
        return this.parsePlainTextInsights(response);
      }
    } catch (error) {
      console.error('Failed to parse insights response:', error);
      return this.generateFallbackInsights();
    }
  }

  private parsePlainTextInsights(response: string): Record<string, unknown> {
    const insights: Record<string, unknown> = {
      performance_score: 50,
      key_insights: [],
      recommendations: [],
      trends: 'Analysis in progress',
      fuel_efficiency: 'Calculating...'
    };

    // Extract insights from plain text
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('score') || line.toLowerCase().includes('rating')) {
        const scoreMatch = line.match(/(\d+)/);
        if (scoreMatch) insights.performance_score = parseInt(scoreMatch[1]);
      }
      if (line.toLowerCase().includes('insight') || line.toLowerCase().includes('finding')) {
        (insights.key_insights as string[]).push(line.trim());
      }
      if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('suggest')) {
        (insights.recommendations as string[]).push(line.trim());
      }
    }

    return insights;
  }

  private assessExtractionQuality(data: Record<string, unknown>): 'HIGH' | 'MEDIUM' | 'LOW' {
    let fieldCount = 0;
    if (data.driver_earnings && (data.driver_earnings as number) > 0) fieldCount++;
    if (data.distance && (data.distance as number) > 0) fieldCount++;
    if (data.total_trips && (data.total_trips as number) > 0) fieldCount++;
    if (data.pickup_location) fieldCount++;
    if (data.destination) fieldCount++;

    if (fieldCount >= 3) return 'HIGH';
    if (fieldCount >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private calculateConfidence(data: Record<string, unknown>): number {
    let score = 0;
    if (data.driver_earnings && (data.driver_earnings as number) > 0) score += 35;
    if (data.distance && (data.distance as number) > 0) score += 25;
    if (data.total_trips && (data.total_trips as number) > 0) score += 20;
    if (data.pickup_location) score += 10;
    if (data.destination) score += 10;
    return Math.min(score, 100);
  }

  private generateFallbackInsights(): Record<string, unknown> {
    return {
      performance_score: 50,
      key_insights: ['Analysis temporarily unavailable', 'Using fallback calculations', 'Detailed insights will be generated when API is available'],
      recommendations: ['Continue tracking your trips', 'Focus on profitable routes'],
      trends: 'Trend analysis pending',
      fuel_efficiency: 'Efficiency calculations pending',
      fallback_mode: true,
      generated_at: new Date().toISOString()
    };
  }
}

export default GPTServiceWithTracking;