-- Enhanced database schema for multi-screenshot trip tracking
-- SAFE VERSION: Run this in your Supabase SQL Editor to add new features

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

-- Create maintenance_records table for vehicle maintenance
CREATE TABLE IF NOT EXISTS maintenance_records (
  id SERIAL PRIMARY KEY,
  driver_id VARCHAR(255) NOT NULL DEFAULT 'default-driver',
  vehicle_model VARCHAR(100) NOT NULL DEFAULT '2003 Honda Odyssey',
  maintenance_type VARCHAR(50) NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) NOT NULL,
  odometer_reading INTEGER NOT NULL,
  service_date DATE NOT NULL,
  service_location VARCHAR(255),
  receipt_image TEXT,
  next_service_due INTEGER,
  next_service_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fuel_records table
CREATE TABLE IF NOT EXISTS fuel_records (
  id SERIAL PRIMARY KEY,
  driver_id VARCHAR(255) NOT NULL DEFAULT 'default-driver',
  vehicle_model VARCHAR(100) NOT NULL DEFAULT '2003 Honda Odyssey',
  fill_date DATE NOT NULL,
  odometer_reading INTEGER NOT NULL,
  gallons DECIMAL(8,3) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  price_per_gallon DECIMAL(6,3) NOT NULL,
  station_location VARCHAR(255),
  fuel_type VARCHAR(20) DEFAULT 'Regular',
  mpg_calculated DECIMAL(6,2),
  miles_driven INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicle_alerts table
CREATE TABLE IF NOT EXISTS vehicle_alerts (
  id SERIAL PRIMARY KEY,
  driver_id VARCHAR(255) NOT NULL DEFAULT 'default-driver',
  vehicle_model VARCHAR(100) NOT NULL DEFAULT '2003 Honda Odyssey',
  alert_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium',
  current_odometer INTEGER NOT NULL,
  target_odometer INTEGER,
  due_date DATE,
  estimated_cost DECIMAL(10,2),
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_trip_id ON trip_screenshots(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_type ON trip_screenshots(screenshot_type);
CREATE INDEX IF NOT EXISTS idx_trip_screenshots_processed ON trip_screenshots(is_processed);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records(service_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type ON maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_odometer ON maintenance_records(odometer_reading);

CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(fill_date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_odometer ON fuel_records(odometer_reading);

CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_type ON vehicle_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_urgency ON vehicle_alerts(urgency_level);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_dismissed ON vehicle_alerts(is_dismissed);

-- Add new columns to trips table for enhanced tracking (only if they don't exist)
DO $$ 
BEGIN
    -- Check and add columns one by one
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'initial_estimate') THEN
        ALTER TABLE trips ADD COLUMN initial_estimate DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'final_total') THEN
        ALTER TABLE trips ADD COLUMN final_total DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'tip_variance') THEN
        ALTER TABLE trips ADD COLUMN tip_variance DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'tip_accuracy') THEN
        ALTER TABLE trips ADD COLUMN tip_accuracy VARCHAR(20) DEFAULT 'unknown';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'screenshot_count') THEN
        ALTER TABLE trips ADD COLUMN screenshot_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'has_initial_screenshot') THEN
        ALTER TABLE trips ADD COLUMN has_initial_screenshot BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'has_final_screenshot') THEN
        ALTER TABLE trips ADD COLUMN has_final_screenshot BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'trip_status') THEN
        ALTER TABLE trips ADD COLUMN trip_status VARCHAR(20) DEFAULT 'incomplete';
    END IF;
END $$;

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

-- Create indexes for reanalysis sessions
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

-- Enable RLS for all tables
ALTER TABLE trip_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reanalysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies - only if they don't already exist
DO $$ 
BEGIN
    -- Policies for trip_screenshots
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trip_screenshots' AND policyname = 'Allow all operations on trip_screenshots') THEN
        CREATE POLICY "Allow all operations on trip_screenshots" ON trip_screenshots
        FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policies for reanalysis_sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reanalysis_sessions' AND policyname = 'Allow all operations on reanalysis_sessions') THEN
        CREATE POLICY "Allow all operations on reanalysis_sessions" ON reanalysis_sessions
        FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policies for maintenance_records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_records' AND policyname = 'Allow all operations on maintenance_records') THEN
        CREATE POLICY "Allow all operations on maintenance_records" ON maintenance_records
        FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policies for fuel_records
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fuel_records' AND policyname = 'Allow all operations on fuel_records') THEN
        CREATE POLICY "Allow all operations on fuel_records" ON fuel_records
        FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policies for vehicle_alerts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vehicle_alerts' AND policyname = 'Allow all operations on vehicle_alerts') THEN
        CREATE POLICY "Allow all operations on vehicle_alerts" ON vehicle_alerts
        FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Final verification (no sample data)
SELECT 'Enhanced database schema setup complete!' as status;
SELECT 'All tables, triggers, and policies created successfully' as message;
SELECT 'Ready for trip validation and vehicle maintenance tracking' as ready_status;