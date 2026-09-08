/** Remove campaign attribution while preserving functional query parameters. */
export function removeNetworkingUtm(href: string): string {
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return href;
    const keys = [...url.searchParams.keys()].filter((key) => /^utm_/i.test(key));
    if (keys.length === 0) return href;
    for (const key of keys) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return href;
  }
}
