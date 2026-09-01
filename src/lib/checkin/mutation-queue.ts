/**
 * The offline write queue for a door station.
 *
 * WHY THIS EXISTS
 * The read path never touches the network — the roster is prefetched and every
 * scan resolves from memory. Writes cannot work that way: an admission has to
 * reach the database or it never happened. But a foyer full of 300 phones is the
 * worst wifi you will meet all year, and a volunteer cannot hold a queue while a
 * spinner turns. So a write is acknowledged locally the instant it is taken and
 * this queue is responsible for getting it there.
 *
 * WHY REPLAY IS SAFE
 * `door_check_in` is a conditional UPDATE and `duplicate` is a first-class 200
 * outcome, not an error. If a flush dies after the server committed but before
 * the client saw the response, the retry costs one `duplicate` — never a second
 * admission, never a double count in the dashboard. That property is what makes
 * an at-least-once queue acceptable here; without it this file would be a bug.
 *
 * WHY sessionStorage
 * Two reasons, and both matter. It survives the reload that a phone browser will
 * inflict on a backgrounded tab, which localStorage would also do; but it does
 * NOT survive the tab closing, so attendee ids do not linger on a volunteer's
 * personal phone after their shift. Durability is scoped to exactly the window
 * the organisers asked for.
 *
 * WHY EVERY ENTRY CARRIES A staffId
 * The audit trail is the deliverable here, not a side effect. If one volunteer
 * hands the phone to the next and the queue flushed whatever was pending, the
 * first person's admissions would be recorded against the second. Entries are
 * stored per staff id and a flush refuses anything that is not its own.
 */

import { logger } from '@/lib/logger';

const log = logger.scope('Door Queue');

export type DoorMutationKind = 'check_in' | 'manual_admit' | 'goodie';

/**
 * The three writes a station can make, as a discriminated union so a payload
 * cannot be built without the fields its endpoint requires — a manual admission
 * without a reason is rejected by both the schema and the database.
 */
export type DoorMutationPayload =
  | { kind: 'check_in'; scannedId: string; station?: string }
  | { kind: 'manual_admit'; scannedId: string; reason: string; station?: string }
  | { kind: 'goodie'; ticketId: string; note?: string; station?: string };

export interface DoorQueuedMutation {
  /** Client-generated, so a log line can be followed across retries. */
  id: string;
  payload: DoorMutationPayload;
  /**
   * When the door event actually happened — stamped at enqueue, not at flush.
   * A person admitted at 08:31 whose write lands at 08:47 must appear in the
   * audit trail at 08:31, or the arrival curve the organisers plan against is
   * fiction.
   */
  occurredAt: string;
  /** Whose action this is. A flush under a different identity is refused. */
  staffId: string;
  attempts: number;
  /** Last transport or server message, surfaced in the station's queue panel. */
  lastError: string | null;
}

const ENDPOINTS: Record<DoorMutationKind, string> = {
  check_in: '/api/checkin/check-in',
  manual_admit: '/api/checkin/manual-admit',
  goodie: '/api/checkin/goodie',
};

/**
 * Cap the queue. Past this the oldest entry is dropped and reported rather than
 * left to grow: a sessionStorage write that exceeds quota throws, and on iOS
 * that would take down the station rather than one check-in. 500 is more writes
 * than a single station makes in a whole shift, so reaching it means something
 * is badly wrong and the volunteer needs to be told, loudly.
 */
export const DOOR_QUEUE_LIMIT = 500;

/**
 * Give up on an entry after this many failures. Not because the write stops
 * mattering, but because an entry retried forever hides the ones that could
 * still succeed — and a stuck entry needs a human, which is what the queue panel
 * is for.
 */
export const DOOR_QUEUE_MAX_ATTEMPTS = 8;

const STORAGE_PREFIX = 'zjs.door.queue.';

/** Keyed per staff member so two volunteers on one tab cannot inherit each other's writes. */
function storageKey(staffId: string): string {
  return `${STORAGE_PREFIX}${staffId}`;
}

/**
 * MEMORY IS AUTHORITATIVE; sessionStorage IS A MIRROR.
 *
 * The obvious design — read and write sessionStorage directly — turns the queue
 * into a black hole exactly where it is needed most. A Safari private window
 * throws on the `sessionStorage` accessor itself, and iOS has historically given
 * private tabs a zero-byte quota so every `setItem` throws. In either case a
 * direct-to-storage queue would accept a check-in, store nothing, read back an
 * empty queue and never send it. The volunteer would see green and the attendee
 * would never be admitted.
 *
 * So the queue lives in memory and storage is written through for one purpose
 * only: surviving the reload a phone browser inflicts on a backgrounded tab.
 * Losing the mirror costs reload-survival; it never costs a write.
 */
