"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

if (process.platform !== "win32") {
  console.log("Skipping Windows icon generation on non-Windows platform.");
  process.exit(0);
}

const rootDir = path.resolve(__dirname, "..");
const sourcePngPath = path.join(rootDir, "build", "icon.png");
const taskbarSourcePngPath = path.join(rootDir, "RU_iconForExe.png");
const outputIcoPath = path.join(rootDir, "build", "icon.ico");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "russraria-icon-"));
const sizes = [16, 24, 32, 40, 48, 64, 128, 256];

if (!fs.existsSync(sourcePngPath)) {
  console.error(`Source icon is missing: ${sourcePngPath}`);
  process.exit(1);
}

if (!fs.existsSync(taskbarSourcePngPath)) {
  console.error(`Taskbar icon source is missing: ${taskbarSourcePngPath}`);
  process.exit(1);
}

const resizeScriptPath = path.join(tempDir, "resize-icons.ps1");
const tempPngPaths = sizes.map((size) => path.join(tempDir, `icon-${size}.png`));

const resizeScript = `
Add-Type -AssemblyName System.Drawing
$sourceLarge = [System.Drawing.Bitmap]::FromFile("${sourcePngPath.replace(/\\/g, "\\\\")}")
$sourceSmall = [System.Drawing.Bitmap]::FromFile("${taskbarSourcePngPath.replace(/\\/g, "\\\\")}")
$sizes = @(${sizes.join(",")})
$outputs = @(${tempPngPaths.map((filePath) => `"${filePath.replace(/\\/g, "\\\\")}"`).join(",")})

for ($i = 0; $i -lt $sizes.Length; $i++) {
  $size = [int]$sizes[$i]
  $output = $outputs[$i]
  $source = if ($size -le 48) { $sourceSmall } else { $sourceLarge }
  $scale = [Math]::Min($size / $source.Width, $size / $source.Height)
  $drawWidth = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
  $drawHeight = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
  $offsetX = [int][Math]::Floor(($size - $drawWidth) / 2)
  $offsetY = [int][Math]::Floor(($size - $drawHeight) / 2)
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.DrawImage($source, $offsetX, $offsetY, $drawWidth, $drawHeight)
  $bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

$sourceLarge.Dispose()
$sourceSmall.Dispose()
`;

fs.writeFileSync(resizeScriptPath, resizeScript, "utf8");

const resizeResult = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resizeScriptPath],
  { cwd: rootDir, stdio: "inherit" }
);

if (resizeResult.status !== 0) {
  process.exit(resizeResult.status ?? 1);
}

const pngBuffers = tempPngPaths.map((filePath) => fs.readFileSync(filePath));
const iconCount = pngBuffers.length;
const header = Buffer.alloc(6 + iconCount * 16);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(iconCount, 4);

let offset = header.length;
for (let i = 0; i < iconCount; i += 1) {
  const size = sizes[i];
  const buffer = pngBuffers[i];
  const entryOffset = 6 + i * 16;
  header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 0);
  header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
  header.writeUInt8(0, entryOffset + 2);
  header.writeUInt8(0, entryOffset + 3);
  header.writeUInt16LE(1, entryOffset + 4);
  header.writeUInt16LE(32, entryOffset + 6);
  header.writeUInt32LE(buffer.length, entryOffset + 8);
  header.writeUInt32LE(offset, entryOffset + 12);
  offset += buffer.length;
}

fs.writeFileSync(outputIcoPath, Buffer.concat([header, ...pngBuffers]));
fs.rmSync(tempDir, { recursive: true, force: true });
console.log(`Generated multi-size Windows icon: ${path.relative(rootDir, outputIcoPath)}`);
