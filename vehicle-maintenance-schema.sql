-- Vehicle Maintenance Tables for Honda Odyssey 2003
-- Run this in your Supabase SQL Editor first

-- Create maintenance_records table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_records_date ON maintenance_records(service_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type ON maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_odometer ON maintenance_records(odometer_reading);

CREATE INDEX IF NOT EXISTS idx_fuel_records_date ON fuel_records(fill_date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_odometer ON fuel_records(odometer_reading);

CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_type ON vehicle_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_urgency ON vehicle_alerts(urgency_level);
CREATE INDEX IF NOT EXISTS idx_vehicle_alerts_dismissed ON vehicle_alerts(is_dismissed);

-- Enable RLS for new tables
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now)
CREATE POLICY "Allow all operations on maintenance_records" ON maintenance_records
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on fuel_records" ON fuel_records
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on vehicle_alerts" ON vehicle_alerts
FOR ALL USING (true) WITH CHECK (true);

-- Insert some sample maintenance records for a 2003 Honda Odyssey
INSERT INTO maintenance_records (
  maintenance_type, 
  description, 
  cost, 
  odometer_reading, 
  service_date,
  next_service_due,
  next_service_date
) VALUES 
  ('oil_change', 'Oil and filter change - Valvoline MaxLife 5W-30', 45.99, 225000, '2025-09-15', 228000, '2025-10-30'),
  ('tire_rotation', 'Rotated all 4 tires, checked tire pressure', 25.00, 224500, '2025-09-01', 229500, '2025-11-15'),
  ('brake_inspection', 'Brake pads and rotors inspection - front pads at 40%', 0.00, 224000, '2025-08-20', 234000, '2025-12-01');

-- Insert sample fuel records
INSERT INTO fuel_records (
  fill_date,
  odometer_reading,
  gallons,
  cost,
  price_per_gallon,
  station_location,
  fuel_type,
  mpg_calculated,
  miles_driven
) VALUES 
  ('2025-09-27', 228147, 15.2, 60.00, 3.95, 'Shell Station - Main St', 'Regular', 18.5, 281),
  ('2025-09-24', 227866, 14.8, 58.50, 3.95, 'Chevron - Downtown', 'Regular', 19.2, 284),
  ('2025-09-21', 227582, 15.0, 59.25, 3.95, 'BP Station - Highway', 'Regular', 18.9, 284);

-- Insert sample vehicle alerts
INSERT INTO vehicle_alerts (
  alert_type,
  title,
  description,
  urgency_level,
  current_odometer,
  target_odometer,
  due_date,
  estimated_cost
) VALUES 
  ('maintenance_due', 'Oil Change Due Soon', 'Your 2003 Honda Odyssey is due for an oil change in approximately 853 miles', 'medium', 228147, 229000, '2025-10-15', 50.00),
  ('inspection_due', 'Annual Inspection Due', 'Vehicle inspection expires next month', 'high', 228147, NULL, '2025-10-31', 35.00),
  ('maintenance_overdue', 'Transmission Service Overdue', 'Transmission fluid change is 5,000 miles overdue for a 2003 Honda Odyssey', 'high', 228147, 220000, '2025-09-28', 150.00);

-- Verify the setup
SELECT 'Vehicle maintenance tables created successfully!' as status;

SELECT 
  'maintenance_records' as table_name,
  COUNT(*) as record_count 
FROM maintenance_records;

SELECT 
  'fuel_records' as table_name,
  COUNT(*) as record_count 
FROM fuel_records;

SELECT 
  'vehicle_alerts' as table_name,
  COUNT(*) as record_count 
FROM vehicle_alerts;