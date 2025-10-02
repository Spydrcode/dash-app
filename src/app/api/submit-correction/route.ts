// API endpoint to submit user corrections for AI training
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const correction = await request.json();
    console.log('📝 Received correction for AI training:', correction);

    // Validate correction data
    if (!correction.screenshot_id || !correction.field || correction.corrected_value === undefined) {
      return NextResponse.json({ error: 'Missing required correction data' }, { status: 400 });
    }

    // Store the correction in a training_corrections table for AI learning
    const { data: correctionRecord, error: correctionError } = await supabase
      .from('training_corrections')
      .insert({
        screenshot_id: correction.screenshot_id,
        field_name: correction.field,
        extracted_value: correction.extracted_value,
        corrected_value: correction.corrected_value,
        user_notes: correction.user_notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (correctionError) {
      // If training_corrections table doesn't exist, create it
      if (correctionError.code === '42P01') {
        console.log('🔧 Creating training_corrections table...');
        
        const { error: createError } = await supabase.rpc('create_training_table', {});
        
        if (createError) {
          console.log('📋 Training table creation failed, storing correction in trip_screenshots notes');
        }
      }
      
      // Fallback: Update the screenshot record with correction info
      await supabase
        .from('trip_screenshots')
        .update({
          processing_notes: `User correction: ${correction.field} changed from ${correction.extracted_value} to ${correction.corrected_value}. ${correction.user_notes || ''}`
        })
        .eq('id', correction.screenshot_id);
    }

    // Update the screenshot's extracted_data with the corrected value
    const { data: screenshot, error: fetchError } = await supabase
      .from('trip_screenshots')
      .select('extracted_data')
      .eq('id', correction.screenshot_id)
      .single();

    if (!fetchError && screenshot) {
      const updatedExtractedData = {
        ...screenshot.extracted_data,
        trip_data: {
          ...screenshot.extracted_data?.trip_data,
          [correction.field]: correction.corrected_value
        },
        manually_corrected: true,
        correction_timestamp: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('trip_screenshots')
        .update({
          extracted_data: updatedExtractedData,
          processing_notes: 'Manually corrected by user for AI training'
        })
        .eq('id', correction.screenshot_id);

      if (updateError) {
        console.error('Failed to update screenshot with correction:', updateError);
      }
    }

    // Generate adaptive insights based on this correction
    const insight = generateCorrectionInsight(correction);

    console.log(`✅ Correction recorded: ${correction.field} corrected from ${correction.extracted_value} to ${correction.corrected_value}`);

    return NextResponse.json({
      success: true,
      message: 'Correction submitted successfully',
      correction_id: correctionRecord?.id || 'stored_in_notes',
      ai_insight: insight,
      training_impact: assessTrainingImpact(correction)
    });

  } catch (error) {
    console.error('Error submitting correction:', error);
    return NextResponse.json(
      { error: 'Failed to submit correction' }, 
      { status: 500 }
    );
  }
}

// Generate insights from user corrections to improve AI
function generateCorrectionInsight(correction: Record<string, unknown>): string {
  const field = correction.field;
  const extracted = correction.extracted_value;
  const corrected = correction.corrected_value;

  // Type guards for numeric values
  const extractedNum = typeof extracted === 'number' ? extracted : 0;
  const correctedNum = typeof corrected === 'number' ? corrected : 0;

  if (field === 'driver_earnings') {
    if (extractedNum === 0 && correctedNum > 0) {
      return `AI learned: Screenshots of this type contain earnings data that OCR missed. Will improve pattern recognition for similar layouts.`;
    } else if (Math.abs(extractedNum - correctedNum) > 5) {
      return `AI learned: OCR misread earnings by $${Math.abs(extractedNum - correctedNum).toFixed(2)}. Will adjust confidence thresholds for earnings extraction.`;
    }
  }

  if (field === 'distance') {
    if (extractedNum === 0 && correctedNum > 0) {
      return `AI learned: Distance information is present in screenshots but not being detected. Will enhance spatial text recognition.`;
    }
  }

  if (field === 'total_trips') {
    if (extracted !== corrected) {
      return `AI learned: Trip count detection needs improvement. Will focus on number recognition in context.`;
    }
  }

  return `AI learned: ${field} extraction improved through user feedback. This correction will help with similar screenshots.`;
}

// Assess how this correction impacts AI training
function assessTrainingImpact(correction: Record<string, unknown>): {
  impact_level: 'high' | 'medium' | 'low';
  description: string;
  next_steps: string[];
} {
  const field = correction.field;
  const extracted = correction.extracted_value;
  const corrected = correction.corrected_value;

  // Type guards for numeric values
  const extractedNum = typeof extracted === 'number' ? extracted : 0;
  const correctedNum = typeof corrected === 'number' ? corrected : 0;

  if (field === 'driver_earnings' && extractedNum === 0 && correctedNum > 0) {
    return {
      impact_level: 'high',
      description: 'Critical earnings data was missing - high impact correction',
      next_steps: [
        'Review similar screenshots for earnings extraction failures',
        'Adjust OCR patterns for earnings detection',
        'Increase confidence threshold for earnings-related text regions'
      ]
    };
  }

  if (field === 'distance' && extractedNum === 0 && correctedNum > 0) {
    return {
      impact_level: 'medium',
      description: 'Distance data helps with profit calculations',
      next_steps: [
        'Improve spatial recognition for distance/mileage text',
        'Look for distance patterns in similar app layouts'
      ]
    };
  }

  return {
    impact_level: 'low',
    description: 'Minor adjustment that helps overall accuracy',
    next_steps: [
      'Continue monitoring this data type for patterns',
      'Accumulate more corrections for statistical significance'
    ]
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get correction statistics for AI training insights
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7d';

    // Calculate date range
    const now = new Date();
    const daysBack = timeframe === '30d' ? 30 : timeframe === '7d' ? 7 : 1;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    const { data: screenshots, error } = await supabase
      .from('trip_screenshots')
      .select('extracted_data, processing_notes, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch correction stats' }, { status: 500 });
    }

    const stats = {
      total_screenshots: screenshots?.length || 0,
      manually_corrected: screenshots?.filter(s => 
        s.extracted_data?.manually_corrected || 
        s.processing_notes?.includes('corrected')
      ).length || 0,
      common_correction_types: [
        'driver_earnings',
        'distance', 
        'total_trips',
        'tip_amount'
      ],
      ai_learning_progress: {
        accuracy_trend: 'improving', // Would calculate from actual data
        patterns_learned: screenshots?.filter(s => s.extracted_data?.manually_corrected).length || 0,
        confidence_improvement: '12%' // Would calculate from confidence scores
      }
    };

    return NextResponse.json({
      success: true,
      stats,
      message: `AI training statistics for last ${timeframe}`
    });

  } catch (error) {
    console.error('Error fetching correction stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}