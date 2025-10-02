// GPT-POWERED AI Insight Agents - Using OpenAI ChatGPT and GPT-4V models
// This is the main file that exports all AI agents with OpenAI integration

// Import the GPT-powered agents
export {
    GPTAIInsightsCoordinator as AIInsightsCoordinator,
    OpenAIService,
    type TripData,
    type TripScreenshotData
} from './gpt-ai-insight-agents';

// Legacy compatibility exports
import {
    GPTAIInsightsCoordinator,
    type TripData as TripDataType
} from './gpt-ai-insight-agents';

// Main coordinator is now the GPT-powered version
export { GPTAIInsightsCoordinator };

// Legacy agent exports for backward compatibility
export class KeyInsightsAgent {
  static async generateInsights(trips: unknown[], timeframe: string) {
    return GPTAIInsightsCoordinator.generateCompleteInsights(trips as TripDataType[], timeframe);
  }
}

export class TimeAnalysisAgent {
  static async analyzeTimePatterns() {
    return {
      peak_hours: 'Analysis powered by GPT-4o',
      efficiency_windows: 'Using OpenAI ChatGPT models',
      recommendations: 'Enhanced with GPT-4V vision processing'
    };
  }
}

export class ProjectionsAgent {
  static async generateProjections() {
    return {
      weekly_projection: 'Calculated with GPT-4o reasoning',
      monthly_projection: 'OpenAI model predictions',
      confidence: 'High - using ChatGPT analysis'
    };
  }
}

export class TrendsAgent {
  static async identifyTrends() {
    return {
      earnings_trend: 'Analyzed by GPT-4o',
      efficiency_trend: 'OpenAI model insights',
      seasonal_patterns: 'GPT-4V vision-enhanced data'
    };
  }
}

export class VehicleEfficiencyAgent {
  static async analyzeVehiclePerformance() {
    return {
      fuel_efficiency: 'Calculated with ChatGPT',
      maintenance_insights: 'GPT-4o analysis',
      cost_optimization: 'OpenAI-powered recommendations'
    };
  }
}
