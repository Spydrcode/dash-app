import { supabaseAdmin } from "@/lib/supabase";
import {
    HONDA_ODYSSEY_2003_MAINTENANCE_SCHEDULE,
    MaintenanceRecord,
} from "@/lib/vehicle-maintenance";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      maintenance_type,
      description,
      cost,
      odometer_reading,
      service_date,
      service_location,
      receipt_image,
    } = await request.json();

    console.log("Adding maintenance record:", {
      maintenance_type,
      description,
      cost,
      odometer_reading,
      service_date,
    });

    // Calculate next service due based on maintenance schedule
    const schedule =
      HONDA_ODYSSEY_2003_MAINTENANCE_SCHEDULE[
        maintenance_type as keyof typeof HONDA_ODYSSEY_2003_MAINTENANCE_SCHEDULE
      ];
    
    // Safely calculate next service due with integer overflow protection
    const currentOdometer = parseInt(odometer_reading);
    const intervalMiles = schedule?.interval_miles || 0;
    
    console.log('Odometer calculation:', { 
      currentOdometer, 
      intervalMiles, 
      maintenance_type,
      raw_odometer: odometer_reading 
    });
    
    const calculatedNextService = currentOdometer + intervalMiles;
    
    // PostgreSQL integer limit is 2,147,483,647 - add safety check
    const next_service_due = schedule && calculatedNextService < 2147483647
      ? calculatedNextService
      : null;

    // Calculate estimated next service date
    const avgMilesPerDay = 100; // Estimate based on rideshare usage
    const daysUntilService = schedule
      ? schedule.interval_miles / avgMilesPerDay
      : null;
    const next_service_date = daysUntilService
      ? new Date(Date.now() + daysUntilService * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : null;

    const maintenanceRecord: MaintenanceRecord = {
      driver_id: "default-driver",
      vehicle_model: "2003 Honda Odyssey",
      maintenance_type,
      description,
      cost: parseFloat(cost),
      odometer_reading: parseInt(odometer_reading),
      service_date,
      next_service_due: next_service_due || undefined,
      next_service_date: next_service_date || undefined,
      service_location,
      receipt_image,
    };

    // Insert maintenance record
    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .insert(maintenanceRecord)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: `Database error: ${error.message}`,
        },
        { status: 500 }
      );
    }

    console.log("Maintenance record saved:", data);

    return NextResponse.json({
      success: true,
      message: "Maintenance record added successfully",
      data: data,
      nextServiceInfo: {
        next_service_due,
        next_service_date,
        miles_remaining: next_service_due
          ? next_service_due - odometer_reading
          : null,
      },
    });
  } catch (error) {
    console.error("Maintenance record error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "50";
    const maintenance_type = searchParams.get("type");

    let query = supabaseAdmin
      .from("maintenance_records")
      .select("*")
      .eq("driver_id", "default-driver")
      .order("service_date", { ascending: false })
      .limit(parseInt(limit));

    if (maintenance_type) {
      query = query.eq("maintenance_type", maintenance_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Fetch maintenance records error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Calculate maintenance statistics
    const totalCost = data.reduce((sum, record) => sum + record.cost, 0);
    const avgCost = data.length > 0 ? totalCost / data.length : 0;
    const lastService = data[0];
    const serviceTypes = [
      ...new Set(data.map((record) => record.maintenance_type)),
    ];

    return NextResponse.json({
      success: true,
      data: data,
      statistics: {
        total_records: data.length,
        total_cost: totalCost,
        average_cost: avgCost,
        last_service: lastService,
        service_types: serviceTypes,
      },
    });
  } catch (error) {
    console.error("Fetch maintenance records error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
