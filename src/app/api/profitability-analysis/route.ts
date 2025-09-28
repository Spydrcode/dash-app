import { supabaseAdmin } from "@/lib/supabase";
import { calculateRealNetProfit } from "@/lib/vehicle-maintenance";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '30';
    const include_projections = searchParams.get('projections') === 'true';

    // Get date range
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - parseInt(days));

    // Fetch trip data
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (tripsError) throw tripsError;

    // Fetch fuel records
    const { data: fuelRecords, error: fuelError } = await supabaseAdmin
      .from('fuel_records')
      .select('*')
      .eq('driver_id', 'default-driver')
      .gte('fill_up_date', startDate.toISOString().split('T')[0])
      .order('fill_up_date', { ascending: false });

    if (fuelError) throw fuelError;

    // Fetch maintenance records
    const { data: maintenanceRecords, error: maintenanceError } = await supabaseAdmin
      .from('maintenance_records')
      .select('*')
      .eq('driver_id', 'default-driver')
      .gte('service_date', startDate.toISOString().split('T')[0])
      .order('service_date', { ascending: false });

    if (maintenanceError) throw maintenanceError;

    // Calculate totals
    const totalTrips = trips.length;
    const totalTripEarnings = trips.reduce((sum, trip) => sum + (trip.trip_data?.driver_earnings || 0), 0);
    const totalTripDistance = trips.reduce((sum, trip) => sum + (trip.trip_data?.distance || 0), 0);
    
    const totalFuelCost = fuelRecords.reduce((sum, record) => sum + record.fuel_cost, 0);
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, record) => sum + record.cost, 0);
    
    // Calculate current MPG
    let currentMPG = 19.0; // Default Honda Odyssey MPG
    if (fuelRecords.length >= 2) {
      const recent = fuelRecords[0];
      const previous = fuelRecords[1];
      const milesDriven = recent.odometer_reading - previous.odometer_reading;
      if (milesDriven > 0 && previous.gallons_purchased > 0) {
        currentMPG = milesDriven / previous.gallons_purchased;
      }
    }

    // Calculate average fuel price
    const totalGallons = fuelRecords.reduce((sum, record) => sum + record.gallons_purchased, 0);
    const avgFuelPrice = totalGallons > 0 ? totalFuelCost / totalGallons : 3.50; // Default gas price

    // Calculate maintenance cost per mile (annualized)
    const totalMaintenanceAllTime = await getTotalMaintenanceCost();
    const totalMilesAllTime = await getTotalMilesDriven();
    const maintenanceCostPerMile = totalMilesAllTime > 0 ? totalMaintenanceAllTime / totalMilesAllTime : 0.15; // Default $0.15/mile

    // Calculate real net profit for each trip
    const tripsWithRealProfit = trips.map(trip => {
      const tripData = trip.trip_data;
      if (tripData?.driver_earnings && tripData?.distance) {
        const realProfit = calculateRealNetProfit(
          tripData.driver_earnings,
          tripData.distance,
          currentMPG,
          avgFuelPrice,
          maintenanceCostPerMile
        );
        return {
          ...trip,
          real_profit: realProfit
        };
      }
      return trip;
    }).filter(trip => trip.real_profit);

    // Aggregate real profit metrics
    const totalRealNetProfit = tripsWithRealProfit.reduce((sum, trip) => sum + trip.real_profit!.netProfit, 0);
    const avgRealProfitPerTrip = tripsWithRealProfit.length > 0 ? totalRealNetProfit / tripsWithRealProfit.length : 0;
    const avgRealProfitMargin = tripsWithRealProfit.length > 0 
      ? tripsWithRealProfit.reduce((sum, trip) => sum + trip.real_profit!.profitMargin, 0) / tripsWithRealProfit.length 
      : 0;

    // Cost breakdown
    const estimatedFuelCostFromTrips = tripsWithRealProfit.reduce((sum, trip) => sum + trip.real_profit!.fuelCost, 0);
    const estimatedMaintenanceCostFromTrips = tripsWithRealProfit.reduce((sum, trip) => sum + trip.real_profit!.maintenanceCost, 0);

    const profitabilityAnalysis = {
      period: `Last ${days} days`,
      trip_metrics: {
        total_trips: totalTrips,
        total_earnings: totalTripEarnings,
        total_distance: totalTripDistance,
        avg_earnings_per_trip: totalTrips > 0 ? totalTripEarnings / totalTrips : 0
      },
      cost_breakdown: {
        fuel_costs: {
          actual_fuel_purchases: totalFuelCost,
          estimated_from_trips: estimatedFuelCostFromTrips,
          avg_price_per_gallon: avgFuelPrice
        },
        maintenance_costs: {
          actual_maintenance: totalMaintenanceCost,
          estimated_from_trips: estimatedMaintenanceCostFromTrips,
          cost_per_mile: maintenanceCostPerMile
        },
        total_vehicle_costs: totalFuelCost + totalMaintenanceCost
      },
      profit_analysis: {
        gross_earnings: totalTripEarnings,
        total_vehicle_costs: totalFuelCost + totalMaintenanceCost,
        real_net_profit: totalRealNetProfit,
        profit_margin_percentage: avgRealProfitMargin,
        avg_net_profit_per_trip: avgRealProfitPerTrip
      },
      efficiency_metrics: {
        current_mpg: parseFloat(currentMPG.toFixed(1)),
        fuel_cost_per_mile: totalTripDistance > 0 ? estimatedFuelCostFromTrips / totalTripDistance : 0,
        maintenance_cost_per_mile: maintenanceCostPerMile,
        total_cost_per_mile: totalTripDistance > 0 ? (estimatedFuelCostFromTrips + estimatedMaintenanceCostFromTrips) / totalTripDistance : 0
      }
    };

    // Add projections if requested
    let projections = null;
    if (include_projections) {
      projections = {
        monthly_projection: {
          estimated_trips: Math.round((totalTrips / parseInt(days)) * 30),
          estimated_earnings: (totalTripEarnings / parseInt(days)) * 30,
          estimated_fuel_costs: (totalFuelCost / parseInt(days)) * 30,
          estimated_maintenance: (totalMaintenanceCost / parseInt(days)) * 30,
          estimated_net_profit: (totalRealNetProfit / parseInt(days)) * 30
        },
        annual_projection: {
          estimated_trips: Math.round((totalTrips / parseInt(days)) * 365),
          estimated_earnings: (totalTripEarnings / parseInt(days)) * 365,
          estimated_fuel_costs: (totalFuelCost / parseInt(days)) * 365,
          estimated_maintenance: (totalMaintenanceCost / parseInt(days)) * 365,
          estimated_net_profit: (totalRealNetProfit / parseInt(days)) * 365
        }
      };
    }

    return NextResponse.json({
      success: true,
      data: profitabilityAnalysis,
      projections: projections,
      raw_data: {
        trips_with_real_profit: tripsWithRealProfit.length,
        fuel_records: fuelRecords.length,
        maintenance_records: maintenanceRecords.length
      }
    });

  } catch (error) {
    console.error("Profitability analysis error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Helper function to get total maintenance cost
async function getTotalMaintenanceCost(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from('maintenance_records')
      .select('cost')
      .eq('driver_id', 'default-driver');

    if (error) throw error;
    return data.reduce((sum, record) => sum + record.cost, 0);
  } catch (error) {
    console.error('Error fetching total maintenance cost:', error);
    return 1000; // Default estimate
  }
}

// Helper function to estimate total miles driven
async function getTotalMilesDriven(): Promise<number> {
  try {
    // Get odometer range from fuel records
    const { data, error } = await supabaseAdmin
      .from('fuel_records')
      .select('odometer_reading')
      .eq('driver_id', 'default-driver')
      .order('odometer_reading', { ascending: true });

    if (error || !data || data.length < 2) {
      // Fallback: estimate from trip distances
      const { data: trips } = await supabaseAdmin
        .from('trips')
        .select('trip_data')
        .eq('driver_id', 'default-driver');
      
      return trips ? trips.reduce((sum, trip) => sum + (trip.trip_data?.distance || 0), 0) : 10000;
    }

    const minOdometer = data[0].odometer_reading;
    const maxOdometer = data[data.length - 1].odometer_reading;
    return maxOdometer - minOdometer;

  } catch (error) {
    console.error('Error estimating total miles:', error);
    return 10000; // Default estimate
  }
}