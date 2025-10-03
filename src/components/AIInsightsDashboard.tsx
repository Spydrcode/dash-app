'use client';

import { ScreenshotProcessingMonitor } from '@/lib/insight-update-manager';
import React, { useEffect, useState } from 'react';

interface InsightsSummary {
  timeframe: string;
  total_trips: number;
  total_earnings: number;
  total_distance: number;
  total_profit: number;
  performance_score: number;
  profit_margin: number;
}

interface HondaOdyssey {
  actual_mpg: number;
  rated_mpg: number;
  efficiency_rating: string;
  total_fuel_cost: number;
  fuel_savings: string;
}

interface PerformanceBreakdown {
  earnings_per_mile: number;
  profit_per_mile: number;
  average_trip_profit: number;
  fuel_cost_ratio: number;
}

interface TimeAnalysis {
  best_day: {
    day: string;
    profit: number;
    trips: number;
  };
  best_hour: {
    hour: string;
    profit: number;
    trips: number;
  };
}

interface Projections {
  daily_projection: {
    avg_profit: number;
    avg_trips: number;
  };
  weekly_projection: {
    avg_profit: number;
    avg_trips: number;
  };
  monthly_projection: {
    avg_profit: number;
    avg_trips: number;
  };
}

interface TipAnalysis {
  accuracy_rate: number;
  total_tips: number;
  average_tip: number;
  best_tip_day: string;
}

interface Trends {
  direction: string;
  percentage_change: number;
  trend_analysis: string;
}

interface AIInsightsData {
  summary: InsightsSummary;
  honda_odyssey: HondaOdyssey;
  performance_breakdown: PerformanceBreakdown;
  time_analysis: TimeAnalysis;
  projections: Projections;
  tip_analysis: TipAnalysis;
  trends: Trends;
  key_insights: string[];
  ai_recommendations: string[];
  ai_generated?: boolean;
  last_updated?: string;
}

interface AIInsightsDashboardProps {
  timeframe?: string;
  onTimeframeChange?: (timeframe: string) => void;
}

