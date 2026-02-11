/**
 * Mulberry32 PRNG
 *
 * Deterministic pseudo-random number generator seeded by browser fingerprint.
 * Returns values in [0, 1). Sufficient for a weighted coin flip.
 */

/**
 * Mulberry32: fast 32-bit PRNG, returns a function that yields [0, 1)
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Determine if the visitor should see the discount popup.
 * Returns true with the given probability (0–1).
 */
export function shouldShowDiscount(seed: number, probability: number): boolean {
  const rng = mulberry32(seed);
  return rng() < probability;
}
