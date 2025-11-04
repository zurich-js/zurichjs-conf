/**
 * Style Utilities
 * Reusable style patterns and helper functions
 */

import { colors } from './tokens';

/**
 * Class name helper for conditional classes
 * Simple alternative to clsx/classnames
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Common Style Patterns
 * Reusable class combinations for consistent styling
 */
export const stylePatterns = {
  // Section backgrounds
  sectionDark: 'bg-surface-section text-slate-200',
  sectionLight: 'bg-gray-0 text-gray-900',
  sectionCard: 'bg-surface-card',

  // Card styles
  card: 'bg-surface-card rounded-2xl shadow-card',
  cardHover: 'hover:shadow-card-hover hover:-translate-y-0.5',
  cardInteractive: 'transition-all duration-300 cursor-pointer',

  // Focus styles
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
  focusRingDark: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-section',

  // Text styles
  kicker: 'text-base md:text-lg xl:text-xl uppercase tracking-wider font-bold text-text-primary/90',
  headingXl: 'text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary',
  headingLg: 'text-3xl md:text-4xl lg:text-5xl font-bold text-text-primary',
  headingMd: 'text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary',
  body: 'text-base md:text-lg leading-relaxed text-slate-300',
  bodyMuted: 'text-sm md:text-base text-slate-400',

  // Container
  container: 'max-w-7xl mx-auto px-6',
  containerWide: 'max-w-[1920px] mx-auto px-6',
  containerNarrow: 'max-w-5xl mx-auto px-6',

  // Grid layouts
  gridTwoCol: 'grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16',
  gridThreeCol: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8',

  // Flex layouts
  flexBetween: 'flex items-center justify-between',
  flexCenter: 'flex items-center justify-center',
  flexCol: 'flex flex-col',

  // Animation
  transition: 'transition-all duration-300 ease-out',
  transitionFast: 'transition-all duration-150 ease-out',
  transitionSlow: 'transition-all duration-500 ease-out',

  // Interactive states
  interactiveLift: 'transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0',

  // Dividers
  divider: 'border-t border-divider',
  dividerStrong: 'border-t border-divider-strong',
} as const;

/**
 * Get color value from tokens
 * Provides TypeScript autocomplete for color paths
 */
export const getColor = (path: string): string => {
  const parts = path.split('.');
  let value: Record<string, unknown> | string = colors;

  for (const part of parts) {
    if (typeof value === 'string') {
      console.warn(`Color path "${path}" not found in tokens`);
      return '#000000';
    }
    value = value[part] as Record<string, unknown> | string;
    if (value === undefined) {
      console.warn(`Color path "${path}" not found in tokens`);
      return '#000000';
    }
  }

  return typeof value === 'string' ? value : '#000000';
};

/**
 * Responsive padding utilities
 */
export const responsivePadding = {
  section: 'py-16 lg:py-24',
  sectionSm: 'py-12 lg:py-16',
  sectionLg: 'py-20 lg:py-32',
  card: 'px-4 sm:px-5 py-3 sm:py-4',
  cardLg: 'px-6 sm:px-8 py-4 sm:py-6',
} as const;

/**
 * Aspect ratio utilities
 */
export const aspectRatio = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[21/9]',
  portrait: 'aspect-[3/4]',
} as const;

/**
 * Animation variants for Framer Motion
 */
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  
  stagger: (index: number, delay = 0.06) => ({
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * delay,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }),
} as const;

/**
 * Transition presets for Framer Motion
 */
export const motionTransitions = {
  smooth: {
    duration: 0.5,
    ease: [0.22, 1, 0.36, 1],
  },
  
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 20,
  },
  
  slow: {
    duration: 0.8,
    ease: [0.22, 1, 0.36, 1],
  },
} as const;

/**
 * Truncate text utilities
 */
export const truncate = {
  single: 'truncate overflow-hidden text-ellipsis whitespace-nowrap',
  multiLine: (lines: number = 2) => 
    `line-clamp-${lines} overflow-hidden text-ellipsis`,
} as const;

/**
 * Screen reader only utility
 */
export const srOnly = 'sr-only';

