import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log('Updating screenshot processing status...');
    
    // First, let's see the current state
    const { data: allScreenshots, error: fetchError } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, is_processed, extracted_data, ocr_data, processing_notes, screenshot_type');

    if (fetchError) {
      console.error('Error fetching screenshots:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 });
    }

    console.log(`Found ${allScreenshots?.length || 0} total screenshots`);

    // Find screenshots that should be marked as processed but aren't
    const shouldBeProcessed = allScreenshots?.filter(screenshot => {
      // A screenshot should be processed if it has extracted_data or processing_notes
      const hasExtractedData = screenshot.extracted_data && Object.keys(screenshot.extracted_data).length > 0;
      const hasOcrData = screenshot.ocr_data && Object.keys(screenshot.ocr_data).length > 0;
      const hasProcessingNotes = screenshot.processing_notes && screenshot.processing_notes.trim() !== '';
      
      // If it has any of these but is_processed is false/null, it should be updated
      return (hasExtractedData || hasOcrData || hasProcessingNotes) && !screenshot.is_processed;
    }) || [];

    console.log(`Found ${shouldBeProcessed.length} screenshots that should be marked as processed`);

    if (shouldBeProcessed.length > 0) {
      // Update these screenshots to is_processed = true
      const updatePromises = shouldBeProcessed.map(screenshot => 
        supabaseAdmin
          .from('trip_screenshots')
          .update({ 
            is_processed: true,
            processing_notes: screenshot.processing_notes || `Auto-updated: Screenshot contains valid extracted data (updated on ${new Date().toISOString()})`
          })
          .eq('id', screenshot.id)
      );

      const updateResults = await Promise.all(updatePromises);
      const successfulUpdates = updateResults.filter(result => !result.error).length;
      const failedUpdates = updateResults.filter(result => result.error);

      console.log(`Updated ${successfulUpdates} screenshots to processed status`);
      if (failedUpdates.length > 0) {
        console.error('Some updates failed:', failedUpdates.map(r => r.error));
      }
    }

    // Get final counts
    const { data: finalScreenshots } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, is_processed, screenshot_type');

    const totalScreenshots = finalScreenshots?.length || 0;
    const processedCount = finalScreenshots?.filter(s => s.is_processed).length || 0;

    console.log(`Final status: ${processedCount}/${totalScreenshots} screenshots processed`);

    return NextResponse.json({
      success: true,
      message: 'Screenshot processing status updated',
      updates: {
        screenshots_updated: shouldBeProcessed.length,
        total_screenshots: totalScreenshots,
        now_processed: processedCount,
        processing_percentage: totalScreenshots > 0 ? Math.round((processedCount / totalScreenshots) * 100) : 0
      },
      updated_screenshots: shouldBeProcessed.map(s => ({
        id: s.id,
        type: s.screenshot_type,
        had_extracted_data: !!s.extracted_data,
        had_ocr_data: !!s.ocr_data,
        had_processing_notes: !!s.processing_notes
      }))
    });

  } catch (error) {
    console.error('Update processing status error:', error);
    return NextResponse.json({ 
      error: 'Failed to update processing status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}