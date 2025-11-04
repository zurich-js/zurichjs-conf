import React, { createContext, useContext, ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface MotionContextValue {
  prefersReducedMotion: boolean;
  shouldAnimate: boolean;
}

const MotionContext = createContext<MotionContextValue | undefined>(undefined);

interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Provider for motion preferences
 * Wraps the app to provide centralized motion configuration
 */
export const MotionProvider: React.FC<MotionProviderProps> = ({ children }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const value: MotionContextValue = {
    prefersReducedMotion,
    shouldAnimate: !prefersReducedMotion,
  };

  return (
    <MotionContext.Provider value={value}>
      {children}
    </MotionContext.Provider>
  );
};

/**
 * Hook to access motion preferences
 * @returns Motion configuration values
 */
export const useMotion = (): MotionContextValue => {
  const context = useContext(MotionContext);
  
  if (context === undefined) {
    throw new Error('useMotion must be used within a MotionProvider');
  }
  
  return context;
};

/**
 * Helper to get animation props conditionally
 * Returns undefined if reduced motion is preferred, otherwise returns the props
 */
export const useAnimationProps = <T extends object>(
  animationProps: T
): T | false => {
  const { shouldAnimate } = useMotion();
  return shouldAnimate ? animationProps : false;
};

