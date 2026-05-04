#!/bin/bash
#
# Image Optimization Script
# Compresses and converts images in public/images/meetups/ and public/images/team/
# to WebP format, significantly reducing file sizes.
#
# Prerequisites: npm install -D sharp
#
# Usage: bash scripts/optimize-images.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if sharp is available via Node
if ! node -e "require('sharp')" 2>/dev/null; then
  echo "Error: sharp is not installed. Run: npm install -D sharp"
  exit 1
fi

echo "=== Image Optimization ==="
echo ""

# Run the Node script for actual optimization
node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = '${PROJECT_DIR}';
const DIRS = [
  'public/images/meetups',
  'public/images/team',
];
const MAX_WIDTH = 2048;
const QUALITY = 80;
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(ext)) return null;

  const stats = fs.statSync(filePath);
  const originalSize = stats.size;

  // Skip small images (< 100KB)
  if (originalSize < 100 * 1024) return null;

  const outputPath = filePath.replace(/\.[^.]+$/, '.webp');

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let pipeline = image;
    if (metadata.width && metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
    }

    await pipeline
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    const savings = originalSize - newStats.size;
    const pct = ((savings / originalSize) * 100).toFixed(1);

    // Remove original if WebP is smaller
    if (newStats.size < originalSize) {
      fs.unlinkSync(filePath);
      console.log('  ' + path.relative(PROJECT_DIR, filePath) + ' -> .webp  (' + pct + '% smaller, saved ' + (savings / 1024 / 1024).toFixed(1) + 'MB)');
      return savings;
    } else {
      // Keep original, remove WebP
      fs.unlinkSync(outputPath);
      console.log('  ' + path.relative(PROJECT_DIR, filePath) + ' (kept original, WebP was larger)');
      return 0;
    }
  } catch (err) {
    console.error('  Error optimizing ' + filePath + ': ' + err.message);
    return 0;
  }
}

async function main() {
  let totalSaved = 0;
  let fileCount = 0;

  for (const dir of DIRS) {
    const fullDir = path.join(PROJECT_DIR, dir);
    if (!fs.existsSync(fullDir)) {
      console.log('Skipping ' + dir + ' (does not exist)');
      continue;
    }

    console.log('Processing ' + dir + '...');
    const files = fs.readdirSync(fullDir).map(f => path.join(fullDir, f));

    for (const file of files) {
      const saved = await optimizeImage(file);
      if (saved !== null) {
        totalSaved += saved;
        fileCount++;
      }
    }
  }

  console.log('');
  console.log('Done! Optimized ' + fileCount + ' files, saved ' + (totalSaved / 1024 / 1024).toFixed(1) + 'MB total.');
}

main().catch(err => { console.error(err); process.exit(1); });
"
