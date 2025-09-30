-- Database Tables for GPT Token Tracking and Smart Caching
-- Run this in your Supabase SQL editor

-- Token usage tracking table
CREATE TABLE IF NOT EXISTS token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL, 
  total_tokens INTEGER NOT NULL,
  cost_estimate DECIMAL(10,6) NOT NULL,
  request_type VARCHAR(20) NOT NULL, -- 'vision', 'insights', 'analysis'
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage_log(model);
CREATE INDEX IF NOT EXISTS idx_screenshot_cache_screenshot_id ON screenshot_cache(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_insights_cache_hash ON insights_cache(insight_hash);
CREATE INDEX IF NOT EXISTS idx_cumulative_insights_user ON cumulative_insights(user_id);

-- Insert initial cumulative insights record
INSERT INTO cumulative_insights (user_id, insights_data) 
VALUES ('default_user', '{
  "performance_score": 0,
  "key_insights": ["Welcome to AI-powered rideshare analytics", "Upload screenshots to start getting insights"],
  "recommendations": ["Take screenshots of trip offers and totals", "Upload dashboard summaries for better analysis"],
  "trends": "No data yet - insights will improve as you upload more screenshots",
  "fuel_efficiency": "Upload trip data to analyze efficiency",
  "total_screenshots_processed": 0,
  "last_analysis": null
}')
ON CONFLICT (user_id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshot_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cumulative_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can access token_usage_log" ON token_usage_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access screenshot_cache" ON screenshot_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access insights_cache" ON insights_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access cumulative_insights" ON cumulative_insights
  FOR ALL USING (auth.role() = 'service_role');