// GPT-Only Screenshot Processing API
// Handles screenshot uploads with GPT-4o vision processing and token tracking

import GPTOnlyAICoordinator from '@/lib/gpt-only-ai-coordinator';
import GPTServiceWithTracking from '@/lib/gpt-service-with-tracking';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'process_new_screenshots':
        return await processNewScreenshots(params);
      
      case 'reprocess_all_screenshots':
        return await reprocessAllScreenshots();
        
      case 'get_token_usage':
        return await getTokenUsage();
        
      case 'get_processing_status':
        return await getProcessingStatus();
        
      default:
        return NextResponse.json({
          error: `Unknown action: ${action}`,
          available_actions: ['process_new_screenshots', 'reprocess_all_screenshots', 'get_token_usage', 'get_processing_status']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('GPT Screenshot Processing API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'API request failed'
    }, { status: 500 });
  }
}

// Process new screenshots that haven't been processed with GPT-4o yet
async function processNewScreenshots(params: { screenshot_ids?: string[] }): Promise<NextResponse> {
  try {
    console.log('🚀 Processing new screenshots with GPT-4o...');

    const gptCoordinator = new GPTOnlyAICoordinator();

    // Get unprocessed screenshots or specific ones requested
    let query = supabaseAdmin
      .from('trip_screenshots')
      .select('*');

    if (params.screenshot_ids && params.screenshot_ids.length > 0) {
      query = query.in('id', params.screenshot_ids);
    } else {
      // Get screenshots that haven't been processed with GPT or have old processing
      query = query.or('is_processed.is.null,is_processed.eq.false,ocr_data->model_used.neq.gpt-4o');
    }

    const { data: screenshots, error } = await query
      .order('created_at', { ascending: false })
      .limit(20); // Process max 20 at a time to manage tokens

    if (error) {
      throw new Error(`Failed to fetch screenshots: ${error.message}`);
    }

    if (!screenshots || screenshots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new screenshots to process',
        screenshots_found: 0,
        recommendation: 'Upload new screenshots to get GPT-4o analysis'
      });
    }

    console.log(`📸 Found ${screenshots.length} screenshots to process with GPT-4o`);

    // Process screenshots and update cumulative insights
    const result = await gptCoordinator.processNewScreenshotsAndUpdateInsights(screenshots);

    return NextResponse.json({
      success: true,
      processing_result: result,
      gpt_models_used: {
        vision: 'gpt-4o',
        insights: 'gpt-4-turbo'
      },
      recommendations: [
        'Screenshots have been processed with GPT-4o vision',
        'Insights are now updated with new data',
        'Future uploads will use smart caching to minimize tokens'
      ]
    });

  } catch (error) {
    console.error('❌ New screenshot processing failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Screenshot processing failed'
    }, { status: 500 });
  }
}

// Reprocess ALL screenshots with GPT-4o (for migration or refresh)
async function reprocessAllScreenshots(): Promise<NextResponse> {
  try {
    console.log('🔄 REPROCESSING ALL SCREENSHOTS WITH GPT-4O...');

    const gptCoordinator = new GPTOnlyAICoordinator();
    
    // Get token usage before starting
    const gptService = new GPTServiceWithTracking();
    const beforeUsage = await gptService.getTokenUsageSummary();

    // Reprocess everything
    const result = await gptCoordinator.reprocessAllScreenshotsWithGPT();

    // Get token usage after processing
    const afterUsage = await gptService.getTokenUsageSummary();
    
    const tokensUsed = (afterUsage.current_session?.tokens || 0) - (beforeUsage.current_session?.tokens || 0);
    const costIncurred = (afterUsage.current_session?.cost || 0) - (beforeUsage.current_session?.cost || 0);

    return NextResponse.json({
      success: true,
      reprocessing_result: result,
      token_analysis: {
        tokens_used_for_reprocessing: tokensUsed,
        cost_incurred: costIncurred,
        before_usage: beforeUsage,
        after_usage: afterUsage
      },
      migration_summary: {
        from: 'Local Ollama models',
        to: 'OpenAI GPT-4o + GPT-4 Turbo',
        benefits: [
          'Higher accuracy vision processing',
          'More reliable insights generation',
          'Smart caching reduces future costs',
          'No local model dependencies'
        ]
      },
      next_steps: [
        'All historical data now processed with GPT models',
        'Future screenshot uploads will be more efficient',
        'Monitor token usage in dashboard'
      ]
    });

  } catch (error) {
    console.error('❌ Reprocessing all screenshots failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Reprocessing failed'
    }, { status: 500 });
  }
}

