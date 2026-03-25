"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

if (process.platform !== "win32") {
  console.log("Skipping Windows executable icon patch on non-Windows platform.");
  process.exit(0);
}

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const iconPath = path.join(rootDir, "build", "icon.ico");
const rceditPath = path.join(rootDir, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");

if (!fs.existsSync(iconPath)) {
  console.warn(`Skipping executable icon patch because icon file is missing: ${iconPath}`);
  process.exit(0);
}

if (!fs.existsSync(rceditPath)) {
  console.warn(`Skipping executable icon patch because rcedit was not found: ${rceditPath}`);
  process.exit(0);
}

const candidateExePaths = [
  path.join(distDir, "win-unpacked", "Russraria.exe"),
  ...fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^Russraria.*\.exe$/i.test(entry.name))
    .map((entry) => path.join(distDir, entry.name)),
];

const exePaths = [...new Set(candidateExePaths)].filter((exePath) => fs.existsSync(exePath));
if (exePaths.length === 0) {
  console.log("Skipping executable icon patch because no Russraria executables were found.");
  process.exit(0);
}

for (const exePath of exePaths) {
  const result = spawnSync(rceditPath, [exePath, "--set-icon", iconPath], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(`Patched executable icon: ${path.relative(rootDir, exePath)}`);
}
