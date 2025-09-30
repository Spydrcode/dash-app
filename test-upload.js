// Test script to check Supabase storage connectivity
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://niyvlumbtuqnzjguxlcz.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5peXZsdW1idHVxbnpqZ3V4bGN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgyNDAzNSwiZXhwIjoyMDc0NDAwMDM1fQ.zqSr78HshLhDstrj8JJYdoiqABvzSr2FjQAU4M-Z-iM";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testStorageBucket() {
  console.log("Testing Supabase storage bucket access...");

  // Check if bucket exists and is accessible
  try {
    const {
      data: buckets,
      error: listError,
    } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }

    console.log("Available buckets:", buckets?.map((b) => b.name));

    // Check specifically for trip-uploads bucket
    const tripUploads = buckets?.find((b) => b.name === "trip-uploads");
    if (tripUploads) {
      console.log("✅ trip-uploads bucket found:", tripUploads);
    } else {
      console.log("❌ trip-uploads bucket NOT found");
      console.log("Available buckets:", buckets);
    }

    // Test uploading a small file
    const testContent = "test content";
    const testFile = Buffer.from(testContent, "utf8");
    const testFileName = `test-${Date.now()}.txt`;

    console.log("Testing upload to trip-uploads bucket...");
    const {
      data: uploadData,
      error: uploadError,
    } = await supabase.storage
      .from("trip-uploads")
      .upload(testFileName, testFile, {
        contentType: "text/plain",
      });

    if (uploadError) {
      console.error("❌ Upload test failed:", uploadError);
    } else {
      console.log("✅ Upload test successful:", uploadData);

      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from("trip-uploads")
        .remove([testFileName]);

      if (deleteError) {
        console.error("Warning: Could not delete test file:", deleteError);
      } else {
        console.log("✅ Test file cleaned up");
      }
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

testStorageBucket();
