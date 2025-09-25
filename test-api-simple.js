// Simple Node.js script to test the process-trip API
const fetch = require("node-fetch");

async function testProcessTrip() {
  try {
    console.log("Testing process-trip API...");

    const response = await fetch("http://localhost:3000/api/process-trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imagePath:
          "https://yrbhmybcbygftccajgws.supabase.co/storage/v1/object/public/trip-uploads/1758819123105-IMG_2864.png",
        driverId: "test-driver-123",
      }),
    });

    console.log("Response status:", response.status);
    const data = await response.json();

    console.log("Response data:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testProcessTrip();
