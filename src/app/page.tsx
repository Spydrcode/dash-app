'use client';

import AIInsightsDashboard from "@/components/AIInsightsDashboard";
import NotificationSystem from "@/components/NotificationSystem";
import { InsightUpdateManager } from "@/lib/insight-update-manager";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalTrips: number;
  totalEarnings: number;
  avgTripProfit: number;
  hondaMPG: number;
  totalDistance: number;
  processedTrips: number;
  totalScreenshots: number;
  processedScreenshots: number;
  screenshotTypes: {
    initial_offer: number;
    final_total: number;
    dashboard: number;
  };
  tripStatus: {
    complete: number;
    partial: number;
    incomplete: number;
  };
  validationSummary: {
    accuracyRate: number;
    totalValidated: number;
    weeklyValidationsCount: number;
  };
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard-stats');
      const data = await response.json();
      if (data.success) {
        const newStats = data.stats;
        
        // Check if processed screenshots increased (indicating new data)
        if (stats && newStats.processedScreenshots > stats.processedScreenshots) {
          console.log('📊 New screenshots processed - triggering AI insights update');
          InsightUpdateManager.forceRefresh();
        }
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setLoading(true);
    // Also trigger AI insights refresh
    window.dispatchEvent(new CustomEvent('dashboardRefresh'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSystem />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚗 Trip Analytics Dashboard</h1>
              <p className="text-gray-600">Honda Odyssey Ride-Share Performance Tracker</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefresh}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                disabled={loading}
                title="Refresh all data"
              >
                {loading ? '🔄' : '↻'} Refresh
              </button>
              <Link
                href="/vehicle"
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                title="Vehicle maintenance & fuel"
              >
                🔧 Vehicle
              </Link>
              <Link
                href="/weekly-summary"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                title="Validate weekly totals"
              >
                📊 Weekly Validation
              </Link>
              <Link
                href="/upload"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                📱 Upload Screenshots
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Trips</div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '⏳' : (stats?.totalTrips || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stats?.processedTrips ? `${stats.processedTrips} with data` : 'Upload screenshots to see data'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Earnings</div>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '⏳' : `$${stats?.totalEarnings?.toFixed(2) || '0.00'}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">Based on processed trips</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Avg Trip Profit</div>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '⏳' : `$${stats?.avgTripProfit?.toFixed(2) || '0.00'}`}
            </div>
            <div className="text-xs text-gray-500 mt-1">After fuel & expenses</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Honda MPG</div>
            <div className="text-2xl font-bold text-purple-600">
              {loading ? '⏳' : `${stats?.hondaMPG?.toFixed(1) || '19.0'} MPG`}
            </div>
            <div className="text-xs text-gray-500 mt-1">2003 Odyssey efficiency</div>
          </div>
        </div>

        {/* Validation Status Dashboard */}
        {stats && (stats.totalScreenshots > 0 || stats.validationSummary?.totalValidated > 0) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Validation Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Trip Completion Status */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-600">Trip Completion</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Complete:</span>
                    <span className="font-semibold">{stats.tripStatus?.complete || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-700">Partial:</span>
                    <span className="font-semibold">{stats.tripStatus?.partial || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-700">Incomplete:</span>
                    <span className="font-semibold">{stats.tripStatus?.incomplete || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Screenshot Processing */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm font-medium text-green-600">Screenshot Processing</div>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  {stats.processedScreenshots}/{stats.totalScreenshots}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {stats.totalScreenshots > 0 ? 
                    `${((stats.processedScreenshots / stats.totalScreenshots) * 100).toFixed(1)}% processed` : 
                    'No screenshots yet'}
                </div>
              </div>
              
              {/* Screenshot Types */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-600">Screenshot Types</div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Initial:</span>
                    <span className="font-semibold">{stats.screenshotTypes?.initial_offer || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Final:</span>
                    <span className="font-semibold">{stats.screenshotTypes?.final_total || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Other:</span>
                    <span className="font-semibold">{stats.screenshotTypes?.dashboard || 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Weekly Validation */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-600">Weekly Validation</div>
                <div className="text-2xl font-bold text-orange-700 mt-1">
                  {stats.validationSummary?.accuracyRate?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {stats.validationSummary?.totalValidated || 0} validated
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Status */}
        {stats && stats.totalScreenshots > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-lg">✅</span>
              <div>
                <div className="font-semibold text-green-800">Real OCR Data Active</div>
                <div className="text-green-700 text-sm">
                  {stats.processedScreenshots}/{stats.totalScreenshots} screenshots processed • 
                  No mock data ever used • AI insights updating with new uploads
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Dashboard */}
        <AIInsightsDashboard key={refreshTrigger} />

        {/* Get Started Guide */}
        <div className="bg-white rounded-lg shadow p-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900">1. Upload Screenshots</h3>
              <p className="text-gray-600 text-sm mt-1">Take screenshots of your ride-share trip offers and final totals</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-semibold text-gray-900">2. AI Processing</h3>
              <p className="text-gray-600 text-sm mt-1">AI extracts trip data, calculates profit, and analyzes patterns</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="font-semibold text-gray-900">3. Track Vehicle</h3>
              <p className="text-gray-600 text-sm mt-1">Log maintenance, fuel costs, and get alerts for your Honda Odyssey</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900">4. Weekly Validation</h3>
              <p className="text-gray-600 text-sm mt-1">Upload weekly summaries to cross-validate and ensure data accuracy</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-gray-900">5. View Analytics</h3>
              <p className="text-gray-600 text-sm mt-1">Get insights on best times, fuel efficiency, and real net profit</p>
            </div>
          </div>
          <div className="text-center mt-6 space-x-4">
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              📸 Upload Trip Screenshots
            </Link>
            <Link
              href="/vehicle"
              className="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              🔧 Track Vehicle Costs
            </Link>
            <Link
              href="/weekly-summary"
              className="bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              📊 Validate Weekly Summary
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
