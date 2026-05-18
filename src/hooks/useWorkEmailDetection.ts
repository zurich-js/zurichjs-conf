/**
 * useWorkEmailDetection Hook
 *
 * Detects work emails at checkout and fetches colleague count from the same domain.
 * Debounced to avoid excessive API calls — fires after email field stabilizes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { FREE_EMAIL_DOMAINS } from '@/data/free-email-domains';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

const DEBOUNCE_MS = 500;

interface WorkEmailDetectionResult {
  isWorkEmail: boolean;
  colleagueCount: number;
  companyName: string | null;
  isLoading: boolean;
}

function extractDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

export function useWorkEmailDetection(email: string | null | undefined): WorkEmailDetectionResult {
  const [result, setResult] = useState<WorkEmailDetectionResult>({
    isWorkEmail: false,
    colleagueCount: 0,
    companyName: null,
    isLoading: false,
  });
  const lastFetchedDomain = useRef<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchColleagues = useCallback(async (domain: string, userEmail: string) => {
    if (domain === lastFetchedDomain.current) return;
    lastFetchedDomain.current = domain;

    setResult((prev) => ({ ...prev, isWorkEmail: true, isLoading: true }));

    try {
      const params = new URLSearchParams({ domain, exclude: userEmail });
      const response = await fetch(`/api/team/colleagues?${params}`);

      if (!response.ok) {
        setResult((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const data = await response.json() as { count: number; companyName: string | null };

      setResult({
        isWorkEmail: true,
        colleagueCount: data.count,
        companyName: data.companyName,
        isLoading: false,
      });

      if (data.count > 0) {
        analytics.track('work_email_detected', {
          domain,
          colleague_count: data.count,
          company_name: data.companyName ?? undefined,
        } as EventProperties<'work_email_detected'>);
      }
    } catch {
      setResult((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!email || !email.includes('@')) {
      setResult({ isWorkEmail: false, colleagueCount: 0, companyName: null, isLoading: false });
      lastFetchedDomain.current = null;
      return;
    }

    const domain = extractDomain(email);
    if (!domain || FREE_EMAIL_DOMAINS.has(domain)) {
      setResult({ isWorkEmail: false, colleagueCount: 0, companyName: null, isLoading: false });
      lastFetchedDomain.current = null;
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchColleagues(domain, email);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [email, fetchColleagues]);

  return result;
}
