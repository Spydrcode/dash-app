import AIInsightsDashboard from "@/components/AIInsightsDashboard";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚗 Trip Analytics Dashboard</h1>
              <p className="text-gray-600">Honda Odyssey Ride-Share Performance Tracker</p>
            </div>
            <div className="flex gap-4">
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
            <div className="text-2xl font-bold text-gray-900">--</div>
            <div className="text-xs text-gray-500 mt-1">Upload screenshots to see data</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Total Earnings</div>
            <div className="text-2xl font-bold text-green-600">$--</div>
            <div className="text-xs text-gray-500 mt-1">Based on processed trips</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Avg Trip Profit</div>
            <div className="text-2xl font-bold text-blue-600">$--</div>
            <div className="text-xs text-gray-500 mt-1">After fuel & expenses</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-500">Honda MPG</div>
            <div className="text-2xl font-bold text-purple-600">-- MPG</div>
            <div className="text-xs text-gray-500 mt-1">2003 Odyssey efficiency</div>
          </div>
        </div>

        {/* AI Insights Dashboard */}
        <AIInsightsDashboard />

        {/* Get Started Guide */}
        <div className="bg-white rounded-lg shadow p-8 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900">3. View Analytics</h3>
              <p className="text-gray-600 text-sm mt-1">Get insights on best times, fuel efficiency, and profit optimization</p>
            </div>
          </div>
          <div className="text-center mt-6">
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              📸 Upload Your First Screenshots
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
