// Quick Database Check Script
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

console.log("🔧 Environment check:");
console.log(
  "- Supabase URL:",
  process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Found" : "❌ Missing"
);
console.log(
  "- Service Key:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Found" : "❌ Missing"
);
console.log("");

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.log("❌ Missing Supabase credentials in .env.local");
  console.log("💡 Make sure your .env.local file contains:");
  console.log("   NEXT_PUBLIC_SUPABASE_URL=your_url_here");
  console.log("   SUPABASE_SERVICE_ROLE_KEY=your_key_here");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log("🔍 Checking Supabase database setup...\n");

  try {
    // Test basic connection
    console.log("📡 Testing Supabase connection...");
    const { error: testError } = await supabase
      .from("trips")
      .select("count")
      .limit(1);

    if (testError) {
      console.log("❌ Supabase connection failed:", testError.message);
      return;
    }

    console.log("✅ Supabase connection successful\n");

    // Check for GPT-specific tables
    console.log("📋 Checking GPT-only system tables:");
    const tables = [
      "token_usage_log",
      "screenshot_cache",
      "insights_cache",
      "cumulative_insights",
    ];
    let tablesExist = 0;

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select("count")
          .limit(1);

        if (error) {
          console.log(`❌ Table '${table}' does NOT exist`);
        } else {
          console.log(`✅ Table '${table}' exists`);
          tablesExist++;
        }
      } catch {
        console.log(`❌ Table '${table}' does NOT exist`);
      }
    }

    console.log(
      `\n📊 Database Status: ${tablesExist}/${tables.length} GPT tables exist\n`
    );

    // Check cumulative insights data
    if (tablesExist > 0) {
      try {
        console.log("🧠 Checking cumulative insights...");
        const { data: cumulativeData } = await supabase
          .from("cumulative_insights")
          .select("*")
          .eq("user_id", "default_user")
          .single();

        if (cumulativeData) {
          console.log("✅ Cumulative insights initialized:", {
            total_trips: cumulativeData.total_trips,
            total_earnings: parseFloat(cumulativeData.total_earnings || 0),
            performance_score: cumulativeData.performance_score,
            last_updated: cumulativeData.last_updated?.split("T")[0],
          });
        } else {
          console.log("⚠️ Cumulative insights NOT initialized");
        }
      } catch (err) {
        console.log("⚠️ Cumulative insights not accessible:", err.message);
      }
    }

    // Summary and recommendations
    console.log("\n🎯 SETUP STATUS:");

    if (tablesExist === tables.length) {
      console.log("✅ GPT-only system database is READY!");
      console.log("🚀 You can start processing screenshots with GPT models");
    } else if (tablesExist > 0) {
      console.log("⚠️ Partial setup - some tables missing");
      console.log("🔧 Run the database migration to complete setup");
    } else {
      console.log("❌ GPT tables NOT found - database setup required");
      console.log("📋 Next steps:");
      console.log("1. Copy the SQL from database-migration-gpt-tracking.sql");
      console.log("2. Run it in your Supabase SQL editor");
      console.log("3. Test again with this script");
    }
  } catch (error) {
    console.log("❌ Database check failed:", error.message);
  }
}

checkDatabase();
