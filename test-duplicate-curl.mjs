import { spawn } from "child_process";
import fs from "fs";

async function testDuplicateDetection() {
  console.log("🧪 Testing duplicate detection system...");

  // Create a test image file
  const testImageContent = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG header
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1 pixel
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53,
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41,
    0x54,
    0x08,
    0x99,
    0x01,
    0x01,
    0x00,
    0x00,
    0xff,
    0xff,
    0x00,
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0x73,
    0x75,
    0x01,
    0x18,
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

  fs.writeFileSync("test-duplicate.png", testImageContent);
  console.log("📄 Created test image file");

  // First upload
  console.log("\n📤 First upload attempt...");
  const firstUpload = await uploadFile("test-duplicate.png");
  console.log("First upload result:", firstUpload);

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Second upload (should be blocked as duplicate)
  console.log("\n📤 Second upload attempt (should be blocked)...");
  const secondUpload = await uploadFile("test-duplicate.png");
  console.log("Second upload result:", secondUpload);

  // Cleanup
  fs.unlinkSync("test-duplicate.png");
  console.log("\n🧹 Cleaned up test files");
}

function uploadFile(filename) {
  return new Promise((resolve) => {
    const curl = spawn("curl", [
      "-X",
      "POST",
      "-F",
      `files=@${filename}`,
      "http://localhost:3000/api/upload",
    ]);

    let output = "";
    let error = "";

    curl.stdout.on("data", (data) => {
      output += data.toString();
    });

    curl.stderr.on("data", (data) => {
      error += data.toString();
    });

    curl.on("close", (code) => {
      if (code !== 0) {
        resolve(`Error (code ${code}): ${error}`);
      } else {
        try {
          const result = JSON.parse(output);
          resolve(result.message || result.error || JSON.stringify(result));
        } catch {
          resolve(output.substring(0, 200) + "...");
        }
      }
    });
  });
}

// Make sure server is running first
console.log("⚡ Make sure the dev server is running on http://localhost:3000");
console.log("⚡ Starting duplicate detection test in 3 seconds...\n");

setTimeout(testDuplicateDetection, 3000);
