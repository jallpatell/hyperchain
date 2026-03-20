#!/usr/bin/env node

// Remote development script for Hyperchain
// Usage: node scripts/dev-remote.js

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  HOST: "0.0.0.0",
  PORT: "5000",
  VITE_PORT: "8000",
  IP: "172.16.1.123",
};

console.log("🚀 Starting Hyperchain in remote mode...");
console.log(`📡 Server will be accessible at: http://${CONFIG.IP}:${CONFIG.PORT}`);
console.log(`🔧 Vite dev server: http://${CONFIG.IP}:${CONFIG.VITE_PORT}`);
console.log("");

// Set environment variables
const env = {
  ...process.env,
  NODE_ENV: "development",
  HOST: CONFIG.HOST,
  PORT: CONFIG.PORT,
  VITE_PORT: CONFIG.VITE_PORT,
};

// Start development server
const child = spawn("tsx", ["server/index.ts"], {
  env,
  stdio: "inherit",
  shell: true,
  cwd: path.resolve(__dirname, ".."),
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});

child.on("exit", (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code ?? 0);
});

child.on("error", (err) => {
  console.error("❌ Failed to start server:", err);
});
