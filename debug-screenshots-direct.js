// Direct database query to debug screenshot processing status
const { createClient } = require("@supabase/supabase-js");
const fetch = require("node-fetch");

const supabaseUrl = "https://ypydqbnohcqvbkrwlfls.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlweWRxYm5vaGNxdmJrcndsZmxzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI0MjgxNSwiZXhwIjoyMDUyODE4ODE1fQ.1cKYGJx7vg8aBG2Yt1YfIYc5jVYUDlH6PdZsLpPdkKs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugScreenshots() {
  console.log("=== SCREENSHOT PROCESSING DEBUG ===");

  try {
    // Get all trips with screenshots
    const { data: trips, error } = await supabase
      .from("trips")
      .select(
        `
        id,
        created_at,
        trip_screenshots (
          id,
          screenshot_type,
          is_processed,
          created_at,
          processing_notes,
          image_path
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error:", error);
      return;
    }

    console.log(`Found ${trips.length} total trips`);

    let totalScreenshots = 0;
    let processedScreenshots = 0;
    let unprocessedList = [];

    trips.forEach((trip) => {
      if (trip.trip_screenshots && trip.trip_screenshots.length > 0) {
        trip.trip_screenshots.forEach((screenshot) => {
          totalScreenshots++;
          if (screenshot.is_processed) {
            processedScreenshots++;
          } else {
            unprocessedList.push({
              tripId: trip.id,
              screenshotId: screenshot.id,
              type: screenshot.screenshot_type,
              imagePath: screenshot.image_path?.substring(0, 80) + "...",
              createdAt: screenshot.created_at,
            });
          }
        });
      }
    });

    console.log("\n=== PROCESSING SUMMARY ===");
    console.log(`Total screenshots: ${totalScreenshots}`);
    console.log(`Processed screenshots: ${processedScreenshots}`);
    console.log(
      `Unprocessed screenshots: ${totalScreenshots - processedScreenshots}`
    );
    console.log(
      `Processing rate: ${Math.round(
        (processedScreenshots / totalScreenshots) * 100
      )}%`
    );

    if (unprocessedList.length > 0) {
      console.log("\n=== UNPROCESSED SCREENSHOTS ===");
      unprocessedList.forEach((item, index) => {
        console.log(
          `${index + 1}. Trip ${item.tripId}, Screenshot ${item.screenshotId}`
        );
        console.log(`   Type: ${item.type}`);
        console.log(`   Created: ${item.createdAt}`);
        console.log(`   Path: ${item.imagePath}`);
        console.log("");
      });
    }

    // Also check for any NULL or undefined is_processed values
    const { data: nullProcessed } = await supabase
      .from("trip_screenshots")
      .select("id, screenshot_type, is_processed, processing_notes")
      .is("is_processed", null);

    if (nullProcessed && nullProcessed.length > 0) {
      console.log(
        `Found ${
          nullProcessed.length
        } screenshots with NULL is_processed values`
      );
      console.log(nullProcessed);
    }
  } catch (error) {
    console.error("Debug error:", error);
  }
}

debugScreenshots();
