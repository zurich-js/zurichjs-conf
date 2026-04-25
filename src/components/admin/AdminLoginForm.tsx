/**
 * Shared Admin Login Form
 * Consistent login UI across all admin pages — matches the root admin dashboard design
 */

import { useState } from 'react';
import Head from 'next/head';
import { Lock } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminLoginFormProps {
  /** Page-specific title shown below the lock icon */
  title?: string;
}

export function AdminLoginForm({ title = 'Admin Dashboard' }: AdminLoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(password);
    if (result.ok) {
      setPassword('');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <>
      <Head>
        <title>{title} Login - ZurichJS Conference</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-text-brand-gray-lightest flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-primary rounded-full mb-4">
                <Lock className="w-8 h-8 text-black" />
              </div>
              <h2 className="text-3xl font-bold text-black">{title}</h2>
              <p className="mt-2 text-sm text-brand-gray-dark">ZurichJS Conference 2026</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  required
                  autoFocus
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}
              <button
                type="submit"
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-black bg-brand-primary hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all shadow-sm hover:shadow-md cursor-pointer"
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
