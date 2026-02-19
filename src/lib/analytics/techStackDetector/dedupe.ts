/**
 * Tech Stack Detection Deduplication
 *
 * Ensures detection runs at most once per browser session.
 * Uses sessionStorage for persistence and in-memory guard for fast checks.
 *
 * @module techStackDetector/dedupe
 */

import {
  SESSION_STORAGE_KEY,
  type SessionStorageData,
  type TechStackTraits,
} from './types';

/** In-memory guard to prevent double calls during fast boot */
let memoryGuard = false;

/** In-memory cache of the traits hash */
let cachedHash: string | null = null;

/**
 * Generates a stable hash from traits for comparison.
 * Uses a simple deterministic string hash.
 *
 * @param traits - Tech stack traits to hash
 * @returns Stable hash string
 *
 * @example
 * const hash = generateTraitsHash(traits);
 * // 'a1b2c3d4'
 */
export function generateTraitsHash(traits: TechStackTraits): string {
  // Create a deterministic string from traits (excluding debug_signals and version)
  const payload = {
    f: traits.framework_primary,
    s: traits.state_management.sort(),
    d: traits.data_layer.sort(),
    c: traits.confidence,
  };

  const str = JSON.stringify(payload);

  // Simple djb2 hash
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  // Convert to hex and ensure positive
  return (hash >>> 0).toString(16);
}

/**
 * Checks if detection has already run this session with the same result.
 *
 * @returns true if already detected and should skip, false to proceed
 *
 * @example
 * if (shouldSkipDetection()) {
 *   return; // Already detected this session
 * }
 */
export function shouldSkipDetection(): boolean {
  // Fast in-memory check
  if (memoryGuard) {
    return true;
  }

  // Check sessionStorage
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const data: SessionStorageData = JSON.parse(stored);
      if (data.detected_at && data.traits_hash) {
        cachedHash = data.traits_hash;
        return true;
      }
    }
  } catch {
    // sessionStorage unavailable or corrupt data - proceed with detection
  }

  return false;
}

/**
 * Checks if the new traits are different from the cached ones.
 * Used to determine if we should send a new event.
 *
 * @param traits - Newly detected traits
 * @returns true if traits are different or no previous detection
 *
 * @example
 * if (hasTraitsChanged(newTraits)) {
 *   sendToPosthog(newTraits);
 * }
 */
export function hasTraitsChanged(traits: TechStackTraits): boolean {
  const newHash = generateTraitsHash(traits);

  if (!cachedHash) {
    return true;
  }

  return cachedHash !== newHash;
}

/**
 * Marks detection as complete and stores the result.
 *
 * @param traits - Detected tech stack traits
 *
 * @example
 * markDetectionComplete(traits);
 */
export function markDetectionComplete(traits: TechStackTraits): void {
  memoryGuard = true;
  const hash = generateTraitsHash(traits);
  cachedHash = hash;

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    const data: SessionStorageData = {
      detected_at: new Date().toISOString(),
      traits_hash: hash,
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage unavailable or quota exceeded - memory guard still works
  }
}

/**
 * Resets the detection state. Only for testing.
 *
 * @example
 * // In tests:
 * resetDetectionState();
 */
export function resetDetectionState(): void {
  memoryGuard = false;
  cachedHash = null;

  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Forces detection to be allowed on next call.
 * Sets up state so the next detection will run.
 * Only for testing or explicit force scenarios.
 *
 * @example
 * // For testing:
 * allowNextDetection();
 * const traits = await detectTechStack();
 */
export function allowNextDetection(): void {
  memoryGuard = false;
  // Keep cachedHash to allow comparison
}
