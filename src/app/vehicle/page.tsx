'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface MaintenanceRecord {
  id: number;
  maintenance_type: string;
  description: string;
  cost: number;
  odometer_reading: number;
  service_date: string;
  next_service_due?: number;
  service_location?: string;
}

interface FuelRecord {
  id: number;
  cost: number;
  gallons: number;
  price_per_gallon: number;
  odometer_reading: number;
  fill_date: string;
  station_location?: string;
}

interface VehicleAlert {
  id: number;
  alert_type: string;
  title: string;
  description: string;
  urgency_level: string;
  maintenance_type?: string;
  target_odometer?: number;
  current_odometer?: number;
}

export default function VehicleMaintenance() {
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'fuel' | 'alerts'>('overview');
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    maintenance?: Record<string, unknown>;
    fuel?: Record<string, unknown>;
  }>({});

  // Form states
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchMaintenanceRecords(),
        fetchFuelRecords(),
        fetchAlerts(true) // Generate new alerts
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchMaintenanceRecords = async () => {
    try {
      const response = await fetch('/api/maintenance');
      const data = await response.json();
      if (data.success) {
        setMaintenanceRecords(data.data);
        setStats(prev => ({ ...prev, maintenance: data.statistics }));
      }
    } catch (error) {
      console.error('Failed to fetch maintenance records:', error);
    }
  };

  const fetchFuelRecords = async () => {
    try {
      const response = await fetch('/api/fuel');
      const data = await response.json();
      if (data.success) {
        setFuelRecords(data.data);
        setStats(prev => ({ ...prev, fuel: data.statistics }));
      }
    } catch (error) {
      console.error('Failed to fetch fuel records:', error);
    }
  };

  const fetchAlerts = async (generateNew = false) => {
    try {
      const response = await fetch(`/api/vehicle-alerts${generateNew ? '?generate=true' : ''}`);
      const data = await response.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const submitMaintenanceRecord = async (formData: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const maintenanceData = {
        maintenance_type: formData.get('maintenance_type'),
        description: formData.get('description'),
        cost: formData.get('cost'),
        odometer_reading: formData.get('odometer_reading'),
        service_date: formData.get('service_date'),
        service_location: formData.get('service_location')
      };

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceData)
      });

      const result = await response.json();
      
      if (result.success) {
        setSubmitStatus(`✅ Maintenance record added! Next service due: ${result.nextServiceInfo.miles_remaining} miles`);
        setShowMaintenanceForm(false);
        await fetchAllData(); // Refresh all data including alerts
      } else {
        setSubmitStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setSubmitStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFuelRecord = async (formData: FormData) => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const fuelData = {
        fuel_cost: formData.get('fuel_cost'),
        gallons_purchased: formData.get('gallons_purchased'),
        odometer_reading: formData.get('odometer_reading'),
        fill_up_date: formData.get('fill_up_date'),
        gas_station: formData.get('gas_station'),
        fuel_type: formData.get('fuel_type')
      };

      const response = await fetch('/api/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fuelData)
      });

      const result = await response.json();
      
      if (result.success) {
        setSubmitStatus(`✅ Fuel record added! ${result.calculatedMPG ? `Calculated: ${result.calculatedMPG}` : ''} Price: ${result.pricePerGallon}`);
        setShowFuelForm(false);
        await fetchAllData();
      } else {
        setSubmitStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      setSubmitStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissAlert = async (alertId: number) => {
    try {
      await fetch('/api/vehicle-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_ids: [alertId], action: 'dismiss' })
      });
      await fetchAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateNetProfit = (): {
    totalFuelCost: number;
    totalMaintenanceCost: number;
    totalOperatingCosts: number;
    avgCostPerRecord: number;
    currentMPG: number;
    totalRecords: number;
  } | null => {
    if (!stats?.fuel || !stats?.maintenance) return null;

    const fuelStats = stats.fuel as { total_cost: number; current_mpg: number; total_records: number };
    const maintenanceStats = stats.maintenance as { total_cost: number; total_records: number };

    const totalFuelCost = fuelStats.total_cost || 0;
    const totalMaintenanceCost = maintenanceStats.total_cost || 0;
    const currentMPG = fuelStats.current_mpg || 0;
    const totalOperatingCosts = totalFuelCost + totalMaintenanceCost;

    // Instead of fake profit, show cost per mile analysis
    const totalRecords = (fuelStats.total_records || 0) + (maintenanceStats.total_records || 0);
    const avgCostPerRecord = totalRecords > 0 ? totalOperatingCosts / totalRecords : 0;

    return { 
      totalFuelCost, 
      totalMaintenanceCost, 
      totalOperatingCosts,
      avgCostPerRecord,
      currentMPG,
      totalRecords
    };
  };

  const profitAnalysis = calculateNetProfit();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">🔧 Vehicle Maintenance & Fuel</h1>
              <p className="text-gray-600">2003 Honda Odyssey - Complete Vehicle Management</p>
            </div>
            <button
              onClick={fetchAllData}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              {loading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Alert Banner */}
        {alerts.length > 0 && (
          <div className="mb-8">
            {alerts.filter(alert => alert.urgency_level === 'critical').length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600 text-xl">🚨</span>
                  <h3 className="font-semibold text-red-800">Critical Maintenance Required!</h3>
                </div>
                <div className="space-y-2">
                  {alerts.filter(alert => alert.urgency_level === 'critical').map(alert => (
                    <div key={alert.id} className="flex justify-between items-center text-sm">
                      <span className="text-red-700">{alert.description}</span>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {submitStatus && (
          <div className={`mb-6 p-4 rounded-lg ${submitStatus.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {submitStatus}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: '📊 Overview', count: null },
              { key: 'maintenance', label: '🔧 Maintenance', count: maintenanceRecords.length },
              { key: 'fuel', label: '⛽ Fuel', count: fuelRecords.length },
              { key: 'alerts', label: '🚨 Alerts', count: alerts.length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'overview' | 'maintenance' | 'fuel' | 'alerts')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Cost Tracking Analysis */}
            {profitAnalysis && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">💰 Operating Cost Tracking</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${profitAnalysis.totalOperatingCosts.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Operating Costs</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {profitAnalysis.totalRecords} recorded transactions
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      ${profitAnalysis.totalFuelCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Fuel Costs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      ${profitAnalysis.totalMaintenanceCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Maintenance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {profitAnalysis.currentMPG} MPG
                    </div>
                    <div className="text-sm text-gray-600">Current Efficiency</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Profit Calculation:</strong> To see actual profit, subtract these operating costs from your trip earnings. 
                    Currently tracking vehicle expenses only - trip earnings integration coming soon!
                  </p>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 mb-3">🔧 Recent Maintenance</h4>
                {maintenanceRecords.slice(0, 3).map(record => (
                  <div key={record.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm">{record.description}</span>
                    <span className="text-sm font-medium">${record.cost}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 mb-3">⛽ Recent Fill-ups</h4>
                {fuelRecords.slice(0, 3).map(record => (
                  <div key={record.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm">{record.gallons.toFixed(1)} gal</span>
                    <span className="text-sm font-medium">${record.cost}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 mb-3">🚨 Active Alerts</h4>
                {alerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className={`p-2 rounded text-xs mb-2 ${getSeverityColor(alert.urgency_level)}`}>
                    {alert.description}
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-sm text-green-600">✅ No active alerts</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Maintenance Records</h3>
              <button
                onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Maintenance
              </button>
            </div>

            {/* Add Maintenance Form */}
            {showMaintenanceForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold mb-4">Add Maintenance Record</h4>
                <form onSubmit={(e) => { e.preventDefault(); submitMaintenanceRecord(new FormData(e.currentTarget)); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                      <select name="maintenance_type" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="">Select service type</option>
                        <option value="oil_change">Oil Change</option>
                        <option value="oil_filter">Oil Filter</option>
                        <option value="air_filter">Air Filter</option>
                        <option value="tire_rotation">Tire Rotation</option>
                        <option value="brake_service">Brake Service</option>
                        <option value="transmission">Transmission Service</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                      <input name="cost" type="number" step="0.01" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Reading</label>
                      <input name="odometer_reading" type="number" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
                      <input name="service_date" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input name="description" type="text" required placeholder="e.g. Oil change with synthetic oil" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Location</label>
                      <input name="service_location" type="text" placeholder="e.g. Jiffy Lube" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Record'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMaintenanceForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Maintenance Records Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odometer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {maintenanceRecords.map(record => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.description}</div>
                        <div className="text-xs text-gray-500">{record.service_location}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.cost.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.odometer_reading.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.service_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.next_service_due ? record.next_service_due.toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Fuel Tab */}
        {activeTab === 'fuel' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Fuel Records</h3>
              <button
                onClick={() => setShowFuelForm(!showFuelForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Fill-up
              </button>
            </div>

            {/* Add Fuel Form */}
            {showFuelForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold mb-4">Add Fuel Record</h4>
                <form onSubmit={(e) => { e.preventDefault(); submitFuelRecord(new FormData(e.currentTarget)); }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
                      <input name="fuel_cost" type="number" step="0.01" required placeholder="60.00" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gallons</label>
                      <input name="gallons_purchased" type="number" step="0.01" required placeholder="15.5" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Odometer Reading</label>
                      <input name="odometer_reading" type="number" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fill-up Date</label>
                      <input name="fill_up_date" type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gas Station</label>
                      <input name="gas_station" type="text" placeholder="Shell, BP, etc." className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                      <select name="fuel_type" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option value="Regular">Regular</option>
                        <option value="Plus">Plus</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Record'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFuelForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Fuel Records Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gallons</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Gal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odometer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fuelRecords.map(record => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${record.cost.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.gallons.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${record.price_per_gallon.toFixed(3)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.odometer_reading.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.fill_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.station_location || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Vehicle Alerts</h3>
              <button
                onClick={() => fetchAlerts(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                🔄 Generate New Alerts
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <span className="text-4xl">✅</span>
                <h4 className="text-lg font-semibold text-green-800 mt-2">No Active Alerts</h4>
                <p className="text-green-600">Your vehicle maintenance is up to date!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.urgency_level)}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm uppercase">{alert.alert_type.replace(/_/g, ' ')}</span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-current bg-opacity-20">
                            {alert.urgency_level.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm mb-2">{alert.description}</p>
                        {alert.target_odometer && alert.current_odometer && (
                          <p className="text-xs">
                            Current: {alert.current_odometer.toLocaleString()} mi | 
                            Due at: {alert.target_odometer.toLocaleString()} mi
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}