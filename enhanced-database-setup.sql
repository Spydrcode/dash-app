-- Enhanced database schema for multi-screenshot trip tracking
-- Run this in your Supabase SQL Editor to add new features

-- Create trip_screenshots table to track multiple images per trip
CREATE TABLE IF NOT EXISTS trip_screenshots (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id) ON DELETE CASCADE,
  screenshot_type VARCHAR(50) NOT NULL, -- 'initial_offer', 'final_total', 'navigation', 'other'
  image_path TEXT NOT NULL,
  upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ocr_data JSONB, -- Raw OCR text extracted from image
  extracted_data JSONB, -- Structured data extracted from image
  is_processed BOOLEAN DEFAULT FALSE,
  processing_notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_trip_id ON trip_screenshots(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_type ON trip_screenshots(screenshot_type);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_processed ON trip_screenshots(is_processed);

-- Add new columns to trips table for enhanced tracking
ALTER TABLE trips ADD COLUMN IF NOT EXISTS initial_estimate DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS final_total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tip_variance DECIMAL(10,2) DEFAULT 0; -- final - initial
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tip_accuracy VARCHAR(20) DEFAULT 'unknown'; -- 'under', 'over', 'exact'
ALTER TABLE trips ADD COLUMN IF NOT EXISTS screenshot_count INTEGER DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_initial_screenshot BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS has_final_screenshot BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_status VARCHAR(20) DEFAULT 'incomplete'; -- 'incomplete', 'partial', 'complete'

-- Add reanalysis tracking
CREATE TABLE IF NOT EXISTS reanalysis_sessions (
  id SERIAL PRIMARY KEY,
  session_id UUID DEFAULT gen_random_uuid(),
  driver_id VARCHAR(255) NOT NULL,
  analysis_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'comparison', 'custom'
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP,
  trip_ids INTEGER[],
  results JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER
);

-- Create index for reanalysis sessions
CREATE INDEX IF NOT EXISTS idx_reanalysis_driver_id ON reanalysis_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_reanalysis_type ON reanalysis_sessions(analysis_type);
CREATE INDEX IF NOT EXISTS idx_reanalysis_date ON reanalysis_sessions(created_at);

-- Create function to update trip status based on screenshots
CREATE OR REPLACE FUNCTION update_trip_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update parent trip's screenshot tracking
    UPDATE trips 
    SET 
        screenshot_count = (
            SELECT COUNT(*) 
            FROM trip_screenshots 
            WHERE trip_id = NEW.trip_id
        ),
        has_initial_screenshot = (
            SELECT EXISTS(
                SELECT 1 FROM trip_screenshots 
                WHERE trip_id = NEW.trip_id AND screenshot_type = 'initial_offer'
            )
        ),
        has_final_screenshot = (
            SELECT EXISTS(
                SELECT 1 FROM trip_screenshots 
                WHERE trip_id = NEW.trip_id AND screenshot_type = 'final_total'
            )
        )
    WHERE id = NEW.trip_id;
    
    -- Update trip status based on available screenshots
    UPDATE trips 
    SET trip_status = CASE 
        WHEN has_initial_screenshot AND has_final_screenshot THEN 'complete'
        WHEN has_initial_screenshot OR has_final_screenshot THEN 'partial'
        ELSE 'incomplete'
    END
    WHERE id = NEW.trip_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update trip status
DROP TRIGGER IF EXISTS update_trip_status_trigger ON trip_screenshots;
CREATE TRIGGER update_trip_status_trigger
    AFTER INSERT OR UPDATE ON trip_screenshots
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_status();

-- Create function to calculate tip variance
CREATE OR REPLACE FUNCTION calculate_tip_variance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.initial_estimate > 0 AND NEW.final_total > 0 THEN
        NEW.tip_variance = NEW.final_total - NEW.initial_estimate;
        
        NEW.tip_accuracy = CASE 
            WHEN ABS(NEW.tip_variance) <= 0.50 THEN 'exact'
            WHEN NEW.tip_variance > 0.50 THEN 'over'
            ELSE 'under'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tip variance calculation
DROP TRIGGER IF EXISTS calculate_tip_variance_trigger ON trips;
CREATE TRIGGER calculate_tip_variance_trigger
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION calculate_tip_variance();

-- Enable RLS for new tables
ALTER TABLE trip_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reanalysis_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_screenshots
CREATE POLICY "Allow all operations on trip_screenshots" ON trip_screenshots
FOR ALL USING (true) WITH CHECK (true);

-- Create policies for reanalysis_sessions  
CREATE POLICY "Allow all operations on reanalysis_sessions" ON reanalysis_sessions
FOR ALL USING (true) WITH CHECK (true);

-- Create some sample data for testing multi-screenshot functionality
DO $$
DECLARE
    sample_trip_id INTEGER;
BEGIN
    -- Insert a sample trip
    INSERT INTO trips (
        driver_id, 
        trip_data, 
        vehicle_model, 
        total_profit, 
        total_distance, 
        gas_cost,
        initial_estimate,
        final_total
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        '{"trip_type": "single", "pickup_location": "Restaurant District", "dropoff_location": "Airport", "distance": 15.2, "platform": "Uber"}',
        '2003 Honda Odyssey',
        28.50,
        15.2,
        4.25,
        25.00,
        28.50
    ) RETURNING id INTO sample_trip_id;
    
    -- Insert sample screenshots for this trip
    INSERT INTO trip_screenshots (trip_id, screenshot_type, image_path) VALUES
        (sample_trip_id, 'initial_offer', '/trip-uploads/initial_offer_001.jpg'),
        (sample_trip_id, 'final_total', '/trip-uploads/final_total_001.jpg');
        
END $$;

-- Verify the enhanced setup
SELECT 
    'Enhanced database setup complete!' as status,
    COUNT(*) as trip_count 
FROM trips;

SELECT 
    'Screenshot tracking ready!' as status,
    COUNT(*) as screenshot_count 
FROM trip_screenshots;

SELECT 
    screenshot_type,
    COUNT(*) as count
FROM trip_screenshots
GROUP BY screenshot_type;