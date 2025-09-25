'use client';

import { ChartBarIcon, CurrencyDollarIcon, DocumentTextIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';

interface TripData {
  date: string;
  distance: number;
  fuel: number;
  toll: number;
  revenue: number;
  expenses: number;
  profit: number;
  trip_type?: string;
  total_trips?: number;
  pickup_location?: string;
  dropoff_location?: string;
  platform?: string;
  duration?: string;
  fare_amount?: number;
  driver_earnings?: number;
  vehicle_model?: string;
  vehicle_mpg?: number;
  gas_used_gallons?: number;
  gas_cost?: number;
  individual_trips?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  efficiency_metrics?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface AIInsights {
  summary?: string;
  suggestions: string[];
  profitAnalysis?: string;
  efficiency?: {
    score: number;
    category: string;
  };
  trip_analysis?: {
    type: string;
    trip_count: number;
    avg_profit_per_trip: number;
  };
  vehicle_analysis?: {
    model: string;
    fuel_efficiency: number;
    efficiency_rating: string;
    gas_cost_percentage: number;
  };
  efficiency_score?: number;
  profit_margin?: number;
  performance_category?: string;
  peak_hour_analysis?: {
    is_peak_hour: boolean;
    recommended_hours: string[];
  };
}

interface ProcessingResultsProps {
  imagePath?: string;
  driverId?: string;
  onClose?: () => void;
}

export default function ProcessingResults({ imagePath, driverId, onClose }: ProcessingResultsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    extractedData: TripData | null;
    aiInsights: AIInsights | null;
    insights: AIInsights | null;
    predictions: any | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>({
    extractedData: null,
    aiInsights: null,
    insights: null,
    predictions: null
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (imagePath && driverId) {
      processImage();
    }
  }, [imagePath, driverId]);

  const processImage = useCallback(async () => {
    console.log('ProcessingResults: Starting processing...', { imagePath, driverId });
    setIsProcessing(true);
    setError(null);

    try {
      console.log('ProcessingResults: Making API call to /api/process-trip');
      const response = await fetch('/api/process-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath,
          driverId
        })
      });

      console.log('ProcessingResults: API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ProcessingResults: API response data:', result);
      setResults(result);
    } catch (error) {
      console.error('Processing failed:', error);
      setError(error instanceof Error ? error.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [imagePath, driverId]);

  useEffect(() => {
    if (imagePath && driverId) {
      processImage();
    }
  }, [imagePath, driverId, processImage]);

  if (isProcessing) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Processing Trip Data</h3>
            <p className="text-sm text-gray-600">AI is extracting and analyzing your trip information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-red-600">Processing Error</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <button
          onClick={processImage}
          className="mt-4 btn-primary text-sm"
        >
          Retry Processing
        </button>
      </div>
    );
  }

  if (!results.extractedData && !(results.aiInsights || results.insights)) {
    return null;
  }

  const insights = results.insights || results.aiInsights;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Trip Analysis Results</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Extracted Data */}
      {results.extractedData && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <DocumentTextIcon className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">
              {results.extractedData.trip_type === 'multiple' ? 'Multi-Trip Analysis' : 'Trip Data'}
            </h4>
            {results.extractedData.total_trips && results.extractedData.total_trips > 1 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                {results.extractedData.total_trips} trips
              </span>
            )}
          </div>
          
          {/* Trip Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-600">Location:</span>
              <p className="font-medium">{results.extractedData.pickup_location || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Platform:</span>
              <p className="font-medium">{results.extractedData.platform || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-600">Distance:</span>
              <p className="font-medium">{results.extractedData.distance} miles</p>
            </div>
            <div>
              <span className="text-gray-600">Duration:</span>
              <p className="font-medium">{results.extractedData.duration || 'N/A'}</p>
            </div>
          </div>

          {/* Vehicle Analysis */}
          {results.extractedData.vehicle_model && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <TruckIcon className="h-4 w-4 text-gray-600" />
                <h5 className="font-semibold text-gray-900">Vehicle Analysis</h5>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium">{results.extractedData.vehicle_model}</p>
                </div>
                <div>
                  <span className="text-gray-600">Fuel Efficiency:</span>
                  <p className="font-medium">{results.extractedData.vehicle_mpg} MPG</p>
                </div>
                <div>
                  <span className="text-gray-600">Gas Used:</span>
                  <p className="font-medium">{results.extractedData.gas_used_gallons?.toFixed(2)} gallons</p>
                </div>
                <div>
                  <span className="text-gray-600">Gas Cost:</span>
                  <p className="font-medium">${results.extractedData.gas_cost?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Fare Amount:</span>
              <p className="font-medium">${(results.extractedData.fare_amount || results.extractedData.revenue).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-600">Driver Earnings:</span>
              <p className="font-medium">${(results.extractedData.driver_earnings || results.extractedData.revenue).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-600">Total Expenses:</span>
              <p className="font-medium">${results.extractedData.expenses.toFixed(2)}</p>
            </div>
          </div>
          
          {/* Profit Display */}
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">Net Profit:</span>
              <span className="text-2xl font-bold text-green-600">
                ${results.extractedData.profit.toFixed(2)}
              </span>
            </div>
            {results.extractedData.efficiency_metrics && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Per Mile:</span>
                  <p className="font-medium">${results.extractedData.efficiency_metrics.profit_per_mile}</p>
                </div>
                <div>
                  <span className="text-gray-600">Per Hour:</span>
                  <p className="font-medium">${results.extractedData.efficiency_metrics.earnings_per_hour}</p>
                </div>
                <div>
                  <span className="text-gray-600">Efficiency:</span>
                  <p className="font-medium">{results.extractedData.efficiency_metrics.cost_efficiency}%</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <ChartBarIcon className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-gray-900">AI Insights & Analysis</h4>
          </div>

          {insights.summary && (
            <div className="mb-4">
              <p className="text-sm text-gray-700">{insights.summary}</p>
            </div>
          )}

          {/* Trip Analysis */}
          {insights.trip_analysis && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <h5 className="font-semibold text-blue-900 mb-2">Trip Analysis</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-blue-700">Type:</span>
                  <p className="font-medium text-blue-900">{insights.trip_analysis.type}</p>
                </div>
                <div>
                  <span className="text-blue-700">Trip Count:</span>
                  <p className="font-medium text-blue-900">{insights.trip_analysis.trip_count}</p>
                </div>
                <div>
                  <span className="text-blue-700">Avg Profit/Trip:</span>
                  <p className="font-medium text-blue-900">${insights.trip_analysis.avg_profit_per_trip}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Analysis */}
          {insights.vehicle_analysis && (
            <div className="bg-green-50 rounded-lg p-3 mb-4">
              <h5 className="font-semibold text-green-900 mb-2">Vehicle Performance</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-green-700">Model:</span>
                  <p className="font-medium text-green-900">{insights.vehicle_analysis.model}</p>
                </div>
                <div>
                  <span className="text-green-700">MPG:</span>
                  <p className="font-medium text-green-900">{insights.vehicle_analysis.fuel_efficiency}</p>
                </div>
                <div>
                  <span className="text-green-700">Efficiency:</span>
                  <p className="font-medium text-green-900">{insights.vehicle_analysis.efficiency_rating}</p>
                </div>
                <div>
                  <span className="text-green-700">Gas % of Earnings:</span>
                  <p className="font-medium text-green-900">{insights.vehicle_analysis.gas_cost_percentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Performance Score */}
          {insights.efficiency_score !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Efficiency Score</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    {insights.efficiency_score}
                  </div>
                  <div className="text-xs text-gray-500">out of 100</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${insights.efficiency_score}%` }}
                ></div>
              </div>
              {insights.performance_category && (
                <p className="font-medium text-primary-600 mt-1">{insights.performance_category}</p>
              )}
            </div>
          )}

          {/* Suggestions */}
          {insights.suggestions && insights.suggestions.length > 0 && (
            <div className="mb-4">
              <h5 className="font-semibold text-gray-900 mb-2">Recommendations</h5>
              <ul className="space-y-2">
                {insights.suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Peak Hour Analysis */}
          {insights.peak_hour_analysis && (
            <div className="bg-yellow-50 rounded-lg p-3">
              <h5 className="font-semibold text-yellow-900 mb-2">Peak Hour Analysis</h5>
              <div className="text-sm">
                <p className="text-yellow-800 mb-1">
                  {insights.peak_hour_analysis.is_peak_hour 
                    ? "✅ This trip was during peak hours!" 
                    : "⏰ Consider driving during peak hours for higher earnings"}
                </p>
                <p className="text-yellow-700">
                  Recommended peak hours: {insights.peak_hour_analysis.recommended_hours.join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Predictions */}
      {results.predictions && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold text-gray-900">Profit Predictions</h4>
          </div>
          <div className="space-y-2 text-sm">
            <p>Next trip predicted profit: <span className="font-medium text-green-600">${results.predictions.nextTrip?.toFixed(2) || 'N/A'}</span></p>
            <p>Weekly average: <span className="font-medium">${results.predictions.weeklyAverage?.toFixed(2) || 'N/A'}</span></p>
            <p>Monthly projection: <span className="font-medium">${results.predictions.monthlyProjection?.toFixed(2) || 'N/A'}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}