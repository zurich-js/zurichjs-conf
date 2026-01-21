/**
 * CFP Login Form Component
 * Admin authentication for CFP dashboard
 */

import { useState } from 'react';
import Head from 'next/head';
import { useQueryClient } from '@tanstack/react-query';

export function CfpLoginForm() {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const queryClient = useQueryClient();

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
        queryClient.invalidateQueries({ queryKey: ['admin', 'cfp', 'auth'] });
        queryClient.invalidateQueries({ queryKey: ['cfp'] });
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>CFP Admin Login | ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F1E271] rounded-full mb-4">
                <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-black">CFP Admin</h2>
              <p className="mt-2 text-sm text-black">ZurichJS Conference 2026</p>
            </div>
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                />
              </div>
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">{loginError}</p>
                </div>
              )}
              <button
                type="submit"
                className="w-full py-3 px-4 text-base font-medium rounded-lg text-black bg-[#F1E271] hover:bg-[#e8d95e] transition-all cursor-pointer"
              >
                Sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
