#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

// Clear environment variables that might cause issues
delete process.env.VITE_LEGACY;

// Start Vite with clean environment
const vite = spawn(
  "node",
  [
    path.join(__dirname, "node_modules", "vite", "bin", "vite.js"),
    "--force",
    "--clearScreen",
    "false",
  ],
  {
    stdio: "inherit",
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: "development",
      VITE_API_BASE_URL: "http://localhost:5000/api",
    },
  }
);

vite.on("close", (code) => {
  process.exit(code);
});