const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({ 
  timeframe = 'week', 
  onTimeframeChange 
}) => {
  const [insights, setInsights] = useState<AIInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (selectedTimeframe: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Add a cache buster to ensure fresh data from AI agents
      const cacheBuster = Date.now();
      const response = await fetch('/api/unified-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Ensure no caching
        },
        body: JSON.stringify({
          action: 'ai_insights',
          timeframe: selectedTimeframe,
          includeProjections: true,
          includeTrends: true,
          cacheBuster, // Force fresh data
          useAIAgents: true // Flag to use new AI agents
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`🤖 AI Insights Response for ${selectedTimeframe}:`, {
        success: data.success,
        fallback_mode: data.fallback_mode,
        trips: data.summary?.total_trips || data.trip_count || 0,
        earnings: data.summary?.total_earnings || 0,
        aiGenerated: data.ai_generated || false,
        hasGptInsights: !!data.gpt_insights,
        hasSummary: !!data.summary,
        fullResponse: data
      });
      
      setInsights(data);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
      
      // Set fallback data to prevent blank screen
      setInsights({
        summary: {
          timeframe: selectedTimeframe,
          total_trips: 0,
          total_earnings: 0,
          total_distance: 0,
          total_profit: 0,
          performance_score: 0,
          profit_margin: 0
        },
        honda_odyssey: {
          actual_mpg: 19,
          rated_mpg: 19,
          efficiency_rating: 'No data available',
          total_fuel_cost: 0,
          fuel_savings: 'N/A'
        },
        performance_breakdown: {
          earnings_per_mile: 0,
          profit_per_mile: 0,
          average_trip_profit: 0,
          fuel_cost_ratio: 0
        },
        time_analysis: {
          best_day: { day: 'No data', profit: 0, trips: 0 },
          best_hour: { hour: 'No data', profit: 0, trips: 0 }
        },
        projections: {
          daily_projection: { avg_profit: 0, avg_trips: 0 },
          weekly_projection: { avg_profit: 0, avg_trips: 0 },
          monthly_projection: { avg_profit: 0, avg_trips: 0 }
        },
        tip_analysis: {
          accuracy_rate: 0,
          total_tips: 0,
          average_tip: 0,
          best_tip_day: 'No data'
        },
        trends: {
          direction: 'No data',
          percentage_change: 0,
          trend_analysis: 'Upload trip data to see trends'
        },
        key_insights: ['Upload trip screenshots to start getting AI insights'],
        ai_recommendations: ['Take screenshots of your trip summaries', 'Upload both initial offers and final totals'],
        ai_generated: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchInsights(timeframe);
  };

  useEffect(() => {
    // COST OPTIMIZATION: Don't automatically fetch insights on mount
    // Only fetch when user explicitly requests them
    console.log('💰 AI Insights Dashboard loaded - click "Generate Insights" button to load data');
    setLoading(false); // Set loading to false since we're not auto-loading
    
    // Start monitoring screenshot processing
    ScreenshotProcessingMonitor.startMonitoring();
    
    return () => {
      ScreenshotProcessingMonitor.stopMonitoring();
    };
  }, [timeframe]);

  // Listen for custom refresh events (from uploads, etc.)
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('🔄 AI Insights refresh event received - updating with latest data...');
      
      // Show a brief notification that insights are updating
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('addNotification', {
          detail: {
            type: 'info',
            title: 'Updating AI Insights...',
            message: 'Processing new trip data and refreshing insights.',
            autoClose: true,
            duration: 2000
          }
        }));
      }
      
      // Fetch fresh insights with cache buster
      fetchInsights(timeframe);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dashboardRefresh', handleRefreshEvent);
      return () => window.removeEventListener('dashboardRefresh', handleRefreshEvent);
    }
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: string) => {
    onTimeframeChange?.(newTimeframe);
    // COST OPTIMIZATION: Don't auto-fetch on timeframe change
    // User must click "Generate Insights" button explicitly
    console.log(`💰 Timeframe changed to ${newTimeframe} - click "Generate Insights" to load data`);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyColor = (rating: string) => {
    const lowerRating = rating?.toLowerCase() || '';
    if (lowerRating.includes('excellent') || lowerRating.includes('above')) return 'text-green-600';
    if (lowerRating.includes('good') || lowerRating.includes('average')) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading insights</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchInsights(timeframe)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-blue-500 text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Insights Ready</h2>
          <p className="text-gray-600 mb-4">
            💰 Cost-optimized: Insights are only generated when you click the button below.
            <br />
            This prevents automatic API charges.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => fetchInsights(timeframe)}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium text-white transition-all ${
                loading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
              }`}
            >
              {loading ? '🤖 Generating Insights...' : '🧠 Generate AI Insights'}
            </button>
            
            {/* Timeframe selector */}
            <div className="flex justify-center gap-2 mt-4">
              {['day', 'week', 'month', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => handleTimeframeChange(period)}
                  className={`px-3 py-1 rounded text-sm font-medium capitalize ${
                    timeframe === period
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Selected timeframe: {timeframe} • This will analyze your {timeframe}ly trip data
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🚗 Honda Odyssey AI Insights
              {insights.ai_generated && (
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  🤖 AI Generated
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time trip analytics powered by specialized AI agents
              {insights.last_updated && (
                <span className="text-xs text-gray-500 ml-2">
                  • Updated {new Date(insights.last_updated).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`px-3 py-2 rounded-lg font-medium border border-gray-200 transition-all ${
                loading 
                  ? 'bg-blue-100 text-blue-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={loading ? 'AI agents analyzing data...' : 'Refresh insights with latest data'}
            >
              {loading ? '🤖' : '↻'} {loading ? 'AI Processing...' : ''}
            </button>
            {['day', 'week', 'month', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => handleTimeframeChange(period)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  timeframe === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Total Trips</div>
            <div className="text-2xl font-bold text-gray-900">
              {insights.summary?.total_trips || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${(insights.summary?.total_earnings || 0).toFixed(2)} earned
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Performance Score</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(insights.summary?.performance_score || 0)}`}>
              {Math.round(insights.summary?.performance_score || 0)}/100
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(insights.summary?.performance_score || 0) >= 80 ? 'Excellent' : 
               (insights.summary?.performance_score || 0) >= 60 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Total Profit</div>
            <div className="text-2xl font-bold text-green-600">
              ${(insights.summary?.total_profit || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(insights.summary?.profit_margin || 0).toFixed(1)}% margin
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Honda Odyssey MPG</div>
            <div className="text-2xl font-bold text-blue-600">
              {(insights.honda_odyssey?.actual_mpg || 0).toFixed(1)}
            </div>
            <div className={`text-xs mt-1 ${getEfficiencyColor(insights.honda_odyssey?.efficiency_rating || '')}`}>
              {insights.honda_odyssey?.efficiency_rating || 'N/A'} ({insights.honda_odyssey?.rated_mpg || 19} rated)
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm font-medium text-gray-600">Average Trip Profit</div>
            <div className="text-2xl font-bold text-purple-600">
              ${(insights.performance_breakdown?.average_trip_profit || 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${(insights.performance_breakdown?.profit_per_mile || 0).toFixed(2)}/mile
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        {insights.key_insights && insights.key_insights.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Key AI Insights</h3>
            <div className="space-y-2">
              {insights.key_insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                  <p className="text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance Breakdown */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Earnings per mile:</span>
                <span className="font-medium">${(insights.performance_breakdown?.earnings_per_mile || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total distance:</span>
                <span className="font-medium">{(insights.summary?.total_distance || 0).toFixed(1)} miles</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fuel efficiency:</span>
                <span className="font-medium">{insights.honda_odyssey?.fuel_savings || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fuel cost ratio:</span>
                <span className="font-medium">{((insights.performance_breakdown?.fuel_cost_ratio || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total fuel cost:</span>
                <span className="font-medium">${(insights.honda_odyssey?.total_fuel_cost || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Time Analysis */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Time Analysis</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Best performing day:</div>
                <div className="font-medium">
                  {insights.time_analysis?.best_day?.day || 'N/A'} - 
                  (${(insights.time_analysis?.best_day?.profit || 0).toFixed(2)}, {insights.time_analysis?.best_day?.trips || 0} trips)
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Best performing hour:</div>
                <div className="font-medium">
                  {insights.time_analysis?.best_hour?.hour || 'N/A'} - 
                  (${(insights.time_analysis?.best_hour?.profit || 0).toFixed(2)}, {insights.time_analysis?.best_hour?.trips || 0} trips)
                </div>
              </div>
            </div>
          </div>

          {/* Projections */}
          {insights.projections && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Projections</h3>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded border border-green-200">
                  <div className="text-sm text-gray-600">Daily Average:</div>
                  <div className="font-medium text-green-700">
                    ${(insights.projections.daily_projection?.avg_profit || 0).toFixed(2)} / 
                    {(insights.projections.daily_projection?.avg_trips || 0).toFixed(1)} trips
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-sm text-gray-600">Weekly Projection:</div>
                  <div className="font-medium text-blue-700">
                    ${(insights.projections.weekly_projection?.avg_profit || 0).toFixed(2)} / 
                    {(insights.projections.weekly_projection?.avg_trips || 0).toFixed(1)} trips
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded border border-purple-200">
                  <div className="text-sm text-gray-600">Monthly Projection:</div>
                  <div className="font-medium text-purple-700">
                    ${(insights.projections.monthly_projection?.avg_profit || 0).toFixed(2)} / 
                    {(insights.projections.monthly_projection?.avg_trips || 0).toFixed(1)} trips
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trends */}
          {insights.trends && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Trends</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Direction:</span>
                  <span className={`font-medium ${getTrendColor(insights.trends.percentage_change || 0)}`}>
                    {insights.trends.direction || 'Stable'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change:</span>
                  <span className={`font-medium ${getTrendColor(insights.trends.percentage_change || 0)}`}>
                    {(insights.trends.percentage_change || 0) > 0 ? '+' : ''}{(insights.trends.percentage_change || 0).toFixed(1)}% change
                  </span>
                </div>
                {insights.trends.trend_analysis && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <div className="text-sm text-gray-700">{insights.trends.trend_analysis}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tip Analysis */}
        {insights.tip_analysis && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Tip Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-sm text-gray-600">Tip Accuracy Rate</div>
                <div className="text-xl font-bold text-green-600">
                  {insights.tip_analysis.accuracy_rate ? `${(insights.tip_analysis.accuracy_rate || 0).toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded">
                <div className="text-sm text-gray-600">Total Tips</div>
                <div className="text-xl font-bold text-blue-600">
                  ${(insights.tip_analysis.total_tips || 0).toFixed(2)}
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <div className="text-sm text-gray-600">Average Tip</div>
                <div className="text-xl font-bold text-purple-600">
                  ${(insights.tip_analysis.average_tip || 0).toFixed(2)}
                </div>
              </div>
            </div>
            {insights.tip_analysis.best_tip_day && (
              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="text-sm text-gray-600">Best tipping day:</div>
                <div className="font-medium text-yellow-700">{insights.tip_analysis.best_tip_day}</div>
              </div>
            )}
          </div>
        )}

        {/* AI Recommendations */}
        {insights.ai_recommendations && insights.ai_recommendations.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Recommendations</h3>
            <div className="space-y-3">
              {insights.ai_recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded border">
                  <div className="text-lg">💡</div>
                  <p className="text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsightsDashboard;