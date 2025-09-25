'use client';

import { useState } from 'react';

interface DiagnosticResult {
  success: boolean;
  message: string;
  diagnostics: any;
  error?: string;
}

export default function SupabaseTestPage() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-supabase');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to run test',
        diagnostics: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    setLoading(false);
  };

  const testSimpleConnection = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/unified-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_insights', timeframe: 'all' })
      });
      
      const data = await response.json();
      setResult({
        success: response.ok,
        message: response.ok ? 'AI Insights API working!' : 'AI Insights API failed',
        diagnostics: data,
        error: response.ok ? undefined : data.error
      });
    } catch (error) {
      setResult({
        success: false,
        message: 'AI Insights API test failed',
        diagnostics: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔧 Supabase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Diagnostics</h2>
          <div className="flex gap-4 mb-6">
            <button
              onClick={runTest}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '🔄 Testing...' : '🔍 Run Full Diagnostics'}
            </button>
            
            <button
              onClick={testSimpleConnection}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '🔄 Testing...' : '📊 Test AI Insights API'}
            </button>
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center mb-2">
                <div className={`text-2xl mr-3 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                  {result.success ? '✅' : '❌'}
                </div>
                <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </h3>
              </div>
              
              {result.error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800">
                  <strong>Error:</strong> {result.error}
                </div>
              )}

              {result.diagnostics && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Diagnostic Details:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(result.diagnostics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Quick Fixes</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-800">1. Check .env.local file</h3>
              <p className="text-gray-600">Ensure your Supabase credentials are properly set in .env.local</p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-800">2. Verify Supabase Project</h3>
              <p className="text-gray-600">Check that your Supabase project is active and accessible</p>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-semibold text-gray-800">3. Database Tables</h3>
              <p className="text-gray-600">Ensure required tables (trips, trip_screenshots, reanalysis_sessions) exist</p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-800">4. Upload Trip Data</h3>
              <p className="text-gray-600">Try uploading some screenshots at <a href="/upload" className="text-blue-600 hover:underline">/upload</a> to populate the database</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}