// Get comprehensive token usage statistics
async function getTokenUsage(): Promise<NextResponse> {
  try {
    const gptService = new GPTServiceWithTracking();
    const usage = await gptService.getTokenUsageSummary();

    // Get additional stats
    const { data: recentUsage } = await supabaseAdmin
      .from('token_usage_log')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });

    const visionRequests = recentUsage?.filter(r => r.request_type === 'vision').length || 0;
    const insightRequests = recentUsage?.filter(r => r.request_type === 'insights').length || 0;

    return NextResponse.json({
      success: true,
      token_usage_summary: usage,
      recent_activity: {
        last_7_days: {
          vision_requests: visionRequests,
          insight_requests: insightRequests,
          total_requests: recentUsage?.length || 0
        }
      },
      cost_analysis: {
        avg_cost_per_screenshot: visionRequests > 0 ? (usage.total_cost / visionRequests) : 0,
        estimated_monthly_cost: usage.total_cost * (30 / 7), // Project weekly to monthly
        cost_efficiency: 'Smart caching reduces repeat processing costs'
      },
      recommendations: [
        usage.total_tokens > 50000 ? 'High token usage - consider batch processing' : 'Token usage is reasonable',
        'Upload screenshots in batches for better efficiency',
        'Cached results prevent reprocessing the same data'
      ]
    });

  } catch (error) {
    console.error('❌ Token usage retrieval failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get token usage'
    }, { status: 500 });
  }
}

// Get processing status and queue information
async function getProcessingStatus(): Promise<NextResponse> {
  try {
    // Check screenshot processing status
    const { data: allScreenshots } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, is_processed, ocr_data, created_at')
      .order('created_at', { ascending: false });

    const total = allScreenshots?.length || 0;
    const processed = allScreenshots?.filter(s => s.is_processed).length || 0;
    const gptProcessed = allScreenshots?.filter(s => s.ocr_data?.model_used === 'gpt-4o').length || 0;
    const needsGptProcessing = total - gptProcessed;

    // Get cumulative insights status
    const { data: cumulativeData } = await supabaseAdmin
      .from('cumulative_insights')
      .select('*')
      .eq('user_id', 'default_user')
      .single();

    return NextResponse.json({
      success: true,
      processing_status: {
        total_screenshots: total,
        processed_screenshots: processed,
        gpt_processed_screenshots: gptProcessed,
        needs_gpt_processing: needsGptProcessing,
        processing_rate: total > 0 ? (gptProcessed / total) * 100 : 0
      },
      cumulative_insights_status: {
        available: !!cumulativeData,
        last_updated: cumulativeData?.last_updated,
        total_trips: cumulativeData?.total_trips || 0,
        total_earnings: cumulativeData?.total_earnings || 0,
        performance_score: cumulativeData?.performance_score || 0
      },
      system_status: {
        gpt_models_active: true,
        local_models_removed: true,
        caching_enabled: true,
        smart_insights: true
      },
      next_actions: needsGptProcessing > 0 ? [
        `Process ${needsGptProcessing} screenshots with GPT-4o`,
        'Update cumulative insights with new data',
        'Monitor token usage during processing'
      ] : [
        'All screenshots processed with GPT-4o',
        'System ready for new uploads',
        'Insights are up to date'
      ]
    });

  } catch (error) {
    console.error('❌ Processing status check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get processing status'
    }, { status: 500 });
  }
}

// GET method for simple status checks
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'get_processing_status';

    switch (action) {
      case 'get_processing_status':
        return await getProcessingStatus();
      case 'get_token_usage':
        return await getTokenUsage();
      default:
        return NextResponse.json({
          system_status: 'GPT-Only AI System Active',
          available_actions: {
            POST: ['process_new_screenshots', 'reprocess_all_screenshots', 'get_token_usage', 'get_processing_status'],
            GET: ['get_processing_status', 'get_token_usage']
          },
          models_active: {
            vision: 'gpt-4o',
            insights: 'gpt-4-turbo'
          },
          local_models_removed: true
        });
    }
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'GET request failed'
    }, { status: 500 });
  }
}