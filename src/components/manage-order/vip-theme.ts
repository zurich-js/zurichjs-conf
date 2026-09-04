/**
 * VIP accent recipe for the light-theme manage-order cards.
 *
 * Built from the brand-orange tokens (the `--color-vip` family that
 * `Button variant="accent"`, `Icon color="accent"` and the VIP `FeatureList`
 * tone already use) so every VIP surface on the page matches.
 *
 * Contrast note: `text-brand-orange-dark` (#cc4b18) clears AA on white (4.6:1)
 * but not on `brand-gray-lightest` (#EDEDEF, 3.9:1) — which is why accent text
 * always lives inside `VIP_PANEL`, never directly on the card background.
 */

/** Card shell for a VIP section (pairs with VIP_RAIL as its first child). */
export const VIP_CARD =
  'bg-brand-gray-lightest border border-brand-orange/40 rounded-2xl mb-8 overflow-hidden';

/** Decorative accent edge along the top of a VIP card. */
export const VIP_RAIL = 'h-1 bg-gradient-to-r from-brand-orange-dark via-brand-orange to-brand-orange-dark';

/** Circular/rounded tint behind a VIP icon. */
export const VIP_ICON_CHIP = 'bg-brand-orange/10 border border-brand-orange/40';

/** Icon color for VIP iconography. */
export const VIP_ICON = 'text-brand-orange-dark';

/** Solid "VIP" eyebrow badge — black on orange reads at 5.9:1. */
export const VIP_PILL =
  'text-xs font-bold tracking-widest uppercase text-brand-black bg-brand-orange rounded-full px-3 py-1';

/** White sub-panel that gives accent text enough contrast to sit on. */
export const VIP_PANEL = 'bg-brand-white border border-brand-orange/30 rounded-lg';

/** Emphasis text — only inside VIP_PANEL or another white surface. */
export const VIP_EMPHASIS = 'text-brand-orange-dark';

/** Primary VIP call to action. */
export const VIP_CTA =
  'bg-brand-orange-dark text-brand-white font-semibold hover:bg-brand-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2';

/**
 * Warning callout used across the page — the platform's canonical idiom
 * (see RichTextRenderer's TL;DR block and the CFP dashboard panels).
 */
export const CALLOUT_WARNING =
  'bg-brand-primary/20 border border-brand-primary/50 text-brand-gray-darkest rounded-lg';
