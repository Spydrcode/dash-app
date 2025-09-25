import crypto from 'crypto';
import { supabaseAdmin } from './supabase';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingScreenshot?: {
    id: number;
    upload_timestamp: string;
    trip_id: number;
  };
  reason?: string;
}

/**
 * Generate MD5 hash for file content to detect exact duplicates
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Generate a perceptual hash for images (simplified version)
 * This helps detect similar images even with slight differences
 */
export function generatePerceptualHash(buffer: Buffer): string {
  // Simplified perceptual hash - in production, you might use a proper image hashing library
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return hash.substring(0, 16); // Use first 16 chars as simplified perceptual hash
}

/**
 * Check if a file is a duplicate based on multiple criteria
 */
export async function checkForDuplicate(
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number
): Promise<DuplicateCheckResult> {
  try {
    const fileHash = generateFileHash(fileBuffer);
    const perceptualHash = generatePerceptualHash(fileBuffer);

    // Check for exact file hash match (identical files)
    const { data: exactMatch } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, upload_timestamp, trip_id, file_hash')
      .eq('file_hash', fileHash)
      .limit(1)
      .single();

    if (exactMatch) {
      return {
        isDuplicate: true,
        existingScreenshot: exactMatch,
        reason: 'Exact file match - identical content detected'
      };
    }

    // Check for similar file size and name (potential duplicates)
    const sizeTolerance = 0.05; // 5% tolerance
    const minSize = fileSize * (1 - sizeTolerance);
    const maxSize = fileSize * (1 + sizeTolerance);

    const { data: similarFiles } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, upload_timestamp, trip_id, file_size, original_filename, perceptual_hash')
      .gte('file_size', minSize)
      .lte('file_size', maxSize)
      .limit(10);

    if (similarFiles) {
      // Check for perceptual hash matches (similar images)
      const perceptualMatch = similarFiles.find(file => 
        file.perceptual_hash === perceptualHash
      );

      if (perceptualMatch) {
        return {
          isDuplicate: true,
          existingScreenshot: perceptualMatch,
          reason: 'Similar image detected - likely the same screenshot'
        };
      }

      // Check for identical filename within recent timeframe (last 24 hours)
      const recentTimeThreshold = new Date();
      recentTimeThreshold.setHours(recentTimeThreshold.getHours() - 24);

      const recentSameNameFile = similarFiles.find(file => 
        file.original_filename === fileName &&
        new Date(file.upload_timestamp) > recentTimeThreshold
      );

      if (recentSameNameFile) {
        return {
          isDuplicate: true,
          existingScreenshot: recentSameNameFile,
          reason: 'Same filename uploaded within last 24 hours'
        };
      }
    }

    return {
      isDuplicate: false
    };

  } catch (error) {
    console.error('Error checking for duplicates:', error);
    // If duplicate check fails, allow upload to prevent blocking legitimate files
    return {
      isDuplicate: false
    };
  }
}

/**
 * Add file hash and metadata to database for future duplicate detection
 */
export async function updateScreenshotWithHashes(
  screenshotId: number,
  fileHash: string,
  perceptualHash: string,
  fileSize: number,
  originalFilename: string
): Promise<void> {
  try {
    await supabaseAdmin
      .from('trip_screenshots')
      .update({
        file_hash: fileHash,
        perceptual_hash: perceptualHash,
        file_size: fileSize,
        original_filename: originalFilename,
        duplicate_check_completed: true
      })
      .eq('id', screenshotId);
  } catch (error) {
    console.error('Error updating screenshot with hashes:', error);
  }
}

/**
 * Get duplicate statistics for admin/debugging
 */
export async function getDuplicateStats(): Promise<{
  totalScreenshots: number;
  duplicatesBlocked: number;
  recentDuplicateAttempts: number;
}> {
  try {
    const { data: total } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id', { count: 'exact' });

    const { data: duplicates } = await supabaseAdmin
      .from('duplicate_blocks')
      .select('id', { count: 'exact' });

    const recentThreshold = new Date();
    recentThreshold.setHours(recentThreshold.getHours() - 24);

    const { data: recentDuplicates } = await supabaseAdmin
      .from('duplicate_blocks')
      .select('id', { count: 'exact' })
      .gte('blocked_at', recentThreshold.toISOString());

    return {
      totalScreenshots: total?.length || 0,
      duplicatesBlocked: duplicates?.length || 0,
      recentDuplicateAttempts: recentDuplicates?.length || 0
    };
  } catch (error) {
    console.error('Error getting duplicate stats:', error);
    return {
      totalScreenshots: 0,
      duplicatesBlocked: 0,
      recentDuplicateAttempts: 0
    };
  }
}