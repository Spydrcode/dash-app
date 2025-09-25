#!/usr/bin/env node

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🚀 Dash App Deployment Helper\n");

// Check if ngrok is installed
exec("ngrok version", (error) => {
  if (error) {
    console.log("❌ ngrok not found. Installing...");
    exec("npm install -g @ngrok/ngrok", (installError) => {
      if (installError) {
        console.error("Failed to install ngrok:", installError.message);
        process.exit(1);
      }
      console.log("✅ ngrok installed successfully");
      promptForAuthToken();
    });
  } else {
    console.log("✅ ngrok already installed");
    promptForAuthToken();
  }
});

function promptForAuthToken() {
  console.log("\n📝 Setup Steps:");
  console.log("1. Go to https://ngrok.com and create a free account");
  console.log(
    "2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
  );
  console.log("3. Run: ngrok config add-authtoken YOUR_TOKEN_HERE");
  console.log("4. Then run: npm run deploy:office");
  console.log("\n🔒 This creates a secure HTTPS tunnel for office access");
  console.log("💡 Your local Ollama AI keeps costs at $0/month!\n");
}

// Update package.json with deploy script
const packageJsonPath = path.join(__dirname, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  if (!packageJson.scripts) packageJson.scripts = {};

  packageJson.scripts["deploy:office"] =
    "node deploy-helper.js && deploy-with-ngrok.bat";
  packageJson.scripts["start:tunnel"] =
    'concurrently "npm start" "ngrok http 3000"';

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ Added deployment scripts to package.json");
}
