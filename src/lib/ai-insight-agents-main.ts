// ADAPTIVE AI Insight Agents - Now with learning capabilities and personalized benchmarks!
// This is the main file that exports all AI agents with adaptive learning

// Re-export everything from the adaptive agents
export {
    AdaptiveAIInsightsCoordinator as AIInsightsCoordinator, KeyInsightsAgent,
    ProjectionsAgent, AdaptiveTimeAnalysisAgent as TimeAnalysisAgent, TrendsAgent,
    VehicleEfficiencyAgent, type TripData, type TripScreenshotData
} from './ai-insight-agents-adaptive';

// Legacy compatibility - ensure existing components still work
import {
    AdaptiveAIInsightsCoordinator,
    AdaptiveTimeAnalysisAgent
} from './ai-insight-agents-adaptive';

// Main coordinator is now the adaptive version
export { AdaptiveAIInsightsCoordinator, AdaptiveTimeAnalysisAgent };
