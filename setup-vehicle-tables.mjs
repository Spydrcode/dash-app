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

console.log("🔧 Setting up Vehicle Maintenance Tables...");
console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupVehicleTables() {
  try {
    console.log("\n📋 Creating maintenance_records table...");

    // Test if maintenance_records table exists
    const { error: maintenanceError } = await supabase
      .from("maintenance_records")
      .select("id")
      .limit(1);

    if (
      maintenanceError &&
      maintenanceError.message.includes("does not exist")
    ) {
      console.log("❌ maintenance_records table not found");
      console.log("\n🚨 REQUIRED ACTION:");
      console.log(
        "1. Go to your Supabase dashboard: https://supabase.com/dashboard"
      );
      console.log("2. Navigate to SQL Editor");
      console.log("3. Copy the contents of vehicle-maintenance-schema.sql");
      console.log("4. Paste and run the SQL commands");
      console.log("\nThis will create the required tables:");
      console.log("- maintenance_records");
      console.log("- fuel_records");
      console.log("- vehicle_alerts");
      return false;
    } else if (maintenanceError) {
      console.error("Error testing maintenance_records:", maintenanceError);
      return false;
    } else {
      console.log("✅ maintenance_records table exists");
    }

    // Test fuel_records table
    const { error: fuelError } = await supabase
      .from("fuel_records")
      .select("id")
      .limit(1);

    if (fuelError) {
      console.log("❌ fuel_records table not found");
      return false;
    } else {
      console.log("✅ fuel_records table exists");
    }

    // Test vehicle_alerts table
    const { error: alertsError } = await supabase
      .from("vehicle_alerts")
      .select("id")
      .limit(1);

    if (alertsError) {
      console.log("❌ vehicle_alerts table not found");
      return false;
    } else {
      console.log("✅ vehicle_alerts table exists");
    }

    console.log("\n📊 Testing vehicle maintenance functionality...");

    // Get maintenance records count
    const {
      data: maintenanceRecords,
      error: getMaintenanceError,
    } = await supabase.from("maintenance_records").select("*");

    if (getMaintenanceError) {
      console.error("Error fetching maintenance records:", getMaintenanceError);
      return false;
    }

    console.log(
      `✅ Found ${maintenanceRecords?.length || 0} maintenance records`
    );

    // Get fuel records count
    const { data: fuelRecords } = await supabase
      .from("fuel_records")
      .select("*");

    console.log(`✅ Found ${fuelRecords?.length || 0} fuel records`);

    // Get alerts count
    const { data: alerts } = await supabase.from("vehicle_alerts").select("*");

    console.log(`✅ Found ${alerts?.length || 0} vehicle alerts`);

    console.log("\n🎉 Vehicle maintenance system is ready!");
    console.log("You can now:");
    console.log("- Add maintenance records via /vehicle page");
    console.log("- Track fuel costs and efficiency");
    console.log("- Receive maintenance alerts and reminders");

    return true;
  } catch (error) {
    console.error("❌ Setup failed:", error);
    return false;
  }
}

// Run the setup
setupVehicleTables().then((success) => {
  if (success) {
    console.log("\n✅ Vehicle maintenance system verified!");
  } else {
    console.log(
      "\n❌ Setup incomplete. Please run the SQL schema in Supabase SQL Editor."
    );
  }
  process.exit(success ? 0 : 1);
});
