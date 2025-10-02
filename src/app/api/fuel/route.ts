import { supabaseAdmin } from "@/lib/supabase";
import { FuelRecord } from "@/lib/vehicle-maintenance";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      fuel_cost,
      gallons_purchased,
      odometer_reading,
      fill_date,
      gas_station,
      fuel_type,
    } = await request.json();

    console.log("Adding fuel record:", {
      fuel_cost,
      gallons_purchased,
      odometer_reading,
      fill_date,
    });

    // Calculate price per gallon
    const price_per_gallon =
      gallons_purchased > 0 ? fuel_cost / gallons_purchased : 0;

    // Use current date if fill_date is undefined or null
    const actualFillDate = fill_date || new Date().toISOString().split("T")[0];

    const fuelRecord: FuelRecord = {
      driver_id: "default-driver",
      vehicle_model: "2003 Honda Odyssey",
      cost: parseFloat(fuel_cost),
      gallons: parseFloat(gallons_purchased),
      price_per_gallon: parseFloat(price_per_gallon.toFixed(3)),
      odometer_reading: parseInt(odometer_reading),
      fill_date: actualFillDate,
      station_location: gas_station,
      fuel_type: fuel_type || "Regular",
    };

    // Insert fuel record
    const { data, error } = await supabaseAdmin
      .from("fuel_records")
      .insert(fuelRecord)
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

    // Calculate MPG if we have a previous fuel record
    let calculatedMPG = null;
    const { data: previousRecord } = await supabaseAdmin
      .from("fuel_records")
      .select("odometer_reading")
      .eq("driver_id", "default-driver")
      .lt("odometer_reading", odometer_reading)
      .order("odometer_reading", { ascending: false })
      .limit(1)
      .single();

    if (previousRecord) {
      const milesDriven = odometer_reading - previousRecord.odometer_reading;
      calculatedMPG =
        gallons_purchased > 0
          ? (milesDriven / gallons_purchased).toFixed(1)
          : null;
    }

    console.log("Fuel record saved:", data);

    return NextResponse.json({
      success: true,
      message: "Fuel record added successfully",
      data: data,
      calculatedMPG: calculatedMPG ? `${calculatedMPG} MPG` : null,
      pricePerGallon: `$${price_per_gallon.toFixed(3)}/gal`,
    });
  } catch (error) {
    console.error("Fuel record error:", error);
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
    const days = searchParams.get("days") || "30";

    // Get fuel records from the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await supabaseAdmin
      .from("fuel_records")
      .select("*")
      .eq("driver_id", "default-driver")
      .gte("fill_date", startDate.toISOString().split("T")[0])
      .order("fill_date", { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error("Fetch fuel records error:", error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Calculate fuel statistics
    const totalCost = data.reduce((sum, record) => sum + record.cost, 0);
    const totalGallons = data.reduce((sum, record) => sum + record.gallons, 0);
    const avgPricePerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;
    const lastFillUp = data[0];

    // Calculate current MPG from last two fill-ups
    let currentMPG = 19.0; // Default Honda Odyssey 2003 MPG
    if (data.length >= 2) {
      const recent = data[0];
      const previous = data[1];
      const milesDriven = recent.odometer_reading - previous.odometer_reading;
      if (milesDriven > 0 && previous.gallons > 0) {
        currentMPG = milesDriven / previous.gallons;
      }
    }

    return NextResponse.json({
      success: true,
      data: data,
      statistics: {
        total_records: data.length,
        total_cost: totalCost,
        total_gallons: totalGallons,
        avg_price_per_gallon: avgPricePerGallon,
        current_mpg: parseFloat(currentMPG.toFixed(1)),
        last_fill_up: lastFillUp,
        days_covered: parseInt(days),
      },
    });
  } catch (error) {
    console.error("Fetch fuel records error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
