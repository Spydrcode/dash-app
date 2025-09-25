-- Honda Odyssey Analytics Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  driver_id VARCHAR(255) NOT NULL,
  image_path TEXT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trip_data JSONB NOT NULL,
  ai_insights JSONB,
  predictions JSONB,
  vehicle_model VARCHAR(100) DEFAULT '2003 Honda Odyssey',
  total_profit DECIMAL(10,2) DEFAULT 0,
  total_distance DECIMAL(10,2) DEFAULT 0,
  gas_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);
CREATE INDEX IF NOT EXISTS idx_trips_total_profit ON trips(total_profit);

-- Enable Row Level Security (RLS)
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations for authenticated users" ON trips
FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for trip images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trip-uploads', 'trip-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for trip uploads
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'trip-uploads');

CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'trip-uploads');

-- Create some sample data to test (optional)
INSERT INTO trips (driver_id, trip_data, vehicle_model, total_profit, total_distance, gas_cost)
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440000',
    '{"trip_type": "single", "pickup_location": "Downtown", "dropoff_location": "Airport", "distance": 12.5, "profit": 24.80, "platform": "Uber"}',
    '2003 Honda Odyssey',
    24.80,
    12.5,
    3.50
  ),
  (
    '550e8400-e29b-41d4-a716-446655440000',
    '{"trip_type": "multiple", "total_trips": 2, "distance": 20.8, "profit": 37.20, "platform": "Uber"}',
    '2003 Honda Odyssey',
    37.20,
    20.8,
    4.25
  )
ON CONFLICT DO NOTHING;

-- Verify setup
SELECT 'Database setup complete!' as status;
SELECT COUNT(*) as trip_count FROM trips;
SELECT name, public FROM storage.buckets WHERE id = 'trip-uploads';