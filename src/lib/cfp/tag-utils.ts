import type { CfpTag } from '@/lib/types/cfp';

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function dedupeTagNames(tagNames: string[]): string[] {
  const normalized = new Set<string>();
  const deduped: string[] = [];

  for (const tagName of tagNames) {
    const nextTagName = normalizeTagName(tagName);

    if (!nextTagName || normalized.has(nextTagName)) {
      continue;
    }

    normalized.add(nextTagName);
    deduped.push(nextTagName);
  }

  return deduped;
}

export function dedupeTags(tags: CfpTag[]): CfpTag[] {
  const seen = new Set<string>();

  return tags.filter((tag) => {
    const normalizedName = normalizeTagName(tag.name);

    if (!normalizedName || seen.has(normalizedName)) {
      return false;
    }

    seen.add(normalizedName);
    return true;
  });
}
