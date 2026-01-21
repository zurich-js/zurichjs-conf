/**
 * Admin Dashboard
 * Password-protected admin panel for managing tickets and viewing financials
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { B2BOrdersTab } from '@/components/admin/B2BOrdersTab';
import AdminHeader from '@/components/admin/AdminHeader';
import { TicketsTab, IssueTicketTab, FinancialsTab, type Tab } from '@/components/admin/dashboard';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const router = useRouter();

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/verify');
      if (response.ok) setIsAuthenticated(true);
    } catch (error) { console.error('Auth check failed:', error); }
    finally { setIsLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) { setIsAuthenticated(true); setPassword(''); }
      else setError('Invalid password');
    } catch { setError('Login failed. Please try again.'); }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.reload();
    } catch (err) { console.error('Logout failed:', err); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="text-lg font-medium text-gray-900">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Head><title>Admin Login - ZurichJS Conference</title></Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F1E271] rounded-full mb-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-black">Admin Dashboard</h2>
                <p className="mt-2 text-sm text-gray-600">ZurichJS Conference 2026</p>
              </div>
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">Password</label>
                  <input id="password" name="password" type="password" required autoFocus
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent transition-all"
                    placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-800 font-medium">{error}</p></div>}
                <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-black bg-[#F1E271] hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all shadow-sm hover:shadow-md">
                  Sign in
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>Admin Dashboard - ZurichJS Conference</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Admin Dashboard" subtitle="ZurichJS Conference 2026" onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as Tab)}
              className="block w-full rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-3 text-sm font-medium text-gray-900 shadow-sm focus:border-[#F1E271] focus:ring-2 focus:ring-[#F1E271] focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat">
              <option value="tickets">Tickets</option>
              <option value="issue">Issue Ticket</option>
              <option value="financials">Financials</option>
              <option value="b2b">B2B Orders</option>
            </select>
          </div>
          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
              <TabButton active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')} icon="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z">Tickets</TabButton>
              <TabButton active={activeTab === 'issue'} onClick={() => setActiveTab('issue')} icon="M12 6v6m0 0v6m0-6h6m-6 0H6">Issue</TabButton>
              <TabButton active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z">Financials</TabButton>
              <TabButton active={activeTab === 'b2b'} onClick={() => setActiveTab('b2b')} icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4">B2B Orders</TabButton>
            </div>
          </div>
          {/* Tab Content */}
          <div className="mt-6 pb-12">
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'issue' && <IssueTicketTab />}
            {activeTab === 'financials' && <FinancialsTab />}
            {activeTab === 'b2b' && <B2BOrdersTab />}
          </div>
        </div>
      </div>
    </>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`${active ? 'bg-[#F1E271] text-black shadow-sm' : 'text-gray-600 hover:text-black hover:bg-gray-50'} px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer`}>
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
        <span>{children}</span>
      </div>
    </button>
  );
}
