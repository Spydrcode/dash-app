// API Endpoint to run the GPT-based AI Pipeline
import { NextResponse } from 'next/server';
import { GPTAIInsightsCoordinator } from '../../../lib/gpt-ai-insight-agents';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST() {
  try {
    console.log('🚀 Starting GPT-based AI Pipeline...');
    
    // Fetch recent trip data
    const { data: trips, error } = await supabaseAdmin
      .from('gpt_trip_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Failed to fetch trip data: ${error.message}`);
    }

    if (!trips || trips.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No trip data available for processing',
        recommendation: 'Upload some screenshots first to generate insights'
      }, { status: 400 });
    }

    // Process with GPT AI
    const result = await GPTAIInsightsCoordinator.generateCompleteInsights(trips, 'recent');
    
    console.log('✅ GPT Pipeline completed successfully');
    return NextResponse.json({
      success: true,
      message: 'GPT-based AI Pipeline completed successfully',
      results: result,
      trips_processed: trips.length,
      model_info: {
        vision_model: 'gpt-4o',
        insights_model: 'gpt-4o',
        fallback_available: true
      },
      recommendation: 'AI insights generated using OpenAI GPT models with vision processing'
    });

  } catch (error) {
    console.error('❌ GPT Pipeline endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'GPT Pipeline execution failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Check OpenAI API key configuration'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check GPT API readiness
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: 'Not Ready',
        error: 'OpenAI API key not configured',
        recommendation: 'Add OPENAI_API_KEY to environment variables'
      });
    }

    // Test API connectivity
    const testResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const isConnected = testResponse.ok;
    let availableModels: string[] = [];
    
    if (isConnected) {
      try {
        const modelsData = await testResponse.json();
        availableModels = modelsData.data
          ?.filter((m: { id: string }) => m.id.includes('gpt-4') || m.id.includes('gpt-3.5'))
          ?.map((m: { id: string }) => m.id) || [];
      } catch {
        availableModels = ['API connected but model list unavailable'];
      }
    }

    const readiness = {
      openai_connected: isConnected,
      gpt4o_available: availableModels.some(m => m.includes('gpt-4o')),
      gpt4_vision_available: availableModels.some(m => m.includes('gpt-4')),
      pipeline_ready: isConnected
    };

    return NextResponse.json({
      status: readiness.pipeline_ready ? 'Ready' : 'Configuration Required',
      readiness: readiness,
      available_models: availableModels,
      pipeline_stages: [
        'Stage 1: Screenshot Processing with GPT-4V',
        'Stage 2: Data Extraction and Validation', 
        'Stage 3: Performance Analysis with GPT-4o',
        'Stage 4: Insights Generation with Enhanced Fallbacks'
      ],
      recommendations: [
        ...(isConnected ? [] : ['Configure OPENAI_API_KEY environment variable']),
        'Run POST request to process recent trip data',
        'GPT-4V will process screenshots automatically',
        'Fallback analysis available if quota exceeded'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      status: 'Error',
      error: 'Failed to check GPT API readiness',
      details: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Verify OpenAI API key and network connectivity'
    });
  }
}