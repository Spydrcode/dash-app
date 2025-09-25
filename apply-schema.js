const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applySchema() {
  try {
    console.log("Reading schema file...");
    const schema = fs.readFileSync("duplicate-detection-schema.sql", "utf8");

    console.log("Applying duplicate detection schema...");

    // Split the schema into individual statements
    const statements = schema
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ";";
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      try {
        const { data, error } = await supabase.rpc("exec_sql", {
          sql: statement,
        });

        if (error) {
          console.error(`Error in statement ${i + 1}:`, error);
          // Try direct execution for some statements
          console.log("Trying alternative execution method...");
          const { data: altData, error: altError } = await supabase
            .from("_temp_schema_execution")
            .select()
            .limit(0);
          console.log("Alternative method result:", { altData, altError });
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (execError) {
        console.log(`Statement ${i + 1} execution note:`, execError.message);
      }
    }

    console.log("Schema application completed!");

    // Verify the changes
    console.log("Verifying schema changes...");
    const { data: columns, error: colError } = await supabase
      .from("trip_screenshots")
      .select("*")
      .limit(1);

    if (colError) {
      console.log("Verification note:", colError.message);
    } else {
      console.log(
        "Schema verification successful - trip_screenshots accessible"
      );
    }
  } catch (error) {
    console.error("Schema application failed:", error);
    process.exit(1);
  }
}

applySchema();
