# 🚀 GPT-Only System Setup Guide

## ✅ Current Status

- **Supabase Connection**: ✅ Working
- **Environment Variables**: ✅ Configured
- **GPT Tables**: ❌ **NEED TO BE CREATED**

## 📋 Database Setup Required

You need to create the GPT-specific tables in your Supabase database. Here's how:

### Method 1: Supabase SQL Editor (Recommended)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Your Project → SQL Editor
3. **Copy and paste** the entire SQL below into the editor:

```sql
-- GPT-Only System Database Tables
-- Run this in your Supabase SQL editor

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

-- Initialize with welcome data
INSERT INTO cumulative_insights (user_id, insights_data)
VALUES ('default_user', '{
  "performance_score": 0,
  "key_insights": ["Welcome to GPT-powered rideshare analytics", "Upload screenshots to start getting insights"],
  "recommendations": ["Take screenshots of trip offers and totals", "Upload dashboard summaries for better analysis"],
  "trends": "No data yet - insights will improve as you upload more screenshots",
  "fuel_efficiency": "Upload trip data to analyze efficiency",
  "gpt_only_system": true,
  "local_models_removed": true
}')
ON CONFLICT (user_id) DO NOTHING;

-- Enable security
ALTER TABLE token_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshot_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cumulative_insights ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role can access token_usage_log" ON token_usage_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access screenshot_cache" ON screenshot_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access insights_cache" ON insights_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access cumulative_insights" ON cumulative_insights FOR ALL USING (auth.role() = 'service_role');
```

4. **Click "Run"** to execute the SQL
5. **Verify success** - you should see "Success. No rows returned" messages

### Method 2: Run Verification

After running the SQL, verify the setup:

```bash
node check-database.js
```

You should see:

```
✅ Table 'token_usage_log' exists
✅ Table 'screenshot_cache' exists
✅ Table 'insights_cache' exists
✅ Table 'cumulative_insights' exists
📊 Database Status: 4/4 GPT tables exist
✅ GPT-only system database is READY!
```

## 🎯 What These Tables Do

| Table                 | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `token_usage_log`     | Track OpenAI API token consumption and costs                 |
| `screenshot_cache`    | Cache GPT-4o vision processing results to avoid reprocessing |
| `insights_cache`      | Cache GPT-4 Turbo insights to minimize regeneration          |
| `cumulative_insights` | Store persistent analytics that grow with each upload        |

## 🚀 Next Steps After Database Setup

1. **Test the GPT system**: `node test-gpt-only-system.js`
2. **Process screenshots**: Upload screenshots through the app
3. **Monitor token usage**: Check costs and usage in the dashboard
4. **Enjoy smart insights**: Get AI-powered analytics without local models

## 💡 Benefits of GPT-Only System

- ✅ **No local dependencies** - No Ollama installation needed
- ✅ **Higher accuracy** - GPT-4o vision is more reliable than local models
- ✅ **Smart caching** - Reduces API costs by avoiding duplicate processing
- ✅ **Token tracking** - Monitor exactly how much you're spending
- ✅ **Cumulative insights** - Analytics improve over time without starting over
- ✅ **Better reliability** - No local model crashes or GPU issues

## 🔧 Troubleshooting

**If SQL fails**:

- Make sure you're in the SQL Editor (not Table Editor)
- Run each CREATE TABLE statement individually if needed
- Check for typos in the SQL

**If connection fails**:

- Verify `.env.local` has correct Supabase credentials
- Check your Supabase project is active

**Need help?** Run `node check-database.js` to diagnose issues.
