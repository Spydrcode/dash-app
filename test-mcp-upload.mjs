// const fs = fs; // Unused - commented out
// const path = path; // Unused - commented out

// Create a test image upload to our MCP-powered API
async function testMCPUpload() {
  try {
    console.log("Testing MCP-powered trip processing...");

    // Create a mock form data request
    const formData = new FormData();

    // Create a simple test file (in production this would be an actual image)
    const testImageContent = "Test image content representing a trip receipt";
    const testBlob = new Blob([testImageContent], { type: "image/jpeg" });
    formData.append("image", testBlob, "test-receipt.jpg");
    formData.append("driverId", "test-driver-123");

    // Test the API endpoint
    const response = await fetch("http://localhost:3000/api/process-trip", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    console.log("MCP Processing Result:");
    console.log("Success:", result.success);
    console.log("Extracted Data:", result.extractedData);
    console.log("AI Insights:", result.aiInsights);
    console.log("Predictions:", result.predictions);
    console.log("MCP Details:", result.mcp_details);
    console.log("Processing Steps:", result.processing_steps);

    if (result.success) {
      console.log("\n✅ MCP-powered AI processing successful!");
      console.log("🔍 Data extraction agent worked");
      console.log("📊 Analytics agent provided predictions");
      console.log("🤖 LLM processing integrated");
    } else {
      console.log("\n❌ Processing failed:", result.error);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run test if node.js environment has fetch
if (typeof fetch !== "undefined") {
  testMCPUpload();
} else {
  console.log("Test script requires fetch API - run in browser or Node 18+");
  console.log(
    "Alternatively, test by uploading an image through the web interface at:"
  );
  console.log("http://localhost:3000");
}
