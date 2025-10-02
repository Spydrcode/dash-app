import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key exists:", !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("Error listing buckets:", error);
      return;
    }

    console.log("Available buckets:");
    data.forEach((bucket) => {
      console.log(`- ${bucket.name} (created: ${bucket.created_at})`);
    });

    // Try to create a bucket if none exist
    if (data.length === 0) {
      console.log("\nNo buckets found. Creating trip-screenshots bucket...");
      const {
        data: createData,
        error: createError,
      } = await supabase.storage.createBucket("trip-screenshots", {
        public: true,
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createError) {
        console.error("Error creating bucket:", createError);
      } else {
        console.log(
          "Successfully created trip-screenshots bucket:",
          createData
        );
      }
    }
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

listBuckets();
