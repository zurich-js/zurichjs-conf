export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

/**
 * Content signal header per the emerging "Content Signals" framework.
 * Conference content is meant for AI training, search, and agent input.
 */
export const CONTENT_SIGNAL = 'ai-train=yes, search=yes, ai-input=yes';

/**
 * Render a YAML-frontmatter block. Keeps formatting deterministic so
 * snapshot tests don't flap and so agent output stays cacheable.
 */
export function frontmatter(record: Record<string, unknown>): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) continue;
    lines.push(...renderField(key, value, 0));
  }
  lines.push('---');
  return lines.join('\n');
}

function renderField(key: string, value: unknown, depth: number): string[] {
  const indent = '  '.repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${indent}${key}: []`];
    const isPrimitive = value.every(
      (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    );
    if (isPrimitive) {
      const inline = value.map(scalarToYaml).join(', ');
      return [`${indent}${key}: [${inline}]`];
    }
    const lines = [`${indent}${key}:`];
    for (const item of value) {
      if (item && typeof item === 'object') {
        const entries = Object.entries(item as Record<string, unknown>).filter(
          ([, v]) => v !== null && v !== undefined
        );
        if (entries.length === 0) continue;
        const [firstKey, firstVal] = entries[0]!;
        lines.push(`${indent}- ${firstKey}: ${scalarToYaml(firstVal)}`);
        for (let i = 1; i < entries.length; i++) {
          const [k, v] = entries[i]!;
          lines.push(`${indent}  ${k}: ${scalarToYaml(v)}`);
        }
      }
    }
    return lines;
  }
  if (value && typeof value === 'object') {
    const lines = [`${indent}${key}:`];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      lines.push(...renderField(k, v, depth + 1));
    }
    return lines;
  }
  return [`${indent}${key}: ${scalarToYaml(value)}`];
}

function scalarToYaml(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const str = String(value);
  // Quote anything that contains characters that have YAML semantics.
  if (/[:#&*!|>'"%@`,[\]{}]|^[\s-]|\s$/.test(str) || str === '') {
    return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * Format an ISO date string as a human-readable label, deterministic and
 * locale-stable (uses fixed `en-US`).
 */
export function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  // Treat YYYY-MM-DD as a calendar date in UTC to avoid TZ drift.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function absoluteUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL.replace(/\/$/, '')}${trimmed}`;
}

/**
 * Collapse repeated whitespace and trim. Used to normalize free-text fields
 * (abstracts, bios) so markdown output is compact.
 */
export function compactText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
