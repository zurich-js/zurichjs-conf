import type { BadgeEntry } from '@/lib/badges/export';

export interface BadgeEntryOverride {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
}

export function applyBadgeEntryOverrides(
  entries: BadgeEntry[],
  overrides: ReadonlyMap<string, BadgeEntryOverride> | undefined
): BadgeEntry[] {
  if (!overrides?.size) return entries;
  return entries.map((entry) => {
    const override = overrides.get(entry.selectionId);
    return override ? { ...entry, ...override } : entry;
  });
}

export function applyBadgeLabelOverrides(
  entries: BadgeEntry[],
  overrides: ReadonlyMap<string, string> | undefined
): BadgeEntry[] {
  if (!overrides?.size) return entries;
  return entries.map((entry) => {
    const label = overrides.get(entry.selectionId)?.trim();
    return label ? { ...entry, label } : entry;
  });
}
