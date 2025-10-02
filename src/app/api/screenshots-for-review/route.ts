// API endpoint to get screenshots that need manual review for AI training
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    console.log('🔍 Fetching screenshots that need review for AI training...');

    // Get screenshots with low confidence or missing critical data
    const { data: screenshots, error } = await supabase
      .from('trip_screenshots')
      .select(`
        id,
        image_path,
        screenshot_type,
        ocr_data,
        extracted_data,
        is_processed,
        processing_notes,
        created_at
      `)
      .eq('is_processed', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch screenshots' }, { status: 500 });
    }

    // Filter screenshots that need review
    const needsReview = screenshots?.filter(screenshot => {
      const extractedData = screenshot.extracted_data || {};
      const ocrData = screenshot.ocr_data || {};
      
      // Criteria for needing review:
      // 1. Low OCR confidence
      // 2. Missing critical data (earnings, distance)
      // 3. Suspicious data patterns
      
      const lowConfidence = (ocrData.extraction_quality === 'LOW') || 
                           (extractedData.extraction_confidence && extractedData.extraction_confidence < 0.8);
      
      const missingEarnings = !extractedData.trip_data?.driver_earnings && 
                             !extractedData.numbers?.some((n: string) => parseFloat(n) > 5);
      
      const missingDistance = !extractedData.trip_data?.distance && 
                             !extractedData.trip_data?.total_distance;
      
      const suspiciousData = extractedData.trip_data?.driver_earnings > 100 || 
                            extractedData.trip_data?.distance > 50;
      
      return lowConfidence || missingEarnings || missingDistance || suspiciousData;
    }) || [];

    // Format for frontend
    const formattedScreenshots = needsReview.map(screenshot => ({
      id: screenshot.id,
      image_url: screenshot.image_path,
      screenshot_type: screenshot.screenshot_type,
      ocr_text: screenshot.ocr_data?.raw_text || 'No OCR text available',
      extracted_data: {
        driver_earnings: screenshot.extracted_data?.trip_data?.driver_earnings || 
                        screenshot.extracted_data?.trip_data?.fare_amount || 0,
        distance: screenshot.extracted_data?.trip_data?.distance || 
                 screenshot.extracted_data?.trip_data?.total_distance || 0,
        total_trips: screenshot.extracted_data?.trip_data?.total_trips || 1,
        tip_amount: screenshot.extracted_data?.trip_data?.tip_amount || 0,
        extraction_confidence: screenshot.extracted_data?.extraction_confidence || 0.5
      },
      confidence: screenshot.extracted_data?.extraction_confidence || 0.5,
      needs_review: true,
      created_at: screenshot.created_at
    }));

    console.log(`📋 Found ${formattedScreenshots.length} screenshots needing review`);

    return NextResponse.json({
      success: true,
      screenshots: formattedScreenshots,
      stats: {
        total_processed: screenshots?.length || 0,
        needs_review: formattedScreenshots.length,
        review_percentage: screenshots?.length ? 
          Math.round((formattedScreenshots.length / screenshots.length) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching screenshots for review:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, screenshot_ids } = await request.json();

    if (action === 'mark_reviewed') {
      // Mark screenshots as reviewed (no longer need manual review)
      const { error } = await supabase
        .from('trip_screenshots')
        .update({ 
          processing_notes: 'Manually reviewed and corrected'
        })
        .in('id', screenshot_ids);

      if (error) {
        return NextResponse.json({ error: 'Failed to mark as reviewed' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Screenshots marked as reviewed' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in screenshots review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}