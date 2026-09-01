import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DOOR_QUEUE_LIMIT,
  DOOR_QUEUE_MAX_ATTEMPTS,
  clearQueue,
  enqueue,
  flushQueue,
  queuedStaffIds,
  readQueue,
  resetQueueCache,
  type DoorMutationTransport,
} from '../mutation-queue';

const STAFF = 'staff-1';
const OTHER_STAFF = 'staff-2';
const TICKET = '11111111-1111-4111-8111-111111111111';

/**
 * The environment is node, so there is no sessionStorage. A minimal in-memory
 * Storage is enough and lets a test simulate a quota failure, which is the
 * interesting branch — iOS throws there and it must not take the station down.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('quota', 'QuotaExceededError');
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('window', { sessionStorage: storage });
  // The queue is authoritative in module memory; storage is only a mirror. Tests
  // that reach past the API into storage must reset the mirror to be re-read.
  resetQueueCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const now = () => new Date('2026-09-11T08:31:00.000Z');
let ids = 0;
const makeId = () => `id-${(ids += 1)}`;

function queueCheckIn(overrides: { staffId?: string; scannedId?: string } = {}) {
  return enqueue({
    staffId: overrides.staffId ?? STAFF,
    payload: { kind: 'check_in', scannedId: overrides.scannedId ?? TICKET, station: 'Door A' },
    now,
    makeId,
  });
}

function transportThat(...dispositions: Awaited<ReturnType<DoorMutationTransport>>[]) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  let index = 0;
  const transport: DoorMutationTransport = async (url, body) => {
    calls.push({ url, body });
    const disposition = dispositions[Math.min(index, dispositions.length - 1)];
    index += 1;
    return disposition ?? { status: 'sent', body: null };
  };
  return { transport, calls };
}

// ─────────────────────────────────────────────────────────────────────────────
// enqueue
// ─────────────────────────────────────────────────────────────────────────────

describe('enqueue', () => {
  it('stamps the time the door event happened, not the time it is sent', () => {
    // A person admitted at 08:31 whose write lands at 08:47 must appear in the
    // audit trail at 08:31, or the arrival curve is fiction.
    const entry = queueCheckIn();

    expect(entry.occurredAt).toBe('2026-09-11T08:31:00.000Z');
    expect(entry.attempts).toBe(0);
    expect(entry.lastError).toBeNull();
  });

  it('survives the reload a phone inflicts on a backgrounded tab', () => {
    queueCheckIn();
    // Dropping the in-memory mirror is what a reload does. The write has to come
    // back from storage, or a tab the OS recycled loses the queue.
    resetQueueCache();

    const recovered = readQueue(STAFF);
    expect(recovered).toHaveLength(1);
    expect(recovered[0]?.payload).toMatchObject({ kind: 'check_in', scannedId: TICKET });
    expect(recovered[0]?.occurredAt).toBe('2026-09-11T08:31:00.000Z');
  });

  it('does not survive the tab closing, so attendee ids do not linger', () => {
    // sessionStorage, not localStorage: durability is scoped to the shift, and a
    // volunteer's personal phone keeps nothing afterwards.
    queueCheckIn();
    storage.clear();
    resetQueueCache();

    expect(readQueue(STAFF)).toEqual([]);
  });

  it('keeps each volunteer’s writes separate', () => {
    queueCheckIn({ staffId: STAFF });
    queueCheckIn({ staffId: OTHER_STAFF });

    expect(readQueue(STAFF)).toHaveLength(1);
    expect(readQueue(OTHER_STAFF)).toHaveLength(1);
    expect(queuedStaffIds().sort()).toEqual([STAFF, OTHER_STAFF].sort());
  });

  it('drops the oldest rather than letting storage overflow', () => {
    for (let i = 0; i < DOOR_QUEUE_LIMIT + 3; i += 1) {
      queueCheckIn({ scannedId: TICKET });
    }
    const queue = readQueue(STAFF);

    expect(queue).toHaveLength(DOOR_QUEUE_LIMIT);
    // The three oldest went; the newest survived.
    expect(queue[0]?.id).not.toBe('id-1');
  });

  it('keeps the write when storage refuses it', () => {
    // iOS gives a private tab a zero-byte quota, so every setItem throws. Losing
    // durability is acceptable; losing the check-in is not.
    storage.failWrites = true;
    queueCheckIn();

    expect(readQueue(STAFF)).toHaveLength(1);
  });

  it('still queues with no storage at all', () => {
    // A Safari private window throws on the sessionStorage accessor itself. If
    // that lost the write, the volunteer would see green and the attendee would
    // never be admitted — the one failure this module exists to prevent.
    vi.stubGlobal('window', undefined);
    resetQueueCache();

    queueCheckIn();
    expect(readQueue(STAFF)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// readQueue
// ─────────────────────────────────────────────────────────────────────────────

describe('readQueue', () => {
  it('discards unreadable JSON instead of throwing at the door', () => {
    storage.setItem(`zjs.door.queue.${STAFF}`, '{not json');
    resetQueueCache();

    expect(readQueue(STAFF)).toEqual([]);
    // And clears it, so the next write starts clean.
    expect(storage.getItem(`zjs.door.queue.${STAFF}`)).toBeNull();
  });

  it('drops a malformed entry but keeps the valid ones behind it', () => {
    queueCheckIn();
    const good = readQueue(STAFF)[0];
    storage.setItem(`zjs.door.queue.${STAFF}`, JSON.stringify([{ nonsense: true }, good]));
    resetQueueCache();

    expect(readQueue(STAFF)).toHaveLength(1);
    expect(readQueue(STAFF)[0]?.id).toBe(good?.id);
  });

  it('rejects an entry naming an endpoint that does not exist', () => {
    queueCheckIn();
    const good = readQueue(STAFF)[0];
    storage.setItem(
      `zjs.door.queue.${STAFF}`,
      JSON.stringify([{ ...good, payload: { kind: 'delete_everything' } }])
    );
    resetQueueCache();

    expect(readQueue(STAFF)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// flushQueue
// ─────────────────────────────────────────────────────────────────────────────

describe('flushQueue', () => {
  it('posts each kind to its own endpoint with occurredAt attached', async () => {
    enqueue({ staffId: STAFF, payload: { kind: 'check_in', scannedId: TICKET }, now, makeId });
    enqueue({
      staffId: STAFF,
      payload: { kind: 'manual_admit', scannedId: TICKET, reason: 'Blank badge' },
      now,
      makeId,
    });
    enqueue({ staffId: STAFF, payload: { kind: 'goodie', ticketId: TICKET, note: 'No M left' }, now, makeId });

    const { transport, calls } = transportThat({ status: 'sent', body: { outcome: 'applied' } });
    const result = await flushQueue({ staffId: STAFF, transport });

    expect(calls.map((c) => c.url)).toEqual([
      '/api/checkin/check-in',
      '/api/checkin/manual-admit',
      '/api/checkin/goodie',
    ]);
    // `kind` is routing metadata, not part of the request body.
    expect(calls[0]?.body).toEqual({ scannedId: TICKET, occurredAt: '2026-09-11T08:31:00.000Z' });
    expect(calls[1]?.body).toMatchObject({ reason: 'Blank badge' });
    expect(calls[2]?.body).toMatchObject({ ticketId: TICKET, note: 'No M left' });

    expect(result.sent).toHaveLength(3);
    expect(result.pending).toBe(0);
    expect(readQueue(STAFF)).toEqual([]);
  });

  it('hands back the server responses so the caller can fold them into the cache', async () => {
    queueCheckIn();
    const { transport } = transportThat({ status: 'sent', body: { outcome: 'duplicate' } });

    const result = await flushQueue({ staffId: STAFF, transport });
    expect(result.responses).toEqual([{ outcome: 'duplicate' }]);
  });

  it('stops at the first offline failure instead of making 40 doomed requests', async () => {
    // The next entry faces the same broken network. Trying it burns battery and
    // hammers the API the instant connectivity flickers.
    queueCheckIn();
    queueCheckIn();
    queueCheckIn();

    const { transport, calls } = transportThat({ status: 'retry', message: 'Failed to fetch' });
    const result = await flushQueue({ staffId: STAFF, transport });

    expect(calls).toHaveLength(1);
    expect(result.sent).toHaveLength(0);
    expect(result.pending).toBe(3);
    expect(readQueue(STAFF)[0]?.attempts).toBe(1);
    expect(readQueue(STAFF)[0]?.lastError).toBe('Failed to fetch');
  });

  it('keeps the entries that landed before the network died', async () => {
    queueCheckIn();
    queueCheckIn();

    const { transport } = transportThat(
      { status: 'sent', body: null },
      { status: 'retry', message: 'offline' }
    );
    const result = await flushQueue({ staffId: STAFF, transport });

    expect(result.sent).toHaveLength(1);
    expect(result.pending).toBe(1);
    expect(readQueue(STAFF)).toHaveLength(1);
  });

  it('drops a refused write and carries on with the next', async () => {
    // A 403 means the volunteer was deactivated mid-shift; a 400 means the
    // payload is wrong. Neither improves with waiting, and retrying forever
    // would bury the writes that could still land.
    queueCheckIn();
    queueCheckIn();

    const { transport, calls } = transportThat(
      { status: 'terminal', message: 'Unauthorized' },
      { status: 'sent', body: null }
    );
    const result = await flushQueue({ staffId: STAFF, transport });

    expect(calls).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.message).toBe('Unauthorized');
    expect(result.sent).toHaveLength(1);
    expect(readQueue(STAFF)).toEqual([]);
  });

  it('gives up on an entry after its attempts run out', async () => {
    queueCheckIn();
    const { transport } = transportThat({ status: 'retry', message: 'offline' });

    for (let i = 0; i < DOOR_QUEUE_MAX_ATTEMPTS - 1; i += 1) {
      const result = await flushQueue({ staffId: STAFF, transport });
      expect(result.pending).toBe(1);
    }

    const last = await flushQueue({ staffId: STAFF, transport });
    expect(last.failed).toHaveLength(1);
    expect(last.failed[0]?.entry.attempts).toBe(DOOR_QUEUE_MAX_ATTEMPTS);
    expect(readQueue(STAFF)).toEqual([]);
  });

  it('refuses to send another volunteer’s write under this identity', async () => {
    // Attributing one volunteer's admission to another corrupts the audit trail,
    // which is the one thing here that cannot be reconstructed afterwards.
    queueCheckIn();
    const entry = readQueue(STAFF)[0];
    storage.setItem(
      `zjs.door.queue.${STAFF}`,
      JSON.stringify([{ ...entry, staffId: OTHER_STAFF }])
    );
    resetQueueCache();

    const { transport, calls } = transportThat({ status: 'sent', body: null });
    const result = await flushQueue({ staffId: STAFF, transport });

    expect(calls).toHaveLength(0);
    expect(result.failed[0]?.message).toBe('Queued by a different volunteer');
    expect(readQueue(STAFF)).toEqual([]);
  });

  it('is a no-op on an empty queue', async () => {
    const { transport, calls } = transportThat({ status: 'sent', body: null });
    const result = await flushQueue({ staffId: STAFF, transport });

    expect(calls).toHaveLength(0);
    expect(result).toMatchObject({ sent: [], failed: [], pending: 0 });
  });
});

describe('clearQueue', () => {
  it('removes only that volunteer’s queue', () => {
    queueCheckIn({ staffId: STAFF });
    queueCheckIn({ staffId: OTHER_STAFF });

    clearQueue(STAFF);

    expect(readQueue(STAFF)).toEqual([]);
    expect(readQueue(OTHER_STAFF)).toHaveLength(1);
  });
});
