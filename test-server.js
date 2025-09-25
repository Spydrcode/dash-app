const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    <html>
      <body>
        <h1>Test Server Working!</h1>
        <p>Time: ${new Date().toISOString()}</p>
        <p>This confirms port 3000 binding works</p>
      </body>
    </html>
  `);
});

server.listen(3000, "127.0.0.1", () => {
  console.log("✅ Test server running on http://127.0.0.1:3000");
});

server.on("error", (err) => {
  console.error("❌ Server error:", err);
});