const memory = new Map<string, DoorQueuedMutation[]>();

function getStorage(): Storage | null {
  // Never touched at import time: this module is imported during SSR, and the
  // accessor itself throws in a Safari private window.
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Drop the in-memory mirror without touching storage.
 *
 * For tests, and for a hard identity switch where the next read must come from
 * storage rather than from whatever the previous volunteer left in memory. NOT
 * for logout: that would discard unsent writes, which is the one thing this
 * module exists to prevent.
 */
export function resetQueueCache(): void {
  memory.clear();
}

function isQueuedMutation(value: unknown): value is DoorQueuedMutation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DoorQueuedMutation>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.staffId === 'string' &&
    typeof candidate.attempts === 'number' &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null &&
    typeof (candidate.payload as DoorMutationPayload).kind === 'string' &&
    (candidate.payload as DoorMutationPayload).kind in ENDPOINTS
  );
}

function hydrate(staffId: string): DoorQueuedMutation[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(storageKey(staffId));
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // A malformed entry is discarded rather than allowed to throw mid-flush and
    // strand every valid entry behind it.
    return parsed.filter(isQueuedMutation);
  } catch {
    log.warn('Discarding an unreadable door queue');
    storage.removeItem(storageKey(staffId));
    return [];
  }
}

export function readQueue(staffId: string): DoorQueuedMutation[] {
  const held = memory.get(staffId);
  if (held) return held;

  const hydrated = hydrate(staffId);
  memory.set(staffId, hydrated);
  return hydrated;
}

function writeQueue(staffId: string, entries: DoorQueuedMutation[]): void {
  memory.set(staffId, entries);

  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(storageKey(staffId), JSON.stringify(entries));
  } catch (error) {
    // Out of quota, or a private tab that allows no writes. The queue itself is
    // unaffected — only its ability to survive a reload — but say so, because a
    // station that then gets reloaded loses whatever was pending.
    log.error('Could not mirror the door queue to storage', error, {
      pending: entries.length,
    });
  }
}

export function clearQueue(staffId: string): void {
  memory.delete(staffId);
  getStorage()?.removeItem(storageKey(staffId));
}

/** Every queue on this device, for the "you have unsent writes" check at login. */
export function queuedStaffIds(): string[] {
  const ids = new Set<string>();

  for (const [staffId, entries] of memory) {
    if (entries.length > 0) ids.add(staffId);
  }

  const storage = getStorage();
  if (storage) {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) ids.add(key.slice(STORAGE_PREFIX.length));
    }
  }

  return [...ids];
}

export interface EnqueueOptions {
  staffId: string;
  payload: DoorMutationPayload;
  /** Injectable for tests; defaults to the real clock. */
  now?: () => Date;
  /** Injectable for tests; defaults to crypto.randomUUID. */
  makeId?: () => string;
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Only reached on a browser without randomUUID. The id is for correlation in
  // logs, not for security, so a counter-free fallback is adequate.
  return `q-${Date.now().toString(36)}-${(fallbackCounter += 1).toString(36)}`;
}

let fallbackCounter = 0;

/**
 * Add a write to the queue and return the entry.
 *
 * Returns the entry rather than void so the caller can render it immediately —
 * the whole point is that the volunteer sees the outcome before the network is
 * consulted.
 */
export function enqueue({
  staffId,
  payload,
  now = () => new Date(),
  makeId = defaultId,
}: EnqueueOptions): DoorQueuedMutation {
  const entry: DoorQueuedMutation = {
    id: makeId(),
    payload,
    occurredAt: now().toISOString(),
    staffId,
    attempts: 0,
    lastError: null,
  };

  const entries = readQueue(staffId);
  entries.push(entry);

  if (entries.length > DOOR_QUEUE_LIMIT) {
    const dropped = entries.splice(0, entries.length - DOOR_QUEUE_LIMIT);
    log.error('Door queue overflowed; dropped the oldest writes', undefined, {
      dropped: dropped.length,
      staffId,
    });
  }

  writeQueue(staffId, entries);
  return entry;
}

/** What a single POST attempt told us. */
export type FlushDisposition =
  | { status: 'sent'; body: unknown }
  /** Worth trying again: offline, a 5xx, a 429. */
  | { status: 'retry'; message: string }
  /** Will never succeed: a 400, a 403, a revoked volunteer. Stop and surface it. */
  | { status: 'terminal'; message: string };

