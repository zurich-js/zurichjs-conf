import { useState, useEffect, useCallback, useRef, createElement } from 'react';
import type { ReactNode } from 'react';
import { useMotion } from '@/contexts/MotionContext';
import { DuckieSideEntrance } from './DuckieSideEntrance';
import { DuckieZMove } from './DuckieZMove';

interface DuckieConfig {
  idleStartMs: number;
  scrollProbability: number;
  sideRepeatIntervalMs: number;
}

type AnimationType = 'side' | 'zmove' | null;
let animationCounter = 0;

const STORAGE_KEY = 'duckie_dismissed';

function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

// Preload all sprite images
function preloadSprites() {
  const sprites = [
    '/sprites/side_1_in.png',
    '/sprites/side_2_transition_in.png',
    '/sprites/side_3_finished.png',
    '/sprites/side_4_transition_out.png',
    '/sprites/side_5_out.png',
    '/sprites/front_1_in.png',
    '/sprites/front_2_transition_in.png',
    '/sprites/front_3_finished.png',
    '/sprites/front_4_transition_out.png',
    '/sprites/front_5_transition_out_2.png',
    '/sprites/front_6_out.png',
  ];
  sprites.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

export function useDuckie(config: DuckieConfig): ReactNode {
  const { shouldAnimate } = useMotion();
  const [activeAnimation, setActiveAnimation] = useState<AnimationType>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const [zmoveCursorPos, setZmoveCursorPos] = useState({ x: 0, y: 0 });
  const [dismissed, setDismissed] = useState(false);
  const lastSideTimeRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef<AnimationType>(null);
  const zmoveCountRef = useRef(0);
  const clickCountRef = useRef(0);
  const preloadedRef = useRef(false);

  // Check if feature is enabled
  const isEnabled =
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_EASTER_EGG_ENABLED !== 'false' &&
    shouldAnimate &&
    !dismissed;

  // Check localStorage on mount
  useEffect(() => {
    if (isDismissed()) setDismissed(true);
  }, []);

  // Preload sprites once
  useEffect(() => {
    if (isEnabled && !preloadedRef.current) {
      preloadedRef.current = true;
      preloadSprites();
    }
  }, [isEnabled]);

  const onComplete = useCallback(() => {
    activeRef.current = null;
    setActiveAnimation(null);
  }, []);

  const onDuckieClick = useCallback(() => {
    clickCountRef.current++;
    if (clickCountRef.current >= 3) {
      dismiss();
      setDismissed(true);
      activeRef.current = null;
      setActiveAnimation(null);
    }
  }, []);

  // Check if pointer device (for z-move idle detection)
  const isPointerDevice = useCallback(() => {
    return window.matchMedia('(pointer: fine)').matches;
  }, []);

  // Escalating idle threshold: idleStartMs, then *1.6 each time
  // e.g. 3s -> 4.8s -> 7.7s -> 12.3s -> 19.6s -> ...
  const getIdleThreshold = useCallback(() => {
    return config.idleStartMs * Math.pow(1.6, zmoveCountRef.current);
  }, [config.idleStartMs]);

  // Idle detection for z-move (debounced cursor tracking, pauses when tab hidden)
  useEffect(() => {
    if (!isEnabled || !isPointerDevice()) return;

    let cursorRafId: number | null = null;
    let timerStartedAt = 0;
    let currentThreshold = 0;

    const trackCursor = (e: MouseEvent) => {
      if (cursorRafId !== null) return;
      cursorRafId = requestAnimationFrame(() => {
        cursorRef.current = { x: e.clientX, y: e.clientY };
        cursorRafId = null;
      });
    };

    const startIdleTimer = (delayMs: number) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      currentThreshold = delayMs;
      timerStartedAt = Date.now();
      idleTimerRef.current = setTimeout(() => {
        if (activeRef.current !== null) return;
        zmoveCountRef.current++;
        activeRef.current = 'zmove';
        setZmoveCursorPos({ ...cursorRef.current });
        setAnimationKey(++animationCounter);
        setActiveAnimation('zmove');
      }, delayMs);
    };

    const resetIdleTimer = () => {
      startIdleTimer(getIdleThreshold());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause: clear timer, remember remaining time
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
      } else {
        // Resume: restart with remaining time (at least 500ms to avoid instant trigger)
        const elapsed = Date.now() - timerStartedAt;
        const remaining = Math.max(500, currentThreshold - elapsed);
        startIdleTimer(remaining);
      }
    };

    window.addEventListener('mousemove', trackCursor, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));

    // Start the initial timer
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (cursorRafId !== null) cancelAnimationFrame(cursorRafId);
      window.removeEventListener('mousemove', trackCursor);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [isEnabled, getIdleThreshold, isPointerDevice]);

  // Scroll detection for side entrance (debounced via rAF, pauses when tab hidden)
  useEffect(() => {
    if (!isEnabled) return;

    let scrollRafId: number | null = null;
    let paused = document.hidden;

    const handleScroll = () => {
      if (paused || scrollRafId !== null) return;
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        const now = Date.now();
        if (now - lastSideTimeRef.current < config.sideRepeatIntervalMs) return;

        if (Math.random() < config.scrollProbability) {
          if (activeRef.current !== null) return;
          lastSideTimeRef.current = Date.now();
          activeRef.current = 'side';
          setAnimationKey(++animationCounter);
          setActiveAnimation('side');
        }
      });
    };

    const handleVisibilityChange = () => {
      paused = document.hidden;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled, config.scrollProbability, config.sideRepeatIntervalMs]);

  if (!isEnabled || activeAnimation === null) return null;

  if (activeAnimation === 'side') {
    return createElement(DuckieSideEntrance, { key: animationKey, onComplete, onClick: onDuckieClick });
  }

  if (activeAnimation === 'zmove') {
    return createElement(DuckieZMove, { key: animationKey, position: zmoveCursorPos, onComplete, onClick: onDuckieClick });
  }

  return null;
}
