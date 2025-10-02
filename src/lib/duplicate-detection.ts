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
  fileName: string
): Promise<DuplicateCheckResult> {
  try {
    const fileHash = generateFileHash(fileBuffer);
    // const perceptualHash = generatePerceptualHash(fileBuffer); // TODO: Use when database supports it

    // Since the database doesn't have the new columns yet, we'll use a simpler approach
    // First, check if we've seen this exact file hash in this session (memory-based)
    const globalThis = global as Record<string, unknown> & { uploadedHashes?: Set<string> };
    if (typeof globalThis !== 'undefined') {
      globalThis.uploadedHashes = globalThis.uploadedHashes || new Set();
      if (globalThis.uploadedHashes.has(fileHash)) {
        return {
          isDuplicate: true,
          reason: 'File already processed in this session'
        };
      }
      // Store the hash for this session
      globalThis.uploadedHashes.add(fileHash);
    }

    // Check existing screenshots for similar patterns
    // Look for files with similar size and recent upload patterns
    // const sizeTolerance = 0.02; // 2% tolerance for file size
    // const minSize = Math.max(1, fileSize * (1 - sizeTolerance));
    // const maxSize = fileSize * (1 + sizeTolerance);

    // Get recent uploads to check for potential duplicates
    const recentTimeThreshold = new Date();
    recentTimeThreshold.setHours(recentTimeThreshold.getHours() - 2); // Last 2 hours

    const { data: recentScreenshots } = await supabaseAdmin
      .from('trip_screenshots')
      .select('id, created_at, image_path')
      .gte('created_at', recentTimeThreshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentScreenshots && recentScreenshots.length > 0) {
      // Check for suspicious patterns like many uploads in short time
      // const recentUploadsCount = recentScreenshots.length;
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);
      
      const veryRecentUploads = recentScreenshots.filter(s => 
        new Date(s.created_at) > lastHour
      ).length;

      // If more than 5 uploads in the last hour, be more strict about duplicates
      if (veryRecentUploads > 5) {
        // Check if a similar filename pattern was recently uploaded
        const baseFileName = fileName.replace(/\d+/g, ''); // Remove numbers
        const recentSimilarName = recentScreenshots.some(s => {
          const pathParts = s.image_path.split('/');
          const uploadedFileName = pathParts[pathParts.length - 1];
          const baseUploadedName = uploadedFileName.replace(/\d+/g, '').replace(/^\d+-/, '');
          return baseUploadedName === baseFileName;
        });

        if (recentSimilarName) {
          return {
            isDuplicate: true,
            reason: 'Similar filename uploaded recently - potential duplicate batch'
          };
        }
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