export type DoorMutationTransport = (
  url: string,
  body: Record<string, unknown>
) => Promise<FlushDisposition>;

/**
 * The default transport.
 *
 * Retryable and terminal are separated deliberately. A 400 means the payload is
 * wrong and no amount of waiting fixes it; a 403 means the volunteer was
 * deactivated mid-shift. Retrying either forever would bury the entries that
 * could still land, and the station would look busy while going nowhere.
 */
export const fetchTransport: DoorMutationTransport = async (url, body) => {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Almost always "the wifi went away". Exactly what the queue is for.
    return { status: 'retry', message: error instanceof Error ? error.message : 'Network error' };
  }

  if (response.ok) {
    try {
      return { status: 'sent', body: await response.json() };
    } catch {
      // The write committed; only the body was unreadable. Not worth a replay.
      return { status: 'sent', body: null };
    }
  }

  const message = await readError(response);

  // 408/425/429 and 5xx are transient — same classification as @/lib/retry.
  if (response.status === 408 || response.status === 425 || response.status === 429) {
    return { status: 'retry', message };
  }
  if (response.status >= 500) {
    return { status: 'retry', message };
  }
  return { status: 'terminal', message };
};

async function readError(response: Response): Promise<string> {
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const value = (parsed as { error: unknown }).error;
      if (typeof value === 'string') return value;
    }
  } catch {
    // Fall through to the status text.
  }
  return `${response.status} ${response.statusText}`.trim();
}

export interface FlushResult {
  sent: DoorQueuedMutation[];
  /** Entries that exhausted their attempts or were refused outright. */
  failed: Array<{ entry: DoorQueuedMutation; message: string }>;
  /** Still queued, to be tried on the next flush. */
  pending: number;
  /** Server responses in send order, so the caller can fold them into the cache. */
  responses: unknown[];
}

export interface FlushOptions {
  staffId: string;
  transport?: DoorMutationTransport;
}

function toBody(entry: DoorQueuedMutation): Record<string, unknown> {
  const { kind, ...rest } = entry.payload;
  void kind;
  return { ...rest, occurredAt: entry.occurredAt };
}

/**
 * Drain the queue, oldest first.
 *
 * SERIAL ON PURPOSE. The bottleneck is a single phone's uplink, so parallel
 * posts buy nothing, and stopping at the first retryable failure means an
 * offline station makes one doomed request per flush instead of 40 — which is
 * also what stops it hammering the API the moment connectivity flickers.
 */
export async function flushQueue({
  staffId,
  transport = fetchTransport,
}: FlushOptions): Promise<FlushResult> {
  const entries = readQueue(staffId);
  const sent: DoorQueuedMutation[] = [];
  const failed: FlushResult['failed'] = [];
  const responses: unknown[] = [];

  let index = 0;
  for (; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;

    if (entry.staffId !== staffId) {
      // Cannot happen through enqueue, which keys storage by staff id. Guarded
      // anyway: attributing one volunteer's admission to another corrupts the
      // audit trail, which is the one thing here that cannot be reconstructed.
      failed.push({ entry, message: 'Queued by a different volunteer' });
      continue;
    }

    const disposition = await transport(ENDPOINTS[entry.payload.kind], toBody(entry));

    if (disposition.status === 'sent') {
      sent.push(entry);
      responses.push(disposition.body);
      continue;
    }

    entry.attempts += 1;
    entry.lastError = disposition.message;

    if (disposition.status === 'terminal') {
      failed.push({ entry, message: disposition.message });
      continue;
    }

    if (entry.attempts >= DOOR_QUEUE_MAX_ATTEMPTS) {
      failed.push({ entry, message: disposition.message });
      continue;
    }

    // Retryable and still has attempts left. Stop here — the next entry faces
    // the same broken network, so trying it now just burns battery.
    break;
  }

  const settled = new Set([...sent, ...failed.map((f) => f.entry)].map((e) => e.id));
  const remaining = entries.filter((entry) => !settled.has(entry.id));

  if (remaining.length === 0) {
    clearQueue(staffId);
  } else {
    writeQueue(staffId, remaining);
  }

  if (sent.length > 0 || failed.length > 0) {
    log.info('Door queue flushed', {
      staffId,
      sent: sent.length,
      failed: failed.length,
      pending: remaining.length,
    });
  }

  return { sent, failed, pending: remaining.length, responses };
}
