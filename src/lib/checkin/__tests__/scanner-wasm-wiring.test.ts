import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The scanner's WebAssembly module is copied out of node_modules at build time
 * and served from our own origin. Three separate files have to agree for that to
 * hold, and if any one of them drifts the failure is SILENT: `barcode-detector`
 * falls back to fetching the module from jsDelivr, and the station keeps working
 * right up until the venue's wifi blocks the CDN with a queue at the door.
 *
 * Nothing else notices that. These assertions do.
 */

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');

describe('scanner wasm wiring', () => {
  it('serves the module from the path the copy script writes to', () => {
    const script = read('scripts/copy-scanner-wasm.mjs');
    const scanner = read('src/lib/checkin/scanner.ts');

    // Destination in the script: public/<dir>/<filename>
    expect(script).toContain("'public', 'scanner'");
    expect(script).toContain("const FILENAME = 'zxing_reader.wasm'");

    // And the URL the runtime asks for.
    expect(scanner).toContain("'/scanner/zxing_reader.wasm'");
  });

  it('runs the copy before both dev and build', () => {
    // A missing copy step means the fallback CDN, which is the whole thing this
    // machinery exists to avoid.
    const pkg: { scripts: Record<string, string> } = JSON.parse(read('package.json'));

    expect(pkg.scripts['scanner:wasm']).toContain('copy-scanner-wasm.mjs');
    expect(pkg.scripts.prebuild).toContain('scanner:wasm');
    expect(pkg.scripts.predev).toContain('scanner:wasm');
  });

  it('keeps the copied binary out of git', () => {
    // 1.1 MB of generated binary pinned to an exact zxing-wasm version. A
    // committed copy goes stale the moment the dependency is bumped, and a
    // mismatched module fails at instantiation.
    expect(read('.gitignore')).toMatch(/^\/public\/scanner\/$/m);
  });

  it('fails the build rather than falling back to the CDN', () => {
    const script = read('scripts/copy-scanner-wasm.mjs');
    expect(script).toContain('process.exit(1)');
  });
});
