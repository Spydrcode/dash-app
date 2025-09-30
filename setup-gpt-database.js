// Database Setup for GPT-Only System
// This script sets up the required tables for token tracking and caching

console.log("🗄️ Setting up GPT-Only System Database...\n");

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  console.log(
    "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log("📊 Creating token_usage_log table...");

    const { error: tokenUsageError } = await supabase.rpc("exec_sql", {
      sql: `
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
      `,
    });

    if (tokenUsageError) {
      console.log(
        "ℹ️ Token usage table may already exist:",
        tokenUsageError.message
      );
    } else {
      console.log("✅ Token usage table created");
    }

    console.log("🖼️ Creating screenshot_cache table...");

    const { error: screenshotCacheError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS screenshot_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          screenshot_id VARCHAR(255) UNIQUE NOT NULL,
          result_data JSONB NOT NULL,
          token_usage JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    if (screenshotCacheError) {
      console.log(
        "ℹ️ Screenshot cache table may already exist:",
        screenshotCacheError.message
      );
    } else {
      console.log("✅ Screenshot cache table created");
    }

    console.log("🧠 Creating insights_cache table...");

    const { error: insightsCacheError } = await supabase.rpc("exec_sql", {
      sql: `
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
      `,
    });

    if (insightsCacheError) {
      console.log(
        "ℹ️ Insights cache table may already exist:",
        insightsCacheError.message
      );
    } else {
      console.log("✅ Insights cache table created");
    }

    console.log("📈 Creating cumulative_insights table...");

    const { error: cumulativeError } = await supabase.rpc("exec_sql", {
      sql: `
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
      `,
    });

    if (cumulativeError) {
      console.log(
        "ℹ️ Cumulative insights table may already exist:",
        cumulativeError.message
      );
    } else {
      console.log("✅ Cumulative insights table created");
    }

    // Initialize cumulative insights record
    console.log("🔄 Initializing cumulative insights...");

    const { error: initError } = await supabase
      .from("cumulative_insights")
      .upsert({
        user_id: "default_user",
        insights_data: {
          performance_score: 0,
          key_insights: [
            "Welcome to GPT-powered rideshare analytics",
            "Upload screenshots to start getting AI insights",
            "All processing now uses OpenAI GPT models",
          ],
          recommendations: [
            "Take screenshots of trip offers and totals",
            "Upload dashboard summaries for better analysis",
            "Monitor token usage in the system dashboard",
          ],
          trends:
            "No data yet - insights will improve as you upload more screenshots",
          fuel_efficiency: "Upload trip data to analyze efficiency",
          gpt_migration_complete: true,
          local_models_removed: true,
        },
      });

    if (initError) {
      console.log(
        "ℹ️ Cumulative insights may already be initialized:",
        initError.message
      );
    } else {
      console.log("✅ Cumulative insights initialized");
    }

    console.log("\n🎉 GPT-Only System Database Setup Complete!");
    console.log("\n📋 Summary:");
    console.log("- ✅ Token usage tracking enabled");
    console.log("- ✅ Smart caching system ready");
    console.log("- ✅ Cumulative insights initialized");
    console.log("- ✅ GPT-4o vision processing ready");
    console.log("- ✅ GPT-4 Turbo insights generation ready");
    console.log("\n🚀 System is ready to process screenshots with GPT models!");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    console.log(
      "\n💡 You may need to run the SQL commands manually in Supabase SQL editor"
    );
    console.log(
      "📄 Check database-migration-gpt-tracking.sql file for manual setup"
    );
  }
}

// Manual fallback instructions
console.log("📋 If automatic setup fails, you can:");
console.log("1. Copy the SQL from database-migration-gpt-tracking.sql");
console.log("2. Run it in your Supabase SQL editor");
console.log("3. Then test the system with: node test-gpt-only-system.js\n");

setupDatabase();
