// API Endpoint to run the Multi-Stage Ollama AI Pipeline
import { NextRequest, NextResponse } from 'next/server';
import { OllamaAIPipeline } from '../../../lib/ollama-ai-pipeline';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Multi-Stage Ollama AI Pipeline...');
    
    const pipeline = new OllamaAIPipeline();
    const result = await pipeline.processCompleteDataset();
    
    if (result.success) {
      console.log('✅ Multi-Stage Pipeline completed successfully');
      return NextResponse.json({
        success: true,
        message: 'Multi-Stage Ollama AI Pipeline completed successfully',
        results: result.pipeline_results,
        insights: result.final_insights,
        model_info: result.model_info,
        recommendation: 'AI insights should now be accurate with proper OCR → Compilation → Training → Insights flow'
      });
    } else {
      console.error('❌ Pipeline failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        stage_failed: result.stage_failed,
        recommendation: 'Check Ollama service and model availability'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Pipeline endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Pipeline execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check pipeline readiness
    const ollamaCheck = await fetch('http://localhost:11434/api/tags');
    
    if (!ollamaCheck.ok) {
      return NextResponse.json({
        status: 'Not Ready',
        error: 'Ollama service not available',
        recommendation: 'Start Ollama: ollama serve'
      });
    }

    const models = await ollamaCheck.json();
    const hasLlava = models.models?.some((m: any) => m.name.includes('llava'));
    const hasDeepSeek = models.models?.some((m: any) => m.name.includes('deepseek-r1'));

    const readiness = {
      ollama_connected: true,
      llava_available: hasLlava,
      deepseek_available: hasDeepSeek,
      pipeline_ready: hasLlava && hasDeepSeek
    };

    return NextResponse.json({
      status: readiness.pipeline_ready ? 'Ready' : 'Incomplete Setup',
      readiness: readiness,
      available_models: models.models?.map((m: any) => m.name) || [],
      pipeline_stages: [
        'Stage 1: OCR Extraction with LLaVA',
        'Stage 2: Data Compilation with DeepSeek-R1', 
        'Stage 3: Training Analysis with DeepSeek-R1',
        'Stage 4: Insights Generation with DeepSeek-R1'
      ],
      recommendations: [
        ...(hasLlava ? [] : ['Install LLaVA: ollama pull llava']),
        ...(hasDeepSeek ? [] : ['Install DeepSeek-R1: ollama pull deepseek-r1']),
        'Run POST request to start pipeline processing'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      status: 'Error',
      error: 'Failed to check pipeline readiness',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}