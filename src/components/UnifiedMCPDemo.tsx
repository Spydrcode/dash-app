'use client';

import { useState } from 'react';

export default function UnifiedMCPDemo() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'process' | 'reanalyze' | 'variance' | 'multi'>('process');

  const handleProcessTrip = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/process-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath: '/mock/trip-screenshot.jpg',
          screenshotType: 'initial_offer'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to process trip' });
    }
    setLoading(false);
  };

  const handleReanalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/unified-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reanalyze',
          analysisType: 'daily'
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to run reanalysis' });
    }
    setLoading(false);
  };

  const handleTipVariance = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/unified-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'tip_variance',
          tripId: 1,
          initialTip: 5.00,
          finalTip: 8.00
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to analyze tip variance' });
    }
    setLoading(false);
  };

  const handleMultiScreenshot = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/unified-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'multi_screenshot',
          tripId: 1,
          screenshots: [
            { type: 'initial_offer', filePath: '/mock/initial-offer.jpg' },
            { type: 'final_total', filePath: '/mock/final-total.jpg' }
          ]
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: 'Failed to process multiple screenshots' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Unified MCP AI Agent System
        </h1>
        <p className="text-gray-600">
          Integrated analytics for Honda Odyssey ride-sharing with real-time insights
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('process')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'process'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Trip Processing
        </button>
        <button
          onClick={() => setActiveTab('reanalyze')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'reanalyze'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reanalysis
        </button>
        <button
          onClick={() => setActiveTab('variance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'variance'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tip Variance
        </button>
        <button
          onClick={() => setActiveTab('multi')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'multi'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Multi-Screenshot
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {activeTab === 'process' && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Process Trip with Unified MCP</h3>
              <p className="text-gray-600 mb-4">
                Upload a trip screenshot and get comprehensive analysis including OCR, analytics, 
                tip variance, and Honda Odyssey-specific insights.
              </p>
              <button
                onClick={handleProcessTrip}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-md font-medium"
              >
                {loading ? 'Processing...' : 'Process Trip'}
              </button>
            </div>
          )}

          {activeTab === 'reanalyze' && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Reanalysis System</h3>
              <p className="text-gray-600 mb-4">
                Run daily, weekly, or comparison analysis on existing trip data.
                Get insights on performance trends and Honda Odyssey efficiency.
              </p>
              <button
                onClick={handleReanalysis}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-2 rounded-md font-medium"
              >
                {loading ? 'Analyzing...' : 'Run Daily Analysis'}
              </button>
            </div>
          )}

          {activeTab === 'variance' && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Tip Variance Analysis</h3>
              <p className="text-gray-600 mb-4">
                Compare initial tip estimates with final tip amounts.
                Track accuracy and identify patterns for better predictions.
              </p>
              <button
                onClick={handleTipVariance}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-6 py-2 rounded-md font-medium"
              >
                {loading ? 'Analyzing...' : 'Analyze Tip Variance'}
              </button>
            </div>
          )}

          {activeTab === 'multi' && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Multi-Screenshot Workflow</h3>
              <p className="text-gray-600 mb-4">
                Upload initial offer and final total screenshots together.
                Automatically runs tip variance analysis and workflow tracking.
              </p>
              <button
                onClick={handleMultiScreenshot}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-2 rounded-md font-medium"
              >
                {loading ? 'Processing...' : 'Process Multiple Screenshots'}
              </button>
            </div>
          )}

          {/* System Status */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">System Status</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Unified MCP Agent: Active</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Data Extraction MCP: Ready</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Analytics MCP: Ready</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Tip Variance MCP: Ready</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Screenshot Tracker: Ready</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Honda Odyssey Optimization: Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Processing with MCP agents...</span>
            </div>
          )}
          
          {result && !loading && (
            <div className="bg-white p-4 rounded-md border">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          {!result && !loading && (
            <div className="text-center py-12 text-gray-500">
              <p>Select a function above to see results</p>
              <p className="text-sm mt-2">All MCP agents are integrated and ready</p>
            </div>
          )}
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-2">OCR + LLM</h4>
          <p className="text-sm text-gray-600">Extract trip data from screenshots using OCR and AI processing</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-2">Time Analytics</h4>
          <p className="text-sm text-gray-600">Daily, weekly, and comparison analysis with trend detection</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-2">Tip Tracking</h4>
          <p className="text-sm text-gray-600">Compare initial estimates vs final tips with accuracy scoring</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-2">Honda Optimization</h4>
          <p className="text-sm text-gray-600">2003 Honda Odyssey-specific fuel and performance analysis</p>
        </div>
      </div>
    </div>
  );
}