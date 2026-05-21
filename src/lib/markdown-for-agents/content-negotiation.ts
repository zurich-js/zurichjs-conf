/**
 * Parse an HTTP Accept header and decide whether the caller prefers
 * `text/markdown` over `text/html`.
 *
 * Returns true when:
 *   - text/markdown is explicitly requested (any q > 0), AND
 *   - its q value is >= the highest q for text/html (or html is absent).
 *
 * Examples:
 *   "text/markdown"                            -> true
 *   "text/markdown, text/html"                 -> true (tie → markdown wins)
 *   "text/html, text/markdown;q=0.9"           -> false
 *   "text/markdown;q=0.9, text/html;q=0.8"     -> true
 *   "text/html, application/xhtml+xml, * /*"  -> false
 *   ""                                         -> false
 */
export function prefersMarkdown(acceptHeader: string | null | undefined): boolean {
  if (!acceptHeader) return false;

  const markdownQ = quality(acceptHeader, 'text/markdown');
  if (markdownQ <= 0) return false;

  const htmlQ = quality(acceptHeader, 'text/html');
  return markdownQ >= htmlQ;
}

function quality(acceptHeader: string, mediaType: string): number {
  const entries = acceptHeader.split(',');
  let best = 0;
  for (const raw of entries) {
    const parts = raw.trim().split(';').map((p) => p.trim());
    if (parts.length === 0) continue;
    const type = parts[0]?.toLowerCase();
    if (!type || type !== mediaType.toLowerCase()) continue;

    let q = 1;
    for (let i = 1; i < parts.length; i++) {
      const segment = parts[i];
      if (!segment) continue;
      const [k, v] = segment.split('=');
      if (k?.trim().toLowerCase() === 'q' && v !== undefined) {
        const parsed = Number.parseFloat(v.trim());
        if (Number.isFinite(parsed)) q = parsed;
      }
    }
    if (q > best) best = q;
  }
  return best;
}
