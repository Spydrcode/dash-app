// Simple test script for the data pipeline
const testPipeline = async () => {
  try {
    console.log("🧪 Testing Data Pipeline...");

    // Test GET endpoint (status check)
    console.log("\n1. Testing pipeline status...");
    const statusResponse = await fetch(
      "http://localhost:3000/api/fix-data-pipeline"
    );

    if (!statusResponse.ok) {
      console.log(`❌ Status check failed: ${statusResponse.status}`);
      return;
    }

    const status = await statusResponse.json();
    console.log("✅ Pipeline status:", JSON.stringify(status, null, 2));

    // Test POST endpoint (pipeline execution) - only if we have screenshots
    if (status.current_data_status?.total_screenshots > 0) {
      console.log("\n2. Testing pipeline execution...");
      const pipelineResponse = await fetch(
        "http://localhost:3000/api/fix-data-pipeline",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!pipelineResponse.ok) {
        console.log(`❌ Pipeline execution failed: ${pipelineResponse.status}`);
        return;
      }

      const result = await pipelineResponse.json();
      console.log("✅ Pipeline execution:", JSON.stringify(result, null, 2));
    } else {
      console.log("ℹ️ No screenshots found - skipping pipeline execution test");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

// Run if server is available
fetch("http://localhost:3000/health")
  .then(() => {
    console.log("🚀 Server is running, starting tests...");
    testPipeline();
  })
  .catch(() => {
    console.log("⚠️ Server not running. Start with: npm run dev");
  });
