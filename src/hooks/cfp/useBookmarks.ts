/**
 * useBookmarks Hook
 * localStorage-based bookmarking for reviewer submissions
 */

import { useState, useEffect, useCallback } from 'react';

function getStorageKey(reviewerId: string) {
  return `cfp-reviewer-bookmarks-${reviewerId}`;
}

export function useBookmarks(reviewerId: string | undefined) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  // Load bookmarks from localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    if (!reviewerId) return;
    try {
      const stored = localStorage.getItem(getStorageKey(reviewerId));
      if (stored) {
        setBookmarks(new Set(JSON.parse(stored)));
      }
    } catch {
      // Silently fail if localStorage unavailable
    }
  }, [reviewerId]);

  const toggleBookmark = useCallback(
    (submissionId: string) => {
      if (!reviewerId) return;
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (next.has(submissionId)) {
          next.delete(submissionId);
        } else {
          next.add(submissionId);
        }
        try {
          localStorage.setItem(getStorageKey(reviewerId), JSON.stringify([...next]));
        } catch {
          // Silently fail
        }
        return next;
      });
    },
    [reviewerId]
  );

  const isBookmarked = useCallback(
    (submissionId: string) => bookmarks.has(submissionId),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
}
