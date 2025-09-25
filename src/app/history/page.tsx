'use client';

import { supabase, type TripRecord } from '@/lib/supabase';
import { CalendarIcon, ChartBarIcon, DocumentTextIcon, TruckIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function HistoryPage() {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTrips(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return amount ? `$${amount.toFixed(2)}` : '$0.00';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading trip history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading History</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchTrips}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalTrips = trips.length;
  const totalProfit = trips.reduce((sum, trip) => sum + (trip.total_profit || 0), 0);
  const totalDistance = trips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0);
  const avgProfitPerTrip = totalTrips > 0 ? totalProfit / totalTrips : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trip History & Analytics</h1>
          <p className="text-gray-600 mt-2">View all your rideshare trips and AI insights</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold text-gray-900">{totalTrips}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(totalProfit)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Distance</p>
                <p className="text-2xl font-bold text-gray-900">{totalDistance.toFixed(1)} mi</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Per Trip</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgProfitPerTrip)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trips List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Trips</h2>
          </div>
          
          {trips.length === 0 ? (
            <div className="p-12 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
              <p className="text-gray-600">Upload your first trip screenshot to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {trips.map((trip) => (
                <div 
                  key={trip.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <span className="text-sm font-medium text-blue-600">
                          {trip.vehicle_model || '2003 Honda Odyssey'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(trip.created_at)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Distance:</span>
                          <span className="ml-1 font-medium">{trip.total_distance?.toFixed(1) || '0'} mi</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Gas Cost:</span>
                          <span className="ml-1 font-medium">{formatCurrency(trip.gas_cost)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Profit:</span>
                          <span className="ml-1 font-medium text-green-600">{formatCurrency(trip.total_profit)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Trip Type:</span>
                          <span className="ml-1 font-medium">
                            {trip.trip_data?.trip_type === 'multiple' 
                              ? `${trip.trip_data?.total_trips || 1} trips` 
                              : 'Single trip'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(trip.total_profit)}
                      </div>
                      {trip.ai_insights?.performance_category && (
                        <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                          trip.ai_insights.performance_category === 'Excellent' ? 'bg-green-100 text-green-800' :
                          trip.ai_insights.performance_category === 'Good' ? 'bg-blue-100 text-blue-800' :
                          trip.ai_insights.performance_category === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {trip.ai_insights.performance_category}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trip Detail Modal */}
        {selectedTrip && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Trip Details</h2>
                  <button 
                    onClick={() => setSelectedTrip(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-600 mt-1">{formatDate(selectedTrip.created_at)}</p>
              </div>
              
              <div className="p-6">
                {/* Trip Data */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Trip Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedTrip.trip_data, null, 2)}
                    </pre>
                  </div>
                </div>
                
                {/* AI Insights */}
                {selectedTrip.ai_insights && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">AI Insights</h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedTrip.ai_insights, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* Predictions */}
                {selectedTrip.predictions && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Predictions</h3>
                    <div className="bg-green-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedTrip.predictions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}