import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase admin client not initialized'
      });
    }

    // Check trips table
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select('*')
      .limit(5);

    // Check trip_screenshots table
    const { data: screenshots, error: screenshotsError } = await supabaseAdmin
      .from('trip_screenshots')
      .select('*')
      .limit(5);

    // Check cumulative_insights table
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from('cumulative_insights')
      .select('*')
      .limit(5);

    return NextResponse.json({
      success: true,
      database_status: {
        trips: {
          count: trips?.length || 0,
          error: tripsError?.message || null,
          sample: trips?.[0] || null
        },
        screenshots: {
          count: screenshots?.length || 0,
          error: screenshotsError?.message || null,
          sample: screenshots?.[0] || null
        },
        insights: {
          count: insights?.length || 0,
          error: insightsError?.message || null,
          sample: insights?.[0] || null
        }
      },
      environment: {
        has_openai_key: !!process.env.OPENAI_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database test failed'
    });
  }
}