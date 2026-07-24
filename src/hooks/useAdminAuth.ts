/**
 * Shared admin authentication hook
 * Single source of truth for auth state across all admin pages
 */

import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { adminKeys } from '@/lib/admin/query-keys';

const ADMIN_AUTH_QUERY_KEY = adminKeys.auth();

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const { data: isAuthenticated = false, isLoading } = useQuery({
    queryKey: ADMIN_AUTH_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const login = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY });
          return { ok: true };
        }
        return { ok: false, error: 'Invalid password' };
      } catch {
        return { ok: false, error: 'Login failed. Please try again.' };
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    queryClient.clear();
    window.location.reload();
  }, [queryClient]);

  return { isAuthenticated, isLoading, login, logout } as const;
}
