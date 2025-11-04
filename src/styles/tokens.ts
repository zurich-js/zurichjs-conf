/**
 * Design tokens for ZurichJS Conference site
 * Centralized values for colors, spacing, typography, and more
 */

export const tokens = {
  colors: {
    // Brand colors
    brand: {
      primary: '#258BCC',      // Blue for primary brand
      primaryDark: '#1E6FA3',
      primaryLight: '#3BA0E0',
      accent: '#F1E271',       // Yellow for accents and highlights
      accentDark: '#E8D54E',
      accentLight: '#F5EC9A',
    },
    // Neutral palette
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
      gray: {
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
      },
    },
    // Semantic colors
    semantic: {
      overlay: 'rgba(0, 0, 0, 0.6)',
      overlayLight: 'rgba(0, 0, 0, 0.4)',
      overlayHeavy: 'rgba(0, 0, 0, 0.75)',
      success: '#22C55E',      // Green for check icons
      muted: '#94A3B8',        // Muted text
    },
  // Ticket-specific colors
  tickets: {
    surfaceBlack: '#0B0F14',
    cardBlack: '#111318',
    textOnDark: '#F8FAFC',
    accentVip: '#F26A3C',    // Orange for VIP
  },
  // Countdown pill colors
  countdown: {
    surface: '#0B0F14',
    textPrimary: '#F8FAFC',
    textMuted: '#A8B1BD',
    divider: 'rgba(255, 255, 255, 0.12)',
  },
},
  
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
    '5xl': '8rem',    // 128px
  },
  
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
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  borderRadius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.75rem', // 28px
    pill: '1.75rem',  // 28px - specific for countdown pill
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    card: '0 10px 25px rgba(0, 0, 0, 0.25)',
  },
  
  transitions: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
  },
  
  easings: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    overlay: 40,
    modal: 50,
    popover: 60,
    toast: 70,
  },
} as const;

export type Tokens = typeof tokens;

