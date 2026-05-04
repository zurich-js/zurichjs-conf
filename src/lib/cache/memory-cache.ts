/**
 * Server-side in-memory TTL cache with request deduplication.
 *
 * On Vercel serverless, each warm function instance keeps its own cache.
 * The cache prevents redundant DB queries when multiple requests hit
 * the same instance within the TTL window.
 *
 * Request deduplication ensures that concurrent requests for the same
 * key share a single in-flight fetch (prevents thundering herd).
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Get a cached value if it exists and hasn't expired.
 */
function get<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

/**
 * Store a value in the cache with a TTL.
 */
function set<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Remove a specific key from the cache.
 */
function invalidate(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cached entries.
 */
function invalidateAll(): void {
  cache.clear();
}

/**
 * Fetch data with caching and in-flight request deduplication.
 *
 * - If the cache has a fresh entry, returns it immediately.
 * - If another request is already fetching the same key, awaits that promise.
 * - Otherwise, runs the fetcher, caches the result, and returns it.
 */
async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  // Check cache first
  const cached = get<T>(key);
  if (cached !== undefined) return cached;

  // Deduplicate concurrent requests
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher()
    .then((data) => {
      set(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export const memoryCache = {
  get,
  set,
  invalidate,
  invalidateAll,
  deduplicatedFetch,
};
