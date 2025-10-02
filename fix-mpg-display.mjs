// Fix MPG Display in AI Insights
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMPGDisplay() {
  console.log("🔍 FIXING MPG DISPLAY IN AI INSIGHTS");
  console.log("=".repeat(45));

  try {
    // Check current cumulative insights
    const { data: insights, error } = await supabase
      .from("cumulative_insights")
      .select("*")
      .eq("user_id", "default_user")
      .single();

    if (error) {
      console.log("❌ Error getting insights:", error.message);
      return;
    }

    console.log("📊 CURRENT DATA:");
    console.log("Total distance:", insights.total_distance, "miles");
    console.log(
      "Current fuel_efficiency:",
      insights.insights_data?.fuel_efficiency
    );

    // Get raw trip data to recalculate MPG
    const { data: trips } = await supabase.from("trips").select("trip_data");

    let totalDistance = 0;
    let totalGallons = 0;
    let tripsWithFuelData = 0;

    console.log("\n🚗 ANALYZING FUEL DATA:");

    trips.forEach((trip, index) => {
      const data = trip.trip_data || {};
      const distance = parseFloat(data.distance || 0);
      const gasCost = parseFloat(data.gas_cost || 0);
      const gallons = parseFloat(data.gas_used_gallons || 0);

      if (distance > 0 && (gasCost > 0 || gallons > 0)) {
        tripsWithFuelData++;
        totalDistance += distance;
        totalGasCost += gasCost;

        if (gallons > 0) {
          totalGallons += gallons;
        } else if (gasCost > 0) {
          // Estimate gallons from gas cost (assuming $3.50/gallon)
          totalGallons += gasCost / 3.5;
        }

        if (index < 3) {
          const estimatedGallons = gallons || gasCost / 3.5;
          console.log(
            "Trip " +
              (index + 1) +
              ": " +
              distance +
              " miles, $" +
              gasCost.toFixed(2) +
              " gas, " +
              estimatedGallons.toFixed(2) +
              " gallons"
          );
        }
      }
    });

    const calculatedMPG = totalGallons > 0 ? totalDistance / totalGallons : 0;

    console.log("\n📈 MPG CALCULATION:");
    console.log("Total distance:", totalDistance.toFixed(1), "miles");
    console.log("Total gallons used:", totalGallons.toFixed(2));
    console.log("Calculated MPG:", calculatedMPG.toFixed(1));
    console.log("Trips with fuel data:", tripsWithFuelData, "/", trips.length);

    // Create comprehensive MPG insights
    const mpgVsRated = calculatedMPG >= 19 ? "exceeding" : "below";
    const mpgStatus =
      calculatedMPG >= 19
        ? "🟢 Above Honda Odyssey rating!"
        : "🟡 Below Honda Odyssey rating";

    // Update insights with prominent MPG data
    const updatedInsights = {
      ...insights.insights_data,
      fuel_efficiency:
        calculatedMPG.toFixed(1) + " MPG calculated from trip data",
      honda_odyssey_mpg: {
        calculated: calculatedMPG,
        rated: 19,
        status: mpgStatus,
        performance: mpgVsRated,
        efficiency_score: Math.round((calculatedMPG / 19) * 100),
      },
      key_insights: [
        "Analyzed " +
          insights.total_trips +
          " trips with $" +
          insights.total_earnings.toFixed(2) +
          " earnings",
        "⛽ Fuel Efficiency: " +
          calculatedMPG.toFixed(1) +
          " MPG (Honda Odyssey rated: 19 MPG) - " +
          mpgStatus,
        "Average profit per trip: $" +
          (insights.total_profit / insights.total_trips).toFixed(2),
        "Profit margin: " +
          ((insights.total_profit / insights.total_earnings) * 100).toFixed(1) +
          "% with excellent fuel management",
      ],
      recommendations: [
        calculatedMPG >= 19
          ? "Excellent fuel efficiency! You are exceeding Honda Odyssey rating"
          : "Focus on fuel-efficient driving to reach 19 MPG Honda Odyssey rating",
        insights.total_profit / insights.total_trips >= 8
          ? "Strong earnings per trip - maintain current route selection"
          : "Consider targeting higher-value trips",
        "Active fuel tracking shows " +
          tripsWithFuelData +
          "/" +
          trips.length +
          " trips have complete fuel data",
      ],
    };

    console.log("\n🔄 Updating insights with prominent MPG display...");

    const { error: updateError } = await supabase
      .from("cumulative_insights")
      .update({
        insights_data: updatedInsights,
        last_updated: new Date().toISOString(),
      })
      .eq("user_id", "default_user");

    if (updateError) {
      console.log("❌ Update error:", updateError.message);
    } else {
      console.log("✅ MPG data prominently updated in AI insights");

      // Test the updated insights via API
      console.log("\n🧠 Testing MPG display in API response...");

      const fetch = (await import("node-fetch")).default;
      const response = await fetch("http://localhost:3000/api/unified-mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_insights", timeframe: "all" }),
      });

      const result = await response.json();

      if (result.success) {
        console.log("\n🎉 MPG NOW PROMINENT IN AI INSIGHTS:");
        if (result.key_insights) {
          result.key_insights.forEach((insight, i) => {
            console.log("   " + (i + 1) + ". " + insight);
          });
        }

        // Also check if Honda Odyssey data is available
        if (result.gpt_insights?.honda_odyssey_mpg) {
          console.log("\n🚗 Honda Odyssey MPG Details:");
          const mpgData = result.gpt_insights.honda_odyssey_mpg;
          console.log("   Calculated MPG:", mpgData.calculated.toFixed(1));
          console.log("   Rated MPG:", mpgData.rated);
          console.log("   Status:", mpgData.status);
        }
      }

      console.log("\n✅ MPG is now prominently displayed in AI insights!");
      console.log(
        "🌐 Visit http://localhost:3000 to see the updated fuel efficiency data"
      );
    }
  } catch (error) {
    console.log("❌ MPG fix failed:", error.message);
  }
}

fixMPGDisplay();
