import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get all trips with enhanced data
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        *,
        trip_screenshots (
          id,
          screenshot_type,
          extracted_data,
          is_processed
        )
      `)
      .order('created_at', { ascending: false });

    if (tripsError) {
      console.error('Database error:', tripsError);
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }

    // Get weekly validation sessions count
    const { data: weeklySessions, error: sessionsError } = await supabaseAdmin
      .from('reanalysis_sessions')
      .select('id, analysis_type, results')
      .eq('analysis_type', 'weekly');
    
    const weeklyValidationsCount = weeklySessions?.length || 0;

    // Calculate real stats from actual data
    const totalTrips = trips?.length || 0;
    
    // Extract real values from trip data or trip_data field
    const extractValue = (trip: any, field: string, fallback: number = 0) => {
      return (trip.trip_data?.[field] ?? trip[field] ?? fallback);
    };

    let totalEarnings = 0;
    let totalProfit = 0;
    let totalDistance = 0;
    let totalFuelCost = 0;
    let processedTrips = 0;

    trips?.forEach(trip => {
      const earnings = extractValue(trip, 'driver_earnings');
      const profit = extractValue(trip, 'profit');
      const distance = extractValue(trip, 'distance');
      const fuelCost = extractValue(trip, 'gas_cost');

      if (earnings > 0 || profit !== 0) {
        totalEarnings += earnings;
        totalProfit += profit;
        totalDistance += distance;
        totalFuelCost += fuelCost;
        processedTrips++;
      }
    });

    // Calculate Honda Odyssey MPG (2003 model: 19 MPG average)
    const avgMPG = totalFuelCost > 0 ? totalDistance / (totalFuelCost / 3.50) : 19;
    const avgTripProfit = processedTrips > 0 ? totalProfit / processedTrips : 0;

    // Count screenshots by type and track trip status
    let totalScreenshots = 0;
    let processedScreenshots = 0;
    const screenshotTypes = { dashboard: 0, initial_offer: 0, final_total: 0 };
    const tripStatus = { complete: 0, partial: 0, incomplete: 0 };
    let totalTipVariance = 0;
    let accurateTrips = 0;
    let tripsWithVariance = 0;

    trips?.forEach(trip => {
      // Count trip status
      const status = trip.trip_status || 'incomplete';
      if (tripStatus.hasOwnProperty(status)) {
        tripStatus[status as keyof typeof tripStatus]++;
      }
      
      // Track tip accuracy
      if (trip.tip_variance !== null && trip.tip_variance !== undefined) {
        totalTipVariance += Math.abs(trip.tip_variance);
        tripsWithVariance++;
        if (trip.tip_accuracy === 'exact') accurateTrips++;
      }
      
      // Count screenshots
      if (trip.trip_screenshots) {
        totalScreenshots += trip.trip_screenshots.length;
        trip.trip_screenshots.forEach((screenshot: any) => {
          if (screenshot.is_processed) processedScreenshots++;
          if (screenshotTypes.hasOwnProperty(screenshot.screenshot_type)) {
            screenshotTypes[screenshot.screenshot_type as keyof typeof screenshotTypes]++;
          }
        });
      }
    });
    
    // Calculate validation metrics
    const accuracyRate = tripsWithVariance > 0 ? (accurateTrips / tripsWithVariance) * 100 : 0;
    const avgTipVariance = tripsWithVariance > 0 ? totalTipVariance / tripsWithVariance : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalTrips,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        avgTripProfit: Math.round(avgTripProfit * 100) / 100,
        hondaMPG: Math.round(avgMPG * 10) / 10,
        totalDistance: Math.round(totalDistance * 10) / 10,
        totalFuelCost: Math.round(totalFuelCost * 100) / 100,
        processedTrips,
        totalScreenshots,
        processedScreenshots,
        screenshotTypes,
        tripStatus,
        validationSummary: {
          accuracyRate: Math.round(accuracyRate * 10) / 10,
          totalValidated: tripsWithVariance,
          weeklyValidationsCount: weeklyValidationsCount,
          avgTipVariance: Math.round(avgTipVariance * 100) / 100
        }
      },
      message: processedTrips === 0 ? 'Upload screenshots to see real data' : `Real data from ${processedTrips} processed trips with ${tripStatus.complete} complete validations`
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}