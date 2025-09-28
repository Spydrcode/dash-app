// Flexible Screenshot Processing Dashboard
// Shows how different screenshots contribute different data points

'use client';

import React, { useEffect, useState } from 'react';

interface ScreenshotData {
  id: string;
  screenshot_type: string;
  data_confidence: number;
  detected_elements: string[];
  missing_elements: string[];
  extracted_data: Record<string, any>;
  created_at: string;
}

interface TripCombinedData {
  trip_id: string;
  screenshots: ScreenshotData[];
  combined_data: Record<string, any>;
  completeness_score: number;
}

const FlexibleScreenshotDashboard: React.FC = () => {
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>([]);
  const [combinedTrips, setCombinedTrips] = useState<TripCombinedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  useEffect(() => {
    fetchScreenshotData();
  }, []);

  const fetchScreenshotData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent screenshots
      const screenshotsResponse = await fetch('/api/dashboard-stats'); // We'll extend this
      const screenshotsData = await screenshotsResponse.json();
      
      // For now, create mock data to demonstrate the concept
      const mockScreenshots: ScreenshotData[] = [
        {
          id: '1',
          screenshot_type: 'initial_offer',
          data_confidence: 0.92,
          detected_elements: ['estimated_fare', 'distance', 'pickup_location', 'dropoff_location'],
          missing_elements: ['estimated_tip', 'surge_multiplier'],
          extracted_data: {
            estimated_fare: 18.50,
            distance: 8.2,
            pickup_location: 'Downtown Restaurant',
            dropoff_location: 'Residential Area',
            platform: 'Uber'
          },
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          screenshot_type: 'final_total',
          data_confidence: 0.88,
          detected_elements: ['total_earnings', 'actual_tip', 'trip_time'],
          missing_elements: ['fees', 'bonus'],
          extracted_data: {
            total_earnings: 22.75,
            actual_tip: 4.25,
            trip_time: 25,
            final_fare: 18.50
          },
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          screenshot_type: 'dashboard_odometer',
          data_confidence: 0.95,
          detected_elements: ['odometer_reading', 'fuel_level'],
          missing_elements: [],
          extracted_data: {
            odometer_reading: 87432,
            fuel_level: 75,
            dashboard_time: '14:30'
          },
          created_at: new Date().toISOString()
        }
      ];

      setScreenshots(mockScreenshots);
      
      // Create mock combined trip data
      const mockCombinedTrip: TripCombinedData = {
        trip_id: 'trip_001',
        screenshots: mockScreenshots.slice(0, 2), // First two screenshots
        combined_data: {
          estimated_fare: 18.50,
          distance: 8.2,
          total_earnings: 22.75,
          actual_tip: 4.25,
          pickup_location: 'Downtown Restaurant',
          dropoff_location: 'Residential Area',
          estimated_profit: 21.27, // After fuel costs
          tip_variance: 4.25, // No initial tip estimate
          trip_type: 'combined'
        },
        completeness_score: 0.85
      };

      setCombinedTrips([mockCombinedTrip]);
      
    } catch (error) {
      console.error('Failed to fetch screenshot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScreenshotTypeIcon = (type: string) => {
    switch (type) {
      case 'initial_offer': return '📱';
      case 'final_total': return '💰';
      case 'dashboard_odometer': return '🚗';
      case 'trip_summary': return '📊';
      case 'earnings_summary': return '💵';
      case 'map_route': return '🗺️';
      default: return '❓';
    }
  };

  const formatScreenshotType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <h1 className="text-2xl font-bold mb-6">Loading Screenshot Analysis...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Flexible Screenshot Processing Dashboard
          </h1>
          <p className="text-gray-600">
            Each screenshot contributes specific data points - no need for complete data in every image
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Total Screenshots</div>
            <div className="text-2xl font-bold text-gray-900">{screenshots.length}</div>
            <div className="text-xs text-gray-500 mt-1">Processed with flexible OCR</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Combined Trips</div>
            <div className="text-2xl font-bold text-gray-900">{combinedTrips.length}</div>
            <div className="text-xs text-gray-500 mt-1">Multi-screenshot analysis</div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Avg Confidence</div>
            <div className="text-2xl font-bold text-green-600">
              {screenshots.length > 0 
                ? Math.round(screenshots.reduce((sum, s) => sum + s.data_confidence, 0) / screenshots.length * 100)
                : 0}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Data extraction accuracy</div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Screenshot Types</div>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(screenshots.map(s => s.screenshot_type)).size}
            </div>
            <div className="text-xs text-gray-500 mt-1">Different data sources</div>
          </div>
        </div>

        {/* Individual Screenshots */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📸 Individual Screenshot Analysis
          </h2>
          <div className="space-y-4">
            {screenshots.map((screenshot) => (
              <div key={screenshot.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getScreenshotTypeIcon(screenshot.screenshot_type)}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {formatScreenshotType(screenshot.screenshot_type)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(screenshot.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(screenshot.data_confidence)}`}>
                    {Math.round(screenshot.data_confidence * 100)}% confidence
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Detected Elements */}
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">
                      ✅ Detected ({screenshot.detected_elements.length})
                    </h4>
                    <div className="space-y-1">
                      {screenshot.detected_elements.map((element) => (
                        <div key={element} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{element.replace('_', ' ')}</span>
                          <span className="text-green-600 font-mono">
                            {screenshot.extracted_data[element] || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Missing Elements */}
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-2">
                      ⚠️ Missing ({screenshot.missing_elements.length})
                    </h4>
                    <div className="space-y-1">
                      {screenshot.missing_elements.length > 0 ? (
                        screenshot.missing_elements.map((element) => (
                          <div key={element} className="text-sm text-gray-500">
                            {element.replace('_', ' ')}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          All expected elements found!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw Data Preview */}
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">📋 Extracted Data</h4>
                    <div className="text-xs bg-white rounded p-2 max-h-32 overflow-y-auto">
                      <pre className="text-gray-700">
                        {JSON.stringify(screenshot.extracted_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Combined Trip Analysis */}
        {combinedTrips.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔄 Combined Trip Analysis
            </h2>
            
            {combinedTrips.map((trip) => (
              <div key={trip.trip_id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Trip ID: {trip.trip_id}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {trip.screenshots.length} screenshots combined
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(trip.completeness_score)}`}>
                      {Math.round(trip.completeness_score * 100)}% complete
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Source Screenshots */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">📸 Source Screenshots</h4>
                    <div className="space-y-2">
                      {trip.screenshots.map((screenshot) => (
                        <div key={screenshot.id} className="flex items-center gap-3 p-2 bg-white rounded">
                          <span>{getScreenshotTypeIcon(screenshot.screenshot_type)}</span>
                          <span className="text-sm font-medium">
                            {formatScreenshotType(screenshot.screenshot_type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {screenshot.detected_elements.length} elements
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Combined Result */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">🎯 Combined Result</h4>
                    <div className="bg-white rounded p-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {Object.entries(trip.combined_data).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">
                              {typeof value === 'number' && key.includes('earnings') 
                                ? `$${value.toFixed(2)}`
                                : typeof value === 'number' && key.includes('distance')
                                ? `${value} mi`
                                : String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trip Insights */}
                <div className="mt-4 p-3 bg-white rounded">
                  <h4 className="font-medium text-gray-700 mb-2">💡 Trip Insights</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      Profit: ${trip.combined_data.estimated_profit?.toFixed(2) || '0.00'}
                    </span>
                    {trip.combined_data.tip_variance && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        Tip: ${trip.combined_data.tip_variance.toFixed(2)}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      Rate: ${(trip.combined_data.total_earnings / trip.combined_data.distance).toFixed(2)}/mile
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🧠 How Flexible Screenshot Processing Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">✨ Smart Detection</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• LLaVA analyzes each screenshot to determine type</li>
                <li>• Extracts only the data present in that specific image</li>
                <li>• Creates JSON with null values for missing data</li>
                <li>• Provides confidence score for each extraction</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 mb-2">🔄 Data Combination</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Combines multiple screenshots for complete trip picture</li>
                <li>• No single screenshot needs all data points</li>
                <li>• Odometer screenshots only contain mileage data</li>
                <li>• Initial offers focus on estimated values</li>
                <li>• Final totals capture actual earnings and tips</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlexibleScreenshotDashboard;