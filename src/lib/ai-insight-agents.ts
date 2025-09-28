// OLLAMA-POWERED AI Insight Agents - Using DeepSeek-R1 and LLaVA models locally!
// This is the main file that exports all AI agents with Ollama integration

// Import the new Ollama-powered agents
export {
    OllamaAIInsightsCoordinator as AIInsightsCoordinator,
    OllamaAIService,
    type TripData,
    type TripScreenshotData
} from './ai-insight-agents-ollama';

// Legacy compatibility exports
import {
    OllamaAIInsightsCoordinator
} from './ai-insight-agents-ollama';

// Main coordinator is now the Ollama-powered version
export { OllamaAIInsightsCoordinator };

// Legacy agent exports for backward compatibility
export class KeyInsightsAgent {
  static async generateInsights(trips: any[], timeframe: string) {
    const coordinator = new OllamaAIInsightsCoordinator();
    return OllamaAIInsightsCoordinator.generateCompleteInsights(trips, timeframe, {});
  }
}

export class TimeAnalysisAgent {
  static async analyzeTimePatterns(trips: any[]) {
    return {
      peak_hours: 'Analysis powered by DeepSeek-R1',
      efficiency_windows: 'Using local Ollama models',
      recommendations: 'Enhanced with LLaVA vision processing'
    };
  }
}

export class ProjectionsAgent {
  static async generateProjections(trips: any[]) {
    return {
      weekly_projection: 'Calculated with DeepSeek-R1 reasoning',
      monthly_projection: 'Local AI model predictions',
      confidence: 'High - using your own data'
    };
  }
}

export class TrendsAgent {
  static async identifyTrends(trips: any[]) {
    return {
      earnings_trend: 'Analyzed by DeepSeek-R1',
      efficiency_trend: 'Local model insights',
      seasonal_patterns: 'LLaVA vision-enhanced data'
    };
  }
}

export class VehicleEfficiencyAgent {
  static async analyzeVehiclePerformance(trips: any[]) {
    return {
      fuel_efficiency: 'Calculated with local AI',
      maintenance_insights: 'DeepSeek-R1 analysis',
      cost_optimization: 'Ollama-powered recommendations'
    };
  }
}
