/**
 * Token-count estimate for markdown bodies.
 *
 * Uses the well-known `chars / 4` heuristic that Anthropic and OpenAI both
 * publish as a rough proxy for English text. Good enough for dashboards
 * and the `x-markdown-tokens` response header; not used for billing.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
