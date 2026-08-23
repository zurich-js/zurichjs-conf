#!/usr/bin/env node
/**
 * Copy the zxing WebAssembly reader into `public/` so the door station serves it
 * from our own origin.
 *
 * WHY NOT JUST LET THE LIBRARY FETCH IT
 * `barcode-detector`'s ponyfill defaults `locateFile` to jsDelivr. That means
 * the first scan on any iPhone — Safari has no native BarcodeDetector, so every
 * iPhone volunteer is on the ponyfill — depends on a third-party CDN being
 * reachable from the venue's wifi at the moment the doors open. A blocked or
 * slow CDN would leave those stations unable to scan at all, with no local
 * remedy. Same-origin means the asset comes from the host that already served
 * the page.
 *
 * WHY IT IS NOT COMMITTED
 * It is 1.1 MB of generated binary pinned to an exact zxing-wasm version. A
 * committed copy silently goes stale the moment the dependency is bumped, and
 * a mismatched module fails at instantiation. Copying at build time from the
 * installed tree keeps them in lockstep by construction.
 *
 * FAILURE IS FATAL ON PURPOSE
 * If this cannot find the file the build stops. A station that cannot scan is
 * worse than a deploy that did not go out, and the silent fallback here would be
 * exactly the CDN dependency this exists to remove.
 */

import { createRequire } from 'node:module';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);

const DESTINATION_DIR = path.join(process.cwd(), 'public', 'scanner');
const FILENAME = 'zxing_reader.wasm';

/**
 * Resolve through `barcode-detector` rather than from the project root: pnpm
 * gives it its own isolated `zxing-wasm`, and the copy has to be the exact
 * module that will be instantiated at runtime.
 */
function resolveWasm() {
  const ponyfill = require.resolve('barcode-detector/ponyfill');
  const scoped = createRequire(ponyfill);

  // zxing-wasm declares the binary as a real export, so ask for it by name
  // rather than guessing a path inside its dist tree.
  return scoped.resolve(`zxing-wasm/reader/${FILENAME}`);
}

async function main() {
  let source;
  try {
    source = resolveWasm();
  } catch (error) {
    throw new Error(
      `Could not resolve zxing-wasm through barcode-detector. Is "barcode-detector" installed? (${error.message})`
    );
  }

  const info = await stat(source).catch(() => null);
  if (!info?.isFile()) {
    throw new Error(`Expected the zxing reader module at ${source}, but it is not there.`);
  }

  await mkdir(DESTINATION_DIR, { recursive: true });
  const destination = path.join(DESTINATION_DIR, FILENAME);
  await copyFile(source, destination);

  const kb = Math.round(info.size / 1024);
  console.log(`✓ scanner: copied ${FILENAME} (${kb} KB) to public/scanner/`);
}

main().catch((error) => {
  console.error(`✗ scanner: ${error.message}`);
  console.error('  The door station would fall back to a third-party CDN. Refusing to continue.');
  process.exit(1);
});
