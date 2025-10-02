import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envLines = envContent.split("\n");

const env = {};
envLines.forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key exists:", !!supabaseServiceKey);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupEnhancedDatabase() {
  console.log("\n🔧 Setting up enhanced database schema...");

  try {
    // 1. First, create the storage bucket
    console.log("\n📁 Creating storage buckets...");

    const bucketsToCreate = [
      {
        name: "trip-screenshots",
        config: {
          public: true,
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/jpg",
          ],
          fileSizeLimit: 5242880, // 5MB
        },
      },
      {
        name: "weekly-summaries",
        config: {
          public: true,
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
            "image/jpg",
          ],
          fileSizeLimit: 5242880, // 5MB
        },
      },
    ];

    // Check existing buckets first
    const {
      data: existingBuckets,
      error: listError,
    } = await supabase.storage.listBuckets();

    if (listError) {
      console.error("Error listing buckets:", listError);
    } else {
      console.log("Existing buckets:", existingBuckets.map((b) => b.name));
    }

    for (const bucket of bucketsToCreate) {
      const bucketExists = existingBuckets?.some((b) => b.name === bucket.name);

      if (bucketExists) {
        console.log(`✅ Bucket '${bucket.name}' already exists`);
      } else {
        console.log(`Creating bucket: ${bucket.name}`);
        const { error: createError } = await supabase.storage.createBucket(
          bucket.name,
          bucket.config
        );

        if (createError) {
          console.error(
            `❌ Error creating bucket ${bucket.name}:`,
            createError
          );
        } else {
          console.log(`✅ Successfully created bucket: ${bucket.name}`);
        }
      }
    }

    // 2. Test the enhanced schema by checking if tables exist
    console.log("\n🔍 Checking enhanced database schema...");

    // Check if trip_screenshots table exists
    const { error: screenshotsError } = await supabase
      .from("trip_screenshots")
      .select("*")
      .limit(1);

    if (screenshotsError) {
      console.log(
        "❌ trip_screenshots table not found. Please run the SQL schema in Supabase SQL Editor first."
      );
      console.log("\nTo setup the enhanced schema:");
      console.log("1. Go to your Supabase dashboard");
      console.log("2. Navigate to SQL Editor");
      console.log(
        "3. Copy and paste the content from supabase-enhanced-schema.sql"
      );
      console.log("4. Run the SQL commands");
      return false;
    } else {
      console.log("✅ trip_screenshots table exists");
    }

    // Check enhanced trips table columns
    const { error: tripsError } = await supabase
      .from("trips")
      .select(
        "id, initial_estimate, final_total, trip_status, screenshot_count"
      )
      .limit(1);

    if (tripsError) {
      console.log(
        "❌ Enhanced trips table columns not found:",
        tripsError.message
      );
      return false;
    } else {
      console.log("✅ Enhanced trips table columns exist");
    }

    // 3. Test upload functionality
    console.log("\n📤 Testing file upload to trip-screenshots bucket...");

    // Create a test file buffer (1x1 transparent PNG)
    const testImageBuffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52,
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01,
      0x08,
      0x06,
      0x00,
      0x00,
      0x00,
      0x1f,
      0x15,
      0xc4,
      0x89,
      0x00,
      0x00,
      0x00,
      0x0b,
      0x49,
      0x44,
      0x41,
      0x54,
      0x78,
      0x9c,
      0x63,
      0x00,
      0x01,
      0x00,
      0x00,
      0x05,
      0x00,
      0x01,
      0x0d,
      0x0a,
      0x2d,
      0xb4,
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ]);

    const testFilename = `test-upload-${Date.now()}.png`;

    const {
      data: uploadData,
      error: uploadError,
    } = await supabase.storage
      .from("trip-screenshots")
      .upload(`test/${testFilename}`, testImageBuffer, {
        contentType: "image/png",
      });

    if (uploadError) {
      console.log("❌ Upload test failed:", uploadError.message);
      return false;
    } else {
      console.log("✅ Upload test successful:", uploadData.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("trip-screenshots")
        .getPublicUrl(`test/${testFilename}`);

      console.log("📎 Test file URL:", urlData.publicUrl);

      // Clean up test file
      await supabase.storage
        .from("trip-screenshots")
        .remove([`test/${testFilename}`]);

      console.log("🧹 Test file cleaned up");
    }

    console.log("\n🎉 Enhanced database setup verification complete!");
    console.log("\nNext steps:");
    console.log("1. Upload screenshots using the /api/upload-file endpoint");
    console.log("2. Use the weekly validation system to process uploads");
    console.log("3. View enhanced trip data with screenshot tracking");

    return true;
  } catch (error) {
    console.error("❌ Setup failed:", error);
    return false;
  }
}

// Run the setup
setupEnhancedDatabase().then((success) => {
  if (success) {
    console.log("\n✅ All systems ready!");
  } else {
    console.log("\n❌ Setup incomplete. Please check the errors above.");
  }
  process.exit(success ? 0 : 1);
});
