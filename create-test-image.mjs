// Test image upload to verify the screenshot upload functionality is working
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple test image (1x1 pixel PNG) in base64
const testImageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const testImageBuffer = Buffer.from(testImageBase64, "base64");

// Save as test image
const testImagePath = path.join(__dirname, "test-screenshot.png");
fs.writeFileSync(testImagePath, testImageBuffer);

console.log("✅ Test screenshot created:", testImagePath);
console.log("📁 File size:", fs.statSync(testImagePath).size, "bytes");
console.log("");
console.log("🧪 TO TEST UPLOAD FUNCTIONALITY:");
console.log(
  "1. Open: https://specialistic-annabella-unsabled.ngrok-free.dev/upload"
);
console.log("2. Upload the test-screenshot.png file");
console.log("3. Check if processing completes successfully");
console.log("");
console.log("🚀 Your client can now access the full dashboard at:");
console.log("   https://specialistic-annabella-unsabled.ngrok-free.dev");
