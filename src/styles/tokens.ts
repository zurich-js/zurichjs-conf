/**
 * Design tokens for ZurichJS Conference site
 * Centralized values for colors, spacing, typography, and more
 *
 * @see src/styles/globals.css - Tailwind theme configuration
 */

/**
 * Color Palette
 * Organized by semantic meaning and use case
 */
export const colors = {
  // Brand Colors - Core palette
  brand: {
    // Yellow (Primary)
    yellow: {
      main: '#F1E271',
      secondary: '#EDC936',
    },
    
    // Blue
    blue: '#268BCC',
    
    // Orange
    orange: '#EA561D',
    
    // Green
    green: '#31A853',
    
    // Black & White
    black: '#000000',
    white: 'white',
    
    // Gray Scale (from design palette)
    gray: {
      darkest: '#19191B',
      dark: '#242528',
      medium: '#7C7F89',
      light: '#A9AAB1',
      lightest: '#EDEDEF',
    },
    
    // Legacy support
    primary: '#F1E271',
    primaryDark: '#E8D54E',
    primaryLight: '#F5EC9A',
    primaryMuted: '#F1E271',
  },

  // Secondary Brand - Blue (legacy)
  blue: {
    primary: '#268BCC',
    primaryDark: '#1E6FA3',
    primaryLight: '#3BA0E0',
  },

  // Neutral Grays - Full scale
  gray: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
    1000: '#000000',
  },

  // Slate - For text on dark backgrounds
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Dark Surfaces - For sections and cards
  surface: {
    page: '#0A0A0A',           // Page background
    section: '#19191B',        // Dark section bg
    card: '#242528',           // Card background
    cardHover: '#2A2A2D',      // Card hover state
    elevated: '#2F2F33',       // Elevated elements
  },

  // Semantic Colors
  semantic: {
    success: '#22C55E',        // Green for success states
    successMuted: '#16A34A',   // Darker green
    warning: '#F97316',        // Orange for warnings
    warningMuted: '#EA580C',   // Darker orange
    error: '#EF4444',          // Red for errors
    errorMuted: '#DC2626',     // Darker red
    info: '#3B82F6',           // Blue for info
    infoMuted: '#2563EB',      // Darker blue
  },

  // Text Colors - Organized by contrast
  text: {
    primary: '#FFFFFF',        // Pure white for headings
    secondary: '#E5E7EB',      // Off-white for body
    tertiary: '#CBD5E1',       // Muted for supporting text
    muted: '#94A3B8',          // Very muted
    disabled: '#64748B',       // Disabled state
  },

  // Special Use Cases
  special: {
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',
    overlayHeavy: 'rgba(0, 0, 0, 0.75)',
    divider: 'rgba(255, 255, 255, 0.08)',
    dividerStrong: 'rgba(255, 255, 255, 0.12)',
    accentVip: '#F26A3C',      // VIP ticket accent
  },
} as const;

/**
 * Spacing Scale
 * Consistent spacing throughout the application
 */
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
  40: '10rem',      // 160px
  48: '12rem',      // 192px
  56: '14rem',      // 224px
  64: '16rem',      // 256px
} as const;

/**
 * Typography Scale
 */
export const typography = {
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
    '6xl': '3.75rem',   // 60px
    '7xl': '4.5rem',    // 72px
    '8xl': '6rem',      // 96px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  lineHeight: {
    none: 1,
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

/**
 * Border Radius Scale
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  '4xl': '2rem',    // 32px
  pill: '9999px',
  full: '9999px',
} as const;

/**
 * Shadow Presets
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  card: '0 10px 25px rgba(0, 0, 0, 0.25)',
  cardHover: '0 12px 30px rgba(0, 0, 0, 0.35)',
  glow: '0 0 20px rgba(241, 226, 113, 0.3)',
} as const;

/**
 * Animation & Transition
 */
export const animation = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
} as const;

/**
 * Breakpoints
 * Match Tailwind defaults
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Z-Index Scale
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  toast: 70,
  tooltip: 80,
} as const;

/**
 * Container Sizes
 */
export const container = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1728px',
  '4xl': '1920px',
} as const;

/**
 * Legacy tokens structure for backwards compatibility
 * @deprecated Use named exports instead
 */
export const tokens = {
  colors: {
    brand: colors.brand,
    neutral: {
      white: colors.gray[0],
      black: colors.gray[1000],
      gray: colors.gray,
    },
    semantic: {
      overlay: colors.special.overlay,
      overlayLight: colors.special.overlayLight,
      overlayHeavy: colors.special.overlayHeavy,
      success: colors.semantic.success,
      muted: colors.text.muted,
    },
    tickets: {
      surfaceBlack: '#0B0F14',
      cardBlack: '#111318',
      textOnDark: '#F8FAFC',
      accentVip: colors.special.accentVip,
    },
    countdown: {
      surface: '#000000',
      textPrimary: '#F8FAFC',
      textMuted: '#A8B1BD',
      divider: colors.special.dividerStrong,
    },
    timeline: {
      bg: colors.surface.section,
      card: colors.surface.card,
      text: colors.text.secondary,
      muted: colors.text.muted,
      divider: colors.special.divider,
      rail: colors.special.divider,
    },
    footer: {
      bg: '#0B0F14',
      divider: 'rgba(255,255,255,0.08)',
      text: '#E5E7EB',
      muted: '#A8B1BD',
      accent: '#F1E271',
      primary: '#258BCC',
      inputBg: '#111318',
      ring: 'rgba(241,226,113,0.5)',
      radius: '9999px',
    },
  },
  spacing,
  fontSize: typography.fontSize,
  fontWeight: typography.fontWeight,
  lineHeight: typography.lineHeight,
  borderRadius,
  shadows,
  transitions: animation.duration,
  easings: animation.easing,
  breakpoints,
  zIndex,
} as const;

export type Tokens = typeof tokens;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
