-- Enhanced duplicate detection schema additions
-- Add columns to trip_screenshots table for duplicate detection

ALTER TABLE trip_screenshots 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(32),
ADD COLUMN IF NOT EXISTS perceptual_hash VARCHAR(16),
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS duplicate_check_completed BOOLEAN DEFAULT FALSE;

-- Create table to track blocked duplicates for analytics
CREATE TABLE IF NOT EXISTS duplicate_blocks (
  id SERIAL PRIMARY KEY,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_hash VARCHAR(32),
  perceptual_hash VARCHAR(16),
  original_filename TEXT,
  file_size BIGINT,
  existing_screenshot_id INTEGER REFERENCES trip_screenshots(id),
  block_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_file_hash ON trip_screenshots(file_hash);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_perceptual_hash ON trip_screenshots(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_filename_timestamp ON trip_screenshots(original_filename, upload_timestamp);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_file_size ON trip_screenshots(file_size);
CREATE INDEX IF NOT EXISTS idx_duplicate_blocks_blocked_at ON duplicate_blocks(blocked_at);

-- Add comments for documentation
COMMENT ON COLUMN trip_screenshots.file_hash IS 'MD5 hash of file content for exact duplicate detection';
COMMENT ON COLUMN trip_screenshots.perceptual_hash IS 'Simplified perceptual hash for similar image detection';
COMMENT ON COLUMN trip_screenshots.file_size IS 'File size in bytes for similarity checks';
COMMENT ON COLUMN trip_screenshots.original_filename IS 'Original uploaded filename';
COMMENT ON COLUMN trip_screenshots.duplicate_check_completed IS 'Whether duplicate detection has been completed';

COMMENT ON TABLE duplicate_blocks IS 'Log of blocked duplicate upload attempts';
COMMENT ON COLUMN duplicate_blocks.block_reason IS 'Reason why the file was blocked as duplicate';

-- Create function to clean up old duplicate blocks (optional - keeps last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_duplicate_blocks()
RETURNS void AS $$
BEGIN
  DELETE FROM duplicate_blocks 
  WHERE blocked_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Example: Set up automatic cleanup (uncomment if you want automatic cleanup)
-- SELECT cron.schedule('cleanup-duplicates', '0 2 * * *', 'SELECT cleanup_old_duplicate_blocks();');