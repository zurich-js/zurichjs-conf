/**
 * Sponsorships Admin Dashboard
 * Manage sponsors, sponsorship deals, and invoices
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminHeader from '@/components/admin/AdminHeader';
import { SponsorshipsTab } from '@/components/admin/sponsorships';

export default function SponsorshipsDashboard() {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const queryClient = useQueryClient();

  // Check auth status using dedicated verify endpoint
  const { data: isAuthenticated, isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setPassword('');
        // Invalidate auth query to re-check
        queryClient.invalidateQueries({ queryKey: ['admin', 'auth'] });
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      // Clear all queries and reload
      queryClient.clear();
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-black">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#F1E271] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8 text-black">
        <Head>
          <title>Admin Login | ZurichJS Conference</title>
        </Head>
        <div className="max-w-sm w-full bg-white rounded-lg shadow-md p-5 sm:p-6">
          <div className="text-center mb-5 sm:mb-6">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#F1E271] flex items-center justify-center mx-auto mb-3">
              <span className="text-lg sm:text-xl font-bold">Z</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold">Admin Login</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2.5 sm:py-2 border rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
            />
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full bg-[#F1E271] text-black font-medium py-2.5 sm:py-2 rounded-lg hover:bg-[#E5D665]"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <Head>
        <title>Sponsorships | ZurichJS Admin</title>
      </Head>

      <AdminHeader
        title="Sponsorships"
        subtitle="Manage sponsors, deals, and invoices"
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <SponsorshipsTab />
      </main>
    </div>
  );
}
