import { useEffect, type RefObject } from 'react';

interface UseLoadMoreOnIntersectOptions {
  targetRef: RefObject<Element | null>;
  enabled: boolean;
  onLoadMore: () => void;
  rootRef?: RefObject<Element | null>;
  rootMargin?: string;
}

export function useLoadMoreOnIntersect({
  targetRef,
  enabled,
  onLoadMore,
  rootRef,
  rootMargin = '600px 0px',
}: UseLoadMoreOnIntersectOptions): void {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;

    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      {
        root: rootRef?.current ?? null,
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [enabled, onLoadMore, rootMargin, rootRef, targetRef]);
}
