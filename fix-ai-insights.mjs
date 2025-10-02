// Update AI Insights with Real Trip Data
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAIInsightsWithRealData() {
  console.log("🔄 UPDATING AI INSIGHTS WITH REAL TRIP DATA");
  console.log("=".repeat(50));

  try {
    // Get all trips with proper data extraction
    const { data: allTrips, error } = await supabase.from("trips").select("*");

    if (error) {
      console.log("❌ Error:", error.message);
      return;
    }

    // Calculate real totals from trip data
    let totalTrips = allTrips.length;
    let totalEarnings = 0;
    let totalDistance = 0;
    let totalProfit = 0;
    let totalGasCost = 0;

    console.log("📊 Processing", totalTrips, "trips...");

    allTrips.forEach((trip) => {
      // Extract from trip_data field which contains the real data
      const data = trip.trip_data || {};

      totalEarnings += parseFloat(data.driver_earnings || 0);
      totalDistance += parseFloat(data.distance || 0);
      totalProfit += parseFloat(data.profit || 0);
      totalGasCost += parseFloat(data.gas_cost || 0);
    });

    // Calculate performance score
    const avgProfitPerTrip = totalTrips > 0 ? totalProfit / totalTrips : 0;
    const profitMargin =
      totalEarnings > 0 ? (totalProfit / totalEarnings) * 100 : 0;
    const performanceScore = Math.min(
      Math.max(Math.round(avgProfitPerTrip * 4 + profitMargin), 20),
      95
    );

    console.log("\n💰 CALCULATED TOTALS:");
    console.log("Total trips:", totalTrips);
    console.log("Total earnings: $" + totalEarnings.toFixed(2));
    console.log("Total distance:", totalDistance.toFixed(1), "miles");
    console.log("Total profit: $" + totalProfit.toFixed(2));
    console.log("Total gas cost: $" + totalGasCost.toFixed(2));
    console.log("Performance score:", performanceScore + "/100");
    console.log("Profit margin:", profitMargin.toFixed(1) + "%");

    // Get unique dates for active days calculation
    const uniqueDates = new Set();
    allTrips.forEach((trip) => {
      if (trip.trip_data?.trip_date) {
        uniqueDates.add(trip.trip_data.trip_date);
      } else if (trip.created_at) {
        uniqueDates.add(trip.created_at.split("T")[0]);
      }
    });
    const activeDays = uniqueDates.size;

    // Generate smart insights based on real data
    const insights = {
      performance_score: performanceScore,
      key_insights: [
        "Analyzed " +
          totalTrips +
          " trips with $" +
          totalEarnings.toFixed(2) +
          " total earnings",
        "Average profit per trip: $" + avgProfitPerTrip.toFixed(2),
        "Profit margin: " +
          profitMargin.toFixed(1) +
          "% (fuel efficiency: " +
          (totalDistance > 0
            ? (totalDistance / (totalGasCost / 3.5)).toFixed(1)
            : "N/A") +
          " MPG)",
        "Active " +
          activeDays +
          " days with " +
          (totalDistance / Math.max(activeDays, 1)).toFixed(1) +
          " avg miles per day",
      ],
      recommendations: [
        performanceScore >= 70
          ? "Excellent performance! Maintain current strategies"
          : "Focus on higher-paying trips to improve profit margin",
        profitMargin < 50
          ? "Optimize routes and reduce idle time for better fuel efficiency"
          : "Great fuel efficiency - consider expanding operating hours",
        avgProfitPerTrip < 10
          ? "Target longer trips or premium rides for higher earnings"
          : "Strong earnings per trip - consistent performance",
      ],
      trends:
        totalTrips >= 20
          ? "Sufficient data for trend analysis"
          : "Upload more trip data for better trend insights",
      fuel_efficiency:
        totalDistance > 0
          ? (totalDistance / (totalGasCost / 3.5)).toFixed(1) +
            " MPG calculated"
          : "Upload trip data for efficiency analysis",
      gpt_only_system: true,
      local_models_removed: true,
      data_source: "Real trip data processed",
      last_calculation: new Date().toISOString(),
    };

    // Update cumulative insights with real data
    const { error: updateError } = await supabase
      .from("cumulative_insights")
      .update({
        total_trips: totalTrips,
        total_earnings: totalEarnings,
        total_profit: totalProfit,
        total_distance: totalDistance,
        active_days: activeDays,
        performance_score: performanceScore,
        insights_data: insights,
        last_updated: new Date().toISOString(),
        screenshots_count: 5,
      })
      .eq("user_id", "default_user");

    if (updateError) {
      console.log("❌ Update error:", updateError.message);
    } else {
      console.log("\n✅ AI INSIGHTS UPDATED WITH REAL DATA!");

      // Test the AI insights API again
      console.log("\n🧠 Testing updated AI insights...");

      const fetch = (await import("node-fetch")).default;
      const response = await fetch("http://localhost:3000/api/unified-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ai_insights",
          timeframe: "all",
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("\n🎉 AI INSIGHTS NOW SHOWING REAL DATA:");
        console.log(
          "📊 Total earnings: $" +
            (result.summary?.total_earnings || 0).toFixed(2)
        );
        console.log(
          "📊 Total profit: $" + (result.summary?.total_profit || 0).toFixed(2)
        );
        console.log(
          "📊 Performance score:",
          result.summary?.performance_score || "N/A"
        );
        console.log("\n💡 Key insights:");
        if (result.key_insights) {
          result.key_insights.slice(0, 3).forEach((insight, i) => {
            console.log(`   ${i + 1}. ${insight}`);
          });
        }
      }
    }
  } catch (error) {
    console.log("❌ Update failed:", error.message);
  }
}

updateAIInsightsWithRealData();
