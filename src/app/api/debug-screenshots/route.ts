import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Debug endpoint called - checking trip and screenshot status');

    // Get total screenshots
    const { data: screenshots, error: screenshotsError } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, is_processed, screenshot_type, created_at, processing_notes')
      .order('created_at', { ascending: false });

    if (screenshotsError) {
      console.error('Error fetching screenshots:', screenshotsError);
      return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 });
    }

    // Get total trips
    const { data: trips, error: tripsError } = await supabaseAdmin
      .from('trips')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
      return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
    }

    // Analyze processing status
    const totalScreenshots = screenshots?.length || 0;
    const processedScreenshots = screenshots?.filter(s => s.is_processed) || [];
    const unprocessedScreenshots = screenshots?.filter(s => !s.is_processed) || [];
    
    const screenshotsByType = screenshots?.reduce((acc, screenshot) => {
      acc[screenshot.screenshot_type] = (acc[screenshot.screenshot_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    console.log(`Debug results: ${totalScreenshots} total screenshots, ${processedScreenshots.length} processed, ${unprocessedScreenshots.length} unprocessed`);

    return NextResponse.json({
      success: true,
      summary: {
        total_trips: trips?.length || 0,
        total_screenshots: totalScreenshots,
        processed_screenshots: processedScreenshots.length,
        unprocessed_screenshots: unprocessedScreenshots.length,
        processing_percentage: totalScreenshots > 0 ? Math.round((processedScreenshots.length / totalScreenshots) * 100) : 0
      },
      screenshots_by_type: screenshotsByType,
      unprocessed_screenshots: unprocessedScreenshots.map(s => ({
        id: s.id,
        screenshot_type: s.screenshot_type,
        created_at: s.created_at,
        processing_notes: s.processing_notes
      })),
      recent_processed: processedScreenshots.slice(0, 5).map(s => ({
        id: s.id,
        screenshot_type: s.screenshot_type,
        created_at: s.created_at,
        processing_notes: s.processing_notes
      }))
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}