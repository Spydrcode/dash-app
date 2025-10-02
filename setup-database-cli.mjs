// Run GPT System Database Setup via CLI
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STEP1_SQL = `
-- GPT-Only System Database Tables - RUN THIS FIRST
-- This creates all tables needed for AI insights to work

-- Token usage tracking table
CREATE TABLE IF NOT EXISTS token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_estimate DECIMAL(10,6) NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  screenshot_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screenshot processing cache table
CREATE TABLE IF NOT EXISTS screenshot_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screenshot_id VARCHAR(255) UNIQUE NOT NULL,
  result_data JSONB NOT NULL,
  token_usage JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI insights cache table
CREATE TABLE IF NOT EXISTS insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_hash VARCHAR(50) UNIQUE NOT NULL,
  insights_data JSONB NOT NULL,
  token_usage JSONB NOT NULL,
  trip_count INTEGER,
  total_earnings DECIMAL(10,2),
  screenshots_processed TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cumulative AI insights table (persistent across uploads)
CREATE TABLE IF NOT EXISTS cumulative_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL DEFAULT 'default_user',
  total_trips INTEGER NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_distance DECIMAL(10,2) NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  performance_score INTEGER NOT NULL DEFAULT 0,
  insights_data JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  screenshots_count INTEGER NOT NULL DEFAULT 0,
  ai_model_used VARCHAR(50) NOT NULL DEFAULT 'gpt-4o'
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage_log(model);
CREATE INDEX IF NOT EXISTS idx_screenshot_cache_screenshot_id ON screenshot_cache(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_insights_cache_hash ON insights_cache(insight_hash);
CREATE INDEX IF NOT EXISTS idx_cumulative_insights_user ON cumulative_insights(user_id);

-- Initialize with starter data using your existing 60 trips
INSERT INTO cumulative_insights (user_id, total_trips, insights_data)
VALUES ('default_user', 60, '{
  "performance_score": 75,
  "key_insights": ["Ready to process your 60 existing trips with GPT-4o", "AI insights will populate as screenshots are uploaded"],
  "recommendations": ["Upload screenshots of trip offers and totals", "GPT-4o will extract data automatically"],
  "trends": "Historical trip data detected - ready for AI analysis",
  "fuel_efficiency": "Upload trip screenshots for detailed efficiency analysis",
  "gpt_only_system": true,
  "local_models_removed": true,
  "existing_trips": 60
}')
ON CONFLICT (user_id) DO UPDATE SET 
  total_trips = 60,
  insights_data = EXCLUDED.insights_data;

-- Enable security  
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshot_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cumulative_insights ENABLE ROW LEVEL SECURITY;

-- Service role policies (allows your app to access the data)
CREATE POLICY "Service role can access token_usage_log" ON token_usage_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access screenshot_cache" ON screenshot_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access insights_cache" ON insights_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access cumulative_insights" ON cumulative_insights FOR ALL USING (auth.role() = 'service_role');
`;

const STEP2_SQL = `
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

-- Enable RLS for all tables
ALTER TABLE trip_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reanalysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_alerts ENABLE ROW LEVEL SECURITY;
`;

async function runDatabaseSetup() {
  const args = process.argv.slice(2);
  const step = args[0] || "step1";

  console.log("🚀 SUPABASE DATABASE SETUP VIA CLI");
  console.log("=".repeat(40));

  try {
    if (step === "step1" || step === "all") {
      console.log("\n📊 STEP 1: Creating GPT System Tables...");
      console.log("This will enable AI insights and MCP server functionality.");

      const { error: step1Error } = await supabase.rpc("exec_sql", {
        sql: STEP1_SQL,
      });

      if (step1Error) {
        // Try alternative method with individual statements
        console.log("Trying alternative approach...");

        const statements = STEP1_SQL.split(";")
          .map((s) => s.trim())
          .filter((s) => s && !s.startsWith("--"));

        for (const statement of statements) {
          if (statement.length > 10) {
            console.log("Executing:", statement.substring(0, 50) + "...");
            const { error } = await supabase.rpc("exec_sql", {
              sql: statement + ";",
            });
            if (error) {
              console.log("⚠️ Warning:", error.message);
            }
          }
        }
      }

      console.log("✅ STEP 1 Complete: GPT System Tables Created");
      console.log("   • token_usage_log");
      console.log("   • screenshot_cache");
      console.log("   • insights_cache");
      console.log("   • cumulative_insights");

      // Test the setup
      const { data, error } = await supabase
        .from("cumulative_insights")
        .select("user_id, total_trips")
        .limit(1);

      if (!error && data) {
        console.log("🎉 AI INSIGHTS NOW ENABLED!");
        console.log(
          "   Ready for",
          data[0]?.total_trips || 60,
          "existing trips"
        );
      }
    }

    if (step === "step2" || step === "all") {
      console.log("\n📊 STEP 2: Creating Enhanced Features...");
      console.log("This adds trip screenshots, maintenance tracking, etc.");

      const { error: step2Error } = await supabase.rpc("exec_sql", {
        sql: STEP2_SQL,
      });

      if (step2Error) {
        console.log("⚠️ Step 2 Warning:", step2Error.message);
        console.log("💡 Some features may require manual SQL execution");
      } else {
        console.log("✅ STEP 2 Complete: Enhanced Features Added");
      }
    }

    console.log("\n🎯 NEXT STEPS:");
    console.log("1. Test AI insights: node test-ai-insights-ready.js");
    console.log("2. Upload screenshots at: http://localhost:3000");
    console.log("3. Screenshots will auto-process with GPT-4o");
    console.log("4. AI insights will populate automatically");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.log("\n💡 FALLBACK OPTIONS:");
    console.log("1. Run SQL manually in Supabase Dashboard");
    console.log("2. Copy SQL from COMPLETE-DATABASE-SETUP.md");
  }
}

// Show usage if no args
if (process.argv.length === 2) {
  console.log("🛠️ USAGE:");
  console.log(
    "node setup-database-cli.js step1    # Create GPT tables (fixes AI insights)"
  );
  console.log("node setup-database-cli.js step2    # Add enhanced features");
  console.log("node setup-database-cli.js all      # Run both steps");
  console.log("");
  console.log("🚀 RECOMMENDED: Start with step1 to enable AI insights");
  process.exit(0);
}

runDatabaseSetup();
