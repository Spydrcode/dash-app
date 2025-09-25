const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testSchema() {
  try {
    console.log(
      "Testing schema by attempting to insert a record with new columns..."
    );

    // First get a sample trip ID
    const { data: trips, error: tripError } = await supabase
      .from("trips")
      .select("id")
      .limit(1);

    if (tripError || !trips || trips.length === 0) {
      console.error("No trips found for testing");
      return;
    }

    const tripId = trips[0].id;
    console.log("Using trip ID for test:", tripId);

    // Try to insert a test record with the new columns
    const testData = {
      trip_id: tripId,
      screenshot_type: "test",
      image_path: "https://test.example.com/test.jpg",
      ocr_data: { test: true },
      extracted_data: { test: true },
      is_processed: false,
      processing_notes: "Schema test record",
      // New duplicate detection columns
      file_hash: "abcd1234test",
      perceptual_hash: "ffff",
      file_size: 12345,
      original_filename: "test-schema.jpg",
    };

    const { data, error } = await supabase
      .from("trip_screenshots")
      .insert(testData)
      .select();

    if (error) {
      console.log(
        "Schema test failed (expected if columns don't exist):",
        error.message
      );

      // Try without the new columns
      const {
        file_hash,
        perceptual_hash,
        file_size,
        original_filename,
        ...basicData
      } = testData;
      const { data: basicInsert, error: basicError } = await supabase
        .from("trip_screenshots")
        .insert(basicData)
        .select();

      if (basicError) {
        console.error("Basic insert also failed:", basicError.message);
      } else {
        console.log("Basic insert succeeded - schema needs updating");
        // Clean up the test record
        await supabase
          .from("trip_screenshots")
          .delete()
          .eq("id", basicInsert[0].id);
      }
    } else {
      console.log("Schema test successful! New columns are available");
      console.log("Inserted test record:", data[0]);

      // Clean up the test record
      await supabase
        .from("trip_screenshots")
        .delete()
        .eq("id", data[0].id);
      console.log("Test record cleaned up");
    }
  } catch (error) {
    console.error("Schema test error:", error);
  }
}

testSchema();
