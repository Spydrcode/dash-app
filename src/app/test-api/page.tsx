'use client';

import { useState } from 'react';

export default function TestAPI() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testProcessTrip = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/process-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath: 'https://yrbhmybcbygftccajgws.supabase.co/storage/v1/object/public/trip-uploads/1758819123105-IMG_2864.png',
          driverId: 'test-driver-123'
        })
      });
      
      const data = await response.json();
      setResult(data);
      console.log('API Response:', data);
    } catch (error) {
      console.error('API Error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">API Test</h1>
      
      <button
        onClick={testProcessTrip}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Process Trip API'}
      </button>

      {result && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}