/**
 * Email Design System Tokens
 * Aligned with ZurichJS Conference website design system
 * Adapted for email light theme while maintaining brand consistency
 */

export const colors = {
  brand: {
    yellow: '#F1E271',      // Main brand yellow (from website)
    blue: '#258BCC',        // Brand blue (from website)
    green: '#21C07A',       // Success/early bird indicator
    vipAccent: '#F26A3C',   // VIP ticket accent (from website)
  },
  text: {
    primary: '#111827',     // Near black for readability
    secondary: '#374151',   // Secondary text
    muted: '#6B7280',       // Muted text
    mutedDark: '#4B5563',   // For dark mode on white backgrounds
  },
  surface: {
    card: '#FFFFFF',        // White card background
    canvas: '#FFF7CF',      // Light yellow canvas (ticket background)
    canvasDark: '#0A0A0A',  // Dark mode canvas (from website)
  },
  border: {
    default: '#E5E7EB',     // Default border
    subtle: '#F3F4F6',      // Subtle border/divider
  },
  badge: {
    bg: '#F0FDF4',          // Light green background
    fg: '#066E3B',          // Dark green text
  },
  wallet: {
    apple: '#000000',       // Apple black
    google: '#1A73E8',      // Google blue
  },
} as const;

export const radii = {
  card: 16,
  badge: 999,
  button: 12,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
} as const;

export const shadows = {
  card: '0 8px 20px rgba(0,0,0,0.08)',
} as const;

export const typography = {
  family: {
    base: 'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
  },
  h1: {
    fontSize: 20,
    lineHeight: '28px',
    fontWeight: 700,
  },
  h2: {
    fontSize: 16,
    lineHeight: '24px',
    fontWeight: 600,
  },
  body: {
    fontSize: 14,
    lineHeight: '22px',
    fontWeight: 400,
  },
  label: {
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
} as const;

export const layout = {
  containerWidth: 600,
  cardPadding: 24,
  sectionGap: 16,
} as const;
