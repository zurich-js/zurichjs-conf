/**
 * Browser Fingerprint for Discount PRNG Seeding
 *
 * Collects non-sensitive browser signals and hashes them into a 32-bit seed.
 * Uses FNV-1a hash — lightweight, no dependencies.
 */

/**
 * FNV-1a hash for strings → 32-bit unsigned integer
 */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Collect browser signals and produce a 32-bit seed.
 * Must run client-side only.
 */
export function getBrowserFingerprint(): number {
  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset().toString(),
  ].join('|');

  return fnv1a(signals);
}
