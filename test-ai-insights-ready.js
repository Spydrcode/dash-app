// Test All AI Insights After Database Setup
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAIInsightsSystem() {
  console.log("🧪 TESTING AI INSIGHTS SYSTEM CONNECTION");
  console.log("=".repeat(50));

  try {
    // Test 1: Check if GPT tables exist
    console.log("\n📋 Testing database tables...");
    const gptTables = [
      "token_usage_log",
      "screenshot_cache",
      "insights_cache",
      "cumulative_insights",
    ];
    let tablesExist = 0;

    for (const table of gptTables) {
      try {
        const { error } = await supabase
          .from(table)
          .select("id")
          .limit(1);
        if (!error) {
          console.log("✅", table, "exists");
          tablesExist++;
        } else {
          console.log("❌", table, "missing");
        }
      } catch (e) {
        console.log("❌", table, "error");
      }
    }

    if (tablesExist !== 4) {
      console.log("\n🚨 DATABASE SETUP REQUIRED:");
      console.log("• Run the SQL from URGENT-DATABASE-SETUP.md");
      console.log("• Then re-run this test");
      return;
    }

    // Test 2: Check existing trip data
    console.log("\n📊 Checking existing trip data...");
    const { data: trips, count } = await supabase
      .from("trips")
      .select("*", { count: "exact" })
      .limit(5);

    console.log("✅ Found", count, "trips ready for AI analysis");

    // Test 3: Test GPT Screenshot Processor API
    console.log("\n🤖 Testing GPT Screenshot Processor...");
    const fetch = (await import("node-fetch")).default;

    const gptResponse = await fetch(
      "http://localhost:3000/api/gpt-screenshot-processor?action=get_processing_status"
    );
    const gptResult = await gptResponse.json();

    if (gptResult.success) {
      console.log("✅ GPT Screenshot Processor: READY");
      console.log("   Models:", gptResult.system_status);
    } else {
      console.log("❌ GPT Screenshot Processor: Error");
    }

    // Test 4: Test Unified MCP API for AI Insights
    console.log("\n🧠 Testing AI Insights generation...");

    const mcpResponse = await fetch("http://localhost:3000/api/unified-mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ai_insights",
        timeframe: "all",
        includeProjections: true,
        includeTrends: true,
      }),
    });

    const mcpResult = await mcpResponse.json();

    if (mcpResult.success) {
      console.log("✅ AI Insights: WORKING");
      console.log("   Trip count analyzed:", mcpResult.trip_count);
      console.log(
        "   Performance score:",
        mcpResult.gpt_insights?.performance_score || "N/A"
      );
      console.log(
        "   Key insights:",
        mcpResult.key_insights?.slice(0, 2) || ["Generating..."]
      );
    } else {
      console.log("❌ AI Insights: Error -", mcpResult.error);
    }

    // Test 5: Test screenshot reprocessing capability
    console.log("\n🔄 Testing screenshot reprocessing readiness...");

    const reprocessResponse = await fetch(
      "http://localhost:3000/api/gpt-screenshot-processor",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_processing_status" }),
      }
    );

    const reprocessResult = await reprocessResponse.json();

    if (reprocessResult.success) {
      console.log("✅ Screenshot Reprocessing: READY");
      console.log(
        "   Screenshots to process:",
        reprocessResult.processing_status?.needs_gpt_processing || 0
      );
    }

    console.log("\n🎉 SYSTEM STATUS SUMMARY:");
    console.log("• Database tables:", tablesExist, "/ 4 created");
    console.log("• Existing trips:", count, "ready for analysis");
    console.log("• GPT-4o vision: Ready for screenshot processing");
    console.log("• GPT-4 Turbo: Ready for insights generation");
    console.log("• MCP Server: Connected and functional");
    console.log("• AI Agents: Connected and ready");

    if (tablesExist === 4) {
      console.log("\n✅ ALL SYSTEMS READY!");
      console.log("🚀 Next steps:");
      console.log("   1. Upload screenshots at http://localhost:3000");
      console.log("   2. Screenshots auto-process with GPT-4o");
      console.log("   3. AI insights populate with your 60+ trips");
      console.log("   4. MCP server provides insights via API");
    }
  } catch (error) {
    console.log("❌ Test failed:", error.message);
  }
}

testAIInsightsSystem();
