import { supabaseAdmin } from "@/lib/supabase";
import { generateMaintenanceAlerts } from "@/lib/vehicle-maintenance";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const generate_new = searchParams.get('generate') === 'true';

    if (generate_new) {
      // Generate new alerts based on current data
      return await generateAndSaveAlerts();
    }

    // Fetch existing alerts
    const { data: alerts, error } = await supabaseAdmin
      .from('vehicle_alerts')
      .select('*')
      .eq('driver_id', 'default-driver')
      .eq('is_dismissed', false)
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch alerts error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    // Group alerts by urgency level
    const groupedAlerts = {
      critical: alerts.filter(alert => alert.urgency_level === 'critical'),
      high: alerts.filter(alert => alert.urgency_level === 'high'),
      medium: alerts.filter(alert => alert.urgency_level === 'medium'),
      low: alerts.filter(alert => alert.urgency_level === 'low')
    };

    return NextResponse.json({
      success: true,
      data: alerts,
      grouped: groupedAlerts,
      total: alerts.length,
      critical_count: groupedAlerts.critical.length
    });

  } catch (error) {
    console.error("Fetch alerts error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { alert_ids, action } = await request.json();

    if (action === 'dismiss') {
      // Dismiss selected alerts
      const { error } = await supabaseAdmin
        .from('vehicle_alerts')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .in('id', alert_ids);

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${alert_ids.length} alert(s) dismissed`
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error("Update alerts error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

async function generateAndSaveAlerts() {
  try {
    // Get current odometer reading from latest trip
    const { data: latestTrip } = await supabaseAdmin
      .from('trips')
      .select('trip_data')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let currentOdometer = 150000; // Default odometer reading
    if (latestTrip?.trip_data?.odometer_reading) {
      currentOdometer = latestTrip.trip_data.odometer_reading;
    }

    // Get maintenance records
    const { data: maintenanceRecords } = await supabaseAdmin
      .from('maintenance_records')
      .select('*')
      .eq('driver_id', 'default-driver')
      .order('service_date', { ascending: false });

    // Generate alerts
    const newAlerts = generateMaintenanceAlerts(
      currentOdometer,
      maintenanceRecords || []
    );

    // Clear existing undismissed alerts
    await supabaseAdmin
      .from('vehicle_alerts')
      .delete()
      .eq('driver_id', 'default-driver')
      .eq('is_dismissed', false);

    // Insert new alerts
    if (newAlerts.length > 0) {
      const { data: insertedAlerts, error } = await supabaseAdmin
        .from('vehicle_alerts')
        .insert(newAlerts)
        .select();

      if (error) {
        throw error;
      }

      console.log(`Generated ${newAlerts.length} new vehicle alerts`);

      return NextResponse.json({
        success: true,
        data: insertedAlerts,
        message: `Generated ${newAlerts.length} new alerts`,
        current_odometer: currentOdometer
      });
    } else {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No alerts needed at this time',
        current_odometer: currentOdometer
      });
    }

  } catch (error) {
    console.error("Generate alerts error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}