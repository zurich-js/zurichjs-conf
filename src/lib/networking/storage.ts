import type {
  PublicNetworkingProfile,
  SavedNetworkingProfile,
} from '@/lib/types/networking';

export const SAVED_NETWORKING_PROFILES_KEY = 'zjs:networking:saved:v1';

interface NetworkingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PROFILE_KINDS = new Set(['attendee', 'speaker', 'sponsor']);
const LINK_KINDS = new Set([
  'linkedin',
  'github',
  'x',
  'bluesky',
  'mastodon',
  'website',
  'email',
  'phone',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isSafeImageUrl(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value)))
  );
}

function isSafeLinkHref(value: unknown): value is string {
  return typeof value === 'string' && /^(https?:\/\/|mailto:|tel:)/i.test(value);
}

function isSavedLink(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    LINK_KINDS.has(value.kind) &&
    typeof value.label === 'string' &&
    value.label.trim().length > 0 &&
    isSafeLinkHref(value.href)
  );
}

function isSavedNetworkingProfile(value: unknown): value is SavedNetworkingProfile {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.publicId === 'string' &&
    value.publicId.trim().length > 0 &&
    typeof value.kind === 'string' &&
    PROFILE_KINDS.has(value.kind) &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    isNullableString(value.headline) &&
    isSafeImageUrl(value.imageUrl) &&
    Array.isArray(value.links) &&
    value.links.length <= 20 &&
    value.links.every(isSavedLink) &&
    typeof value.path === 'string' &&
    value.path.startsWith('/share/') &&
    typeof value.savedAt === 'string' &&
    value.savedAt.length > 0
  );
}

function browserStorage(): NetworkingStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function writeProfiles(
  profiles: SavedNetworkingProfile[],
  storage: NetworkingStorage | null
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVED_NETWORKING_PROFILES_KEY, JSON.stringify(profiles));
    return true;
  } catch {
    return false;
  }
}

export function parseSavedNetworkingProfiles(raw: string | null): SavedNetworkingProfile[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return dedupeSavedNetworkingProfiles(parsed.filter(isSavedNetworkingProfile));
  } catch {
    return [];
  }
}

export function dedupeSavedNetworkingProfiles(
  profiles: SavedNetworkingProfile[]
): SavedNetworkingProfile[] {
  const seen = new Set<string>();
  return profiles.filter((profile) => {
    if (seen.has(profile.publicId)) return false;
    seen.add(profile.publicId);
    return true;
  });
}

export function removeSavedNetworkingProfile(
  profiles: SavedNetworkingProfile[],
  publicId: string
): SavedNetworkingProfile[] {
  return profiles.filter((profile) => profile.publicId !== publicId);
}

export function loadSavedNetworkingProfiles(
  storage: NetworkingStorage | null = browserStorage()
): SavedNetworkingProfile[] {
  if (!storage) return [];
  try {
    return parseSavedNetworkingProfiles(storage.getItem(SAVED_NETWORKING_PROFILES_KEY));
  } catch {
    return [];
  }
}

export function saveNetworkingProfile(
  profile: PublicNetworkingProfile,
  storage: NetworkingStorage | null = browserStorage(),
  savedAt = new Date().toISOString()
): boolean {
  const snapshot: SavedNetworkingProfile = {
    ...profile,
    links: profile.links.map((link) => ({ ...link })),
    savedAt,
    version: 1,
  };
  const current = loadSavedNetworkingProfiles(storage);
  return writeProfiles(dedupeSavedNetworkingProfiles([snapshot, ...current]), storage);
}

export function deleteSavedNetworkingProfile(
  publicId: string,
  storage: NetworkingStorage | null = browserStorage()
): SavedNetworkingProfile[] | null {
  const next = removeSavedNetworkingProfile(loadSavedNetworkingProfiles(storage), publicId);
  return writeProfiles(next, storage) ? next : null;
}

export function clearSavedNetworkingProfiles(
  storage: NetworkingStorage | null = browserStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(SAVED_NETWORKING_PROFILES_KEY);
    return true;
  } catch {
    return false;
  }
}
