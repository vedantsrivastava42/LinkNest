/**
 * Post-build script for Chrome extension.
 * Copies static assets (manifest.json, icons) into the dist folder.
 */

import { copyFileSync, cpSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extDir = resolve(__dirname, ".."); // extension/ root
const distDir = resolve(extDir, "dist");

// Ensure dist exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json
copyFileSync(
  resolve(extDir, "manifest.json"),
  resolve(distDir, "manifest.json")
);

// Copy icons
cpSync(resolve(extDir, "icons"), resolve(distDir, "icons"), {
  recursive: true,
});

console.log("✓ Extension static assets copied to dist/");
