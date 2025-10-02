import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all trips with enhanced fields and related screenshots
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select(`
        *,
        trip_screenshots (
          id,
          screenshot_type,
          image_path,
          upload_timestamp,
          is_processed,
          processing_notes,
          ocr_data,
          extracted_data
        )
      `)
      .order('created_at', { ascending: false });

    if (tripsError) {
      console.error('Database error:', tripsError);
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }

    // Get summary statistics for screenshots
    const { data: screenshotStats, error: statsError } = await supabaseAdmin
      .from('trip_screenshots')
      .select('screenshot_type, is_processed')
      .eq('is_processed', true);

    if (statsError) {
      console.error('Screenshot stats error:', statsError);
    }

    // Calculate screenshot type distribution
    const screenshotTypeCount = screenshotStats?.reduce((acc: Record<string, number>, curr) => {
      acc[curr.screenshot_type] = (acc[curr.screenshot_type] || 0) + 1;
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      total_trips: trips?.length || 0,
      total_screenshots: screenshotStats?.length || 0,
      trips: trips?.map(trip => ({
        ...trip,
        screenshot_count: trip.trip_screenshots?.length || 0,
        has_screenshots: (trip.trip_screenshots?.length || 0) > 0,
        screenshot_types: trip.trip_screenshots?.map((s: { screenshot_type: string }) => s.screenshot_type) || []
      })) || [],
      summary: {
        total_records: trips?.length || 0,
        latest_trip: trips?.[0]?.created_at || null,
        has_trip_data: trips?.some(t => t.trip_data) || false,
        enhanced_schema_active: true,
        screenshot_breakdown: screenshotTypeCount,
        processed_screenshots: screenshotStats?.length || 0
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}