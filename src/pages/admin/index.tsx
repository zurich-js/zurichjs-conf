/**
 * Admin Dashboard
 * Password-protected admin panel for managing tickets and viewing financials
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { B2BOrdersTab } from '@/components/admin/B2BOrdersTab';
import AdminHeader from '@/components/admin/AdminHeader';

// Dynamically import recharts to avoid SSR issues
const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then((mod) => mod.Legend), { ssr: false });

type Tab = 'tickets' | 'issue' | 'financials' | 'b2b';

interface TicketMetadata {
  issuedManually?: boolean;
  issuedAt?: string;
  paymentType?: 'complimentary' | 'stripe';
  complimentaryReason?: string;
  stripePaymentId?: string;
  [key: string]: unknown;
}

interface Ticket {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_type: string;
  ticket_category: string;
  ticket_stage: string;
  amount_paid: number;
  currency: string;
  status: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  stripe_customer_id?: string;
  company?: string;
  job_title?: string;
  qr_code_url?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: TicketMetadata;
}

interface FinancialData {
  summary: {
    grossRevenue: number;
    totalStripeFees: number;
    netRevenue: number;
    totalRevenue: number; // legacy field
    confirmedTickets: number;
    totalRefunded: number;
    refundedTickets: number;
    totalTickets: number;
  };
  byCategory: Record<string, { revenue: number; count: number }>;
  byStage: Record<string, { revenue: number; count: number }>;
  revenueBreakdown: {
    individual: {
      total: { count: number; revenue: number; fees: number };
      stripe: { count: number; revenue: number; fees: number };
      bank_transfer: { count: number; revenue: number; fees: number };
    };
    b2b: {
      total: { count: number; revenue: number; fees: number };
      stripe: { count: number; revenue: number; fees: number };
      bank_transfer: { count: number; revenue: number; fees: number };
    };
    complimentary: { count: number };
  };
  b2bSummary: {
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    draftInvoices: number;
    paidRevenue: number;
    pendingRevenue: number;
  };
  purchasesTimeSeries: Array<{
    date: string;
    count: number;
    revenue: number;
    cumulative: number;
    cumulativeRevenue: number;
  }>;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/tickets');
      if (response.ok) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
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

      if (response.ok) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.reload();
    } catch (err) {
      console.error('Logout failed:', err);
    }
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
        <Head>
          <title>Admin Login - ZurichJS Conference</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F1E271] rounded-full mb-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-black">
                  Admin Dashboard
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  ZurichJS Conference 2026
                </p>
              </div>
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoFocus
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent transition-all"
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
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-black bg-[#F1E271] hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all shadow-sm hover:shadow-md"
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

  return (
    <>
      <Head>
        <title>Admin Dashboard - ZurichJS Conference</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader
          title="Admin Dashboard"
          subtitle="ZurichJS Conference 2026"
          onLogout={handleLogout}
        />

        {/* Mobile: Dropdown select | Desktop: Inline tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as Tab)}
              className="block w-full rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-3 text-sm font-medium text-gray-900 shadow-sm focus:border-[#F1E271] focus:ring-2 focus:ring-[#F1E271] focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat"
            >
              <option value="tickets">Tickets</option>
              <option value="issue">Issue Ticket</option>
              <option value="financials">Financials</option>
              <option value="b2b">B2B Orders</option>
            </select>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`${
                  activeTab === 'tickets'
                    ? 'bg-[#F1E271] text-black shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                } px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>Tickets</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('issue')}
                className={`${
                  activeTab === 'issue'
                    ? 'bg-[#F1E271] text-black shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                } px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Issue</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('financials')}
                className={`${
                  activeTab === 'financials'
                    ? 'bg-[#F1E271] text-black shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                } px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Financials</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('b2b')}
                className={`${
                  activeTab === 'b2b'
                    ? 'bg-[#F1E271] text-black shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                } px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>B2B Orders</span>
                </div>
              </button>
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

// Ticket Details Modal Component with Actions
function TicketDetailsModal({
  ticket,
  onClose,
  onResend,
  onReassign,
  onRefund,
  onCancel,
  onDelete,
}: {
  ticket: Ticket;
  onClose: () => void;
  onResend: () => void;
  onReassign: () => void;
  onRefund: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatComplimentaryReason = (reason?: string) => {
    if (!reason) return 'Not specified';
    const reasonLabels: Record<string, string> = {
      speaker: 'Speaker',
      sponsor: 'Sponsor',
      organizer: 'Organizer / Staff',
      volunteer: 'Volunteer',
      media: 'Media / Press',
      partner: 'Partner',
      contest_winner: 'Contest Winner',
      other: 'Other',
    };
    return reasonLabels[reason] || reason;
  };

  const isComplimentary = ticket.metadata?.paymentType === 'complimentary' || ticket.amount_paid === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-black">Ticket Details</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {ticket.first_name} {ticket.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-4 py-1.5 text-sm font-bold rounded-full ${
                ticket.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : ticket.status === 'refunded'
                  ? 'bg-red-100 text-red-800'
                  : ticket.status === 'cancelled'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
            {ticket.metadata?.issuedManually && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                Manually Issued
              </span>
            )}
            {isComplimentary && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                Complimentary
              </span>
            )}
          </div>

          {/* Ticket Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Ticket Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Ticket ID</p>
                <p className="text-xs text-gray-400 mb-1">Unique identifier for this ticket</p>
                <p className="text-sm font-mono text-black break-all">{ticket.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Category</p>
                <p className="text-xs text-gray-400 mb-1">Ticket type (standard, VIP, student, etc.)</p>
                <p className="text-sm text-black capitalize font-medium">{ticket.ticket_category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Stage</p>
                <p className="text-xs text-gray-400 mb-1">Pricing tier when purchased</p>
                <p className="text-sm text-black capitalize">{ticket.ticket_stage.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Attendee Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Attendee Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Name</p>
                <p className="text-sm text-black font-medium">{ticket.first_name} {ticket.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-black break-all">{ticket.email}</p>
              </div>
              {ticket.company && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Company</p>
                  <p className="text-sm text-black">{ticket.company}</p>
                </div>
              )}
              {ticket.job_title && (
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Job Title</p>
                  <p className="text-sm text-black">{ticket.job_title}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                <p className="text-xs text-gray-400 mb-1">Total paid for this ticket</p>
                <p className="text-sm text-black font-bold">
                  {isComplimentary ? (
                    <span className="text-purple-600">Complimentary</span>
                  ) : (
                    `${(ticket.amount_paid / 100).toFixed(2)} ${ticket.currency}`
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Payment Type</p>
                <p className="text-xs text-gray-400 mb-1">How this ticket was acquired</p>
                <p className="text-sm text-black capitalize">
                  {ticket.metadata?.paymentType || (ticket.amount_paid === 0 ? 'Complimentary' : 'Stripe')}
                </p>
              </div>
              {isComplimentary && ticket.metadata?.complimentaryReason && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Complimentary Reason</p>
                  <p className="text-xs text-gray-400 mb-1">Why ticket was given for free</p>
                  <p className="text-sm text-purple-700 font-medium">
                    {formatComplimentaryReason(ticket.metadata.complimentaryReason)}
                  </p>
                </div>
              )}
              {ticket.stripe_payment_intent_id && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Stripe Payment ID</p>
                  <p className="text-xs text-gray-400 mb-1">Unique identifier for the Stripe payment transaction</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-black break-all">{ticket.stripe_payment_intent_id}</p>
                    <a
                      href={`https://dashboard.stripe.com/payments/${ticket.stripe_payment_intent_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex-shrink-0"
                      title="View in Stripe"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
              {ticket.stripe_session_id && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Checkout Session ID</p>
                  <p className="text-xs text-gray-400 mb-1">Stripe checkout session used during purchase</p>
                  <p className="text-sm font-mono text-black break-all">{ticket.stripe_session_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Timestamps</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Created</p>
                <p className="text-sm text-black">{formatDate(ticket.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Last Updated</p>
                <p className="text-sm text-black">{formatDate(ticket.updated_at)}</p>
              </div>
              {ticket.metadata?.issuedAt && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Manually Issued At</p>
                  <p className="text-sm text-black">{formatDate(ticket.metadata.issuedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          {ticket.qr_code_url && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">QR Code</h4>
              <div className="flex justify-center">
                <img
                  src={ticket.qr_code_url}
                  alt="Ticket QR Code"
                  className="w-32 h-32 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Actions</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ticket.stripe_payment_intent_id && (
              <a
                href={`https://dashboard.stripe.com/payments/${ticket.stripe_payment_intent_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-3 py-2.5 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Stripe
              </a>
            )}
            <button
              onClick={onResend}
              className="flex items-center justify-center px-3 py-2.5 border border-indigo-300 rounded-lg text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Resend
            </button>
            <button
              onClick={onReassign}
              className="flex items-center justify-center px-3 py-2.5 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Reassign
            </button>
            {ticket.status === 'confirmed' && (
              <>
                <button
                  onClick={onRefund}
                  className="flex items-center justify-center px-3 py-2.5 border border-orange-300 rounded-lg text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Refund
                </button>
                <button
                  onClick={onCancel}
                  className="flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onDelete}
              className="flex items-center justify-center px-3 py-2.5 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-6 py-2.5 bg-gray-200 text-black rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tickets Tab Component
interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

type SortField = 'created_at' | 'first_name' | 'email' | 'amount_paid' | 'status' | 'ticket_category';
type SortDirection = 'asc' | 'desc';

function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Search, sort, and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Filter, sort, and paginate tickets
  const filteredAndSortedTickets = useMemo(() => {
    let result = [...tickets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (ticket) =>
          ticket.first_name.toLowerCase().includes(query) ||
          ticket.last_name.toLowerCase().includes(query) ||
          ticket.email.toLowerCase().includes(query) ||
          ticket.id.toLowerCase().includes(query) ||
          ticket.ticket_category?.toLowerCase().includes(query) ||
          ticket.ticket_stage?.toLowerCase().includes(query) ||
          ticket.status.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'created_at':
          aValue = a.created_at || '';
          bValue = b.created_at || '';
          break;
        case 'first_name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'amount_paid':
          aValue = a.amount_paid;
          bValue = b.amount_paid;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'ticket_category':
          aValue = a.ticket_category || '';
          bValue = b.ticket_category || '';
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tickets, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedTickets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedTickets, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/admin/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!selectedTicket) return;
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/resend`, {
        method: 'POST',
      });
      if (response.ok) {
        showToast('success', 'Ticket email resent successfully!');
        setShowResendConfirm(false);
        setSelectedTicket(null);
      } else {
        showToast('error', 'Failed to resend ticket email');
      }
    } catch {
      showToast('error', 'Error resending ticket email');
    }
  };

  const handleRefund = async () => {
    if (!selectedTicket) return;
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'requested_by_customer' }),
      });
      if (response.ok) {
        showToast('success', 'Ticket refunded successfully!');
        fetchTickets();
        setShowRefundConfirm(false);
        setSelectedTicket(null);
      } else {
        const data = await response.json();
        showToast('error', `Failed to refund ticket: ${data.error}`);
      }
    } catch {
      showToast('error', 'Error refunding ticket');
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        showToast('success', 'Ticket cancelled successfully!');
        fetchTickets();
        setShowCancelConfirm(false);
        setSelectedTicket(null);
      } else {
        showToast('error', 'Failed to cancel ticket');
      }
    } catch {
      showToast('error', 'Error cancelling ticket');
    }
  };

  const handleDelete = async () => {
    if (!selectedTicket) return;
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        showToast('success', 'Ticket deleted successfully!');
        fetchTickets();
        setShowDeleteConfirm(false);
        setShowDetailsModal(false);
        setSelectedTicket(null);
      } else {
        const data = await response.json();
        showToast('error', `Failed to delete ticket: ${data.error}`);
      }
    } catch {
      showToast('error', 'Error deleting ticket');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="text-base font-medium text-black">Loading tickets...</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className="text-sm font-medium">{toast.text}</p>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-black/5 rounded transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black">Ticket Management</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {filteredAndSortedTickets.length} of {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
                {searchQuery && ' (filtered)'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                {tickets.filter(t => t.status === 'confirmed').length} confirmed
              </span>
              <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                {tickets.filter(t => t.status === 'pending').length} pending
              </span>
            </div>
          </div>
          {/* Search Input */}
          <div className="mt-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, ID, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  ID
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('first_name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <SortIcon field="first_name" />
                  </div>
                </th>
                <th
                  className="hidden lg:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    <SortIcon field="email" />
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('ticket_category')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    <SortIcon field="ticket_category" />
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount_paid')}
                >
                  <div className="flex items-center gap-1">
                    Amount
                    <SortIcon field="amount_paid" />
                  </div>
                </th>
                <th
                  className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-black font-medium">
                    {ticket.id.substring(0, 8)}...
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-black font-medium">
                    {ticket.first_name} {ticket.last_name}
                  </td>
                  <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {ticket.email}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex flex-col space-y-1">
                      <span className="font-medium text-black capitalize">{ticket.ticket_category}</span>
                      <span className="text-xs text-gray-500 capitalize">{ticket.ticket_stage.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">
                    {(ticket.amount_paid / 100).toFixed(2)} {ticket.currency}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        ticket.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'refunded'
                          ? 'bg-red-100 text-red-800'
                          : ticket.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm">
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setShowDetailsModal(true);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-[#F1E271] rounded-md text-xs font-medium text-black bg-[#F1E271] hover:bg-[#e8d95e] cursor-pointer transition-colors"
                      title="View ticket details"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Shown on mobile only */}
        <div className="md:hidden space-y-4 p-4">
          {paginatedTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-black truncate">
                      {ticket.first_name} {ticket.last_name}
                    </h3>
                    <p className="text-xs text-gray-600 truncate mt-0.5">{ticket.email}</p>
                  </div>
                  <span
                    className={`ml-2 px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                      ticket.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : ticket.status === 'refunded'
                        ? 'bg-red-100 text-red-800'
                        : ticket.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-4 py-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Ticket ID</p>
                    <p className="text-black font-mono text-xs">{ticket.id.substring(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Amount</p>
                    <p className="text-black font-bold">
                      {(ticket.amount_paid / 100).toFixed(2)} {ticket.currency}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Ticket Type</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-black capitalize">{ticket.ticket_category}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-600 capitalize">{ticket.ticket_stage.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowDetailsModal(true);
                  }}
                  className="w-full flex items-center justify-center px-3 py-2.5 border border-[#F1E271] rounded-lg text-sm font-medium text-black bg-[#F1E271] active:bg-[#e8d95e] transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTickets.length)} of {filteredAndSortedTickets.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm font-medium rounded-lg cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-[#F1E271] text-black border border-[#F1E271]'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      {showDetailsModal && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTicket(null);
          }}
          onResend={() => {
            setShowDetailsModal(false);
            setShowResendConfirm(true);
          }}
          onReassign={() => {
            setShowDetailsModal(false);
            setShowReassignModal(true);
          }}
          onRefund={() => {
            setShowDetailsModal(false);
            setShowRefundConfirm(true);
          }}
          onCancel={() => {
            setShowDetailsModal(false);
            setShowCancelConfirm(true);
          }}
          onDelete={() => {
            setShowDetailsModal(false);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {/* Reassign Modal */}
      {showReassignModal && selectedTicket && (
        <ReassignModal
          ticket={selectedTicket}
          onClose={() => {
            setShowReassignModal(false);
            setSelectedTicket(null);
          }}
          onSuccess={() => {
            fetchTickets();
            setShowReassignModal(false);
            setSelectedTicket(null);
          }}
          showToast={showToast}
        />
      )}

      {/* Resend Confirmation */}
      {showResendConfirm && selectedTicket && (
        <ConfirmModal
          title="Resend Ticket Email"
          message={`Resend the ticket confirmation email to the customer?`}
          details={[
            `Ticket ID: ${selectedTicket.id}`,
            `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`,
            `Email: ${selectedTicket.email}`,
            '',
            'This action will:',
            '• Send a new copy of the ticket email',
            '• Include the QR code and ticket details',
            '• Use the current ticket information',
            '• Send to the email address on file'
          ]}
          confirmText="Send Email"
          confirmColor="gray"
          onConfirm={handleResend}
          onCancel={() => {
            setShowResendConfirm(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Refund Confirmation */}
      {showRefundConfirm && selectedTicket && (
        <ConfirmModal
          title="Refund Ticket"
          message={`Are you sure you want to refund this ticket?`}
          details={[
            `Ticket ID: ${selectedTicket.id}`,
            `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`,
            `Amount: ${(selectedTicket.amount_paid / 100).toFixed(2)} ${selectedTicket.currency}`,
            '',
            'This action will:',
            '• Process a full refund via Stripe',
            '• Update ticket status to "refunded"',
            '• This action cannot be undone'
          ]}
          confirmText="Process Refund"
          confirmColor="red"
          onConfirm={handleRefund}
          onCancel={() => {
            setShowRefundConfirm(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && selectedTicket && (
        <ConfirmModal
          title="Cancel Ticket"
          message={`Are you sure you want to cancel this ticket?`}
          details={[
            `Ticket ID: ${selectedTicket.id}`,
            `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`,
            '',
            'This action will:',
            '• Mark the ticket as cancelled',
            '• NOT process a refund',
            '• Customer will not be able to use this ticket'
          ]}
          confirmText="Cancel Ticket"
          confirmColor="gray"
          onConfirm={handleCancel}
          onCancel={() => {
            setShowCancelConfirm(false);
            setSelectedTicket(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedTicket && (
        <ConfirmModal
          title="Delete Ticket"
          message={`Are you sure you want to permanently delete this ticket?`}
          details={[
            `Ticket ID: ${selectedTicket.id}`,
            `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`,
            `Email: ${selectedTicket.email}`,
            '',
            'WARNING: This action will:',
            '• Permanently remove the ticket from the database',
            '• This action CANNOT be undone',
            '• No refund will be processed'
          ]}
          confirmText="Delete Permanently"
          confirmColor="red"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </>
  );
}

// Reassign Modal Component
function ReassignModal({
  ticket,
  onClose,
  onSuccess,
  showToast,
}: {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error', text: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/tickets/${ticket.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName }),
      });

      if (response.ok) {
        showToast('success', 'Ticket reassigned successfully!');
        onSuccess();
      } else {
        const data = await response.json();
        showToast('error', `Failed to reassign ticket: ${data.error}`);
      }
    } catch {
      showToast('error', 'Error reassigning ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-black">Reassign Ticket</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Transfer this ticket to a new owner</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current Owner</p>
            <p className="text-sm font-semibold text-black">{ticket.first_name} {ticket.last_name}</p>
            <p className="text-sm text-gray-600">{ticket.email}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">New Owner Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent transition-all"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">First Name *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent transition-all"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Last Name *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent transition-all"
              placeholder="Doe"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note:</strong> A confirmation email will be sent to the new owner with their ticket details.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#F1E271] text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? 'Reassigning...' : 'Reassign Ticket'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirm Modal Component
function ConfirmModal({
  title,
  message,
  details,
  confirmText = 'Confirm',
  confirmColor = 'red',
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
  confirmColor?: 'red' | 'gray';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const iconColor = confirmColor === 'red' ? 'text-red-700' : 'text-gray-700';
  const iconBg = confirmColor === 'red' ? 'bg-red-100' : 'bg-gray-100';
  const buttonBg = confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 ${iconBg} rounded-full flex items-center justify-center`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-black">{title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {details && details.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 mb-4 sm:mb-6">
              {details.map((detail, index) => (
                <p key={index} className={`text-xs sm:text-sm ${detail.startsWith('•') ? 'text-gray-700 ml-2' : detail === '' ? 'h-2' : 'text-black font-medium'}`}>
                  {detail}
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onConfirm}
              className={`flex-1 ${buttonBg} text-brand-white px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${confirmColor}-500 transition-all cursor-pointer`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-white border border-gray-300 text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Issue Ticket Tab Component
interface StripePaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  description: string | null;
  created: number;
  metadata: Record<string, string>;
}

function IssueTicketTab() {
  const [paymentType, setPaymentType] = useState<'complimentary' | 'stripe'>('complimentary');
  const [stripePaymentId, setStripePaymentId] = useState('');
  const [stripePayment, setStripePayment] = useState<StripePaymentDetails | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [ticketCategory, setTicketCategory] = useState<string>('standard');
  const [ticketStage, setTicketStage] = useState<string>('general_admission');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  const [complimentaryReason, setComplimentaryReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleLookupPayment = async () => {
    if (!stripePaymentId.trim()) {
      setLookupError('Please enter a payment ID');
      return;
    }

    setLookupLoading(true);
    setLookupError('');
    setStripePayment(null);

    try {
      const response = await fetch(`/api/admin/stripe-payment?id=${encodeURIComponent(stripePaymentId.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        setLookupError(data.error || 'Failed to lookup payment');
        return;
      }

      setStripePayment(data.payment);

      // Auto-fill customer details if available
      if (data.payment.customerName) {
        const nameParts = data.payment.customerName.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
      }
      if (data.payment.customerEmail) {
        setEmail(data.payment.customerEmail);
      }
    } catch {
      setLookupError('Failed to lookup payment');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const response = await fetch('/api/admin/issue-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCategory,
          ticketStage,
          firstName,
          lastName,
          email,
          company: company || undefined,
          jobTitle: jobTitle || undefined,
          paymentType,
          stripePaymentId: paymentType === 'stripe' ? stripePaymentId : undefined,
          amountPaid: paymentType === 'stripe' && stripePayment ? stripePayment.amount : 0,
          currency: paymentType === 'stripe' && stripePayment ? stripePayment.currency : 'CHF',
          complimentaryReason: paymentType === 'complimentary' ? complimentaryReason : undefined,
          sendEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error || 'Failed to issue ticket');
        return;
      }

      setSubmitSuccess(true);

      // Reset form
      setStripePaymentId('');
      setStripePayment(null);
      setFirstName('');
      setLastName('');
      setEmail('');
      setCompany('');
      setJobTitle('');
      setComplimentaryReason('');
    } catch {
      setSubmitError('Failed to issue ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setSubmitError('');
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-black">Issue Ticket</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Manually issue a ticket for a customer</p>
          </div>
        </div>
      </div>

      {submitSuccess ? (
        <div className="p-4 sm:p-6">
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-green-800 mb-2">Ticket Issued Successfully!</h3>
            <p className="text-sm text-green-700 mb-4">
              {sendEmail ? 'A confirmation email has been sent to the customer.' : 'The ticket has been created without sending an email.'}
            </p>
            <button
              onClick={resetForm}
              className="px-6 py-2.5 bg-green-600 text-brand-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors cursor-pointer"
            >
              Issue Another Ticket
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Payment Type Selection */}
          <div>
            <label className="block text-sm font-bold text-black mb-3">Payment Type *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('complimentary')}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  paymentType === 'complimentary'
                    ? 'border-[#F1E271] bg-[#F1E271]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paymentType === 'complimentary' ? 'bg-[#F1E271]' : 'bg-gray-100'
                  }`}>
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-black">Complimentary</p>
                    <p className="text-xs text-gray-600">Free ticket (speaker, sponsor, etc.)</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('stripe')}
                className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  paymentType === 'stripe'
                    ? 'border-[#F1E271] bg-[#F1E271]/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    paymentType === 'stripe' ? 'bg-[#F1E271]' : 'bg-gray-100'
                  }`}>
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-black">Stripe Payment</p>
                    <p className="text-xs text-gray-600">Link to existing payment</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Stripe Payment Lookup */}
          {paymentType === 'stripe' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-black mb-2">Stripe Payment ID *</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={stripePaymentId}
                  onChange={(e) => setStripePaymentId(e.target.value)}
                  placeholder="pi_xxx, ch_xxx, or cs_xxx"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleLookupPayment}
                  disabled={lookupLoading}
                  className="px-4 py-2.5 bg-blue-600 text-brand-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  {lookupLoading ? 'Looking up...' : 'Lookup Payment'}
                </button>
              </div>
              {lookupError && (
                <p className="mt-2 text-sm text-red-600">{lookupError}</p>
              )}
              {stripePayment && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Payment Found</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <span className="ml-1 font-bold text-black">{(stripePayment.amount / 100).toFixed(2)} {stripePayment.currency}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className={`ml-1 font-bold ${stripePayment.status === 'succeeded' || stripePayment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {stripePayment.status}
                      </span>
                    </div>
                    {stripePayment.customerName && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Customer:</span>
                        <span className="ml-1 text-black">{stripePayment.customerName}</span>
                      </div>
                    )}
                    {stripePayment.customerEmail && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-1 text-black">{stripePayment.customerEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Complimentary Reason */}
          {paymentType === 'complimentary' && (
            <div>
              <label className="block text-sm font-bold text-black mb-2">Reason for Complimentary Ticket</label>
              <select
                value={complimentaryReason}
                onChange={(e) => setComplimentaryReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
              >
                <option value="">Select a reason...</option>
                <option value="speaker">Speaker</option>
                <option value="sponsor">Sponsor</option>
                <option value="organizer">Organizer / Staff</option>
                <option value="volunteer">Volunteer</option>
                <option value="media">Media / Press</option>
                <option value="partner">Partner</option>
                <option value="contest_winner">Contest Winner</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* Ticket Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Ticket Category *</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
              >
                <option value="standard">Standard</option>
                <option value="vip">VIP</option>
                <option value="student">Student</option>
                <option value="unemployed">Unemployed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-black mb-2">Ticket Stage *</label>
              <select
                value={ticketStage}
                onChange={(e) => setTicketStage(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
              >
                <option value="blind_bird">Blind Bird</option>
                <option value="early_bird">Early Bird</option>
                <option value="general_admission">General Admission</option>
                <option value="late_bird">Late Bird</option>
              </select>
            </div>
          </div>

          {/* Attendee Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-black mb-4">Attendee Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-black mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="Software Engineer"
                />
              </div>
            </div>
          </div>

          {/* Email Option */}
          <div className="border-t border-gray-200 pt-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271] cursor-pointer"
              />
              <div>
                <span className="font-bold text-black">Send confirmation email</span>
                <p className="text-xs text-gray-600">Send ticket with QR code and details to the attendee</p>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="border-t border-gray-200 pt-6">
            <button
              type="submit"
              disabled={isSubmitting || (paymentType === 'stripe' && !stripePayment)}
              className="w-full sm:w-auto px-8 py-3 bg-[#F1E271] text-black rounded-lg text-base font-medium hover:bg-[#e8d95e] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? 'Issuing Ticket...' : 'Issue Ticket'}
            </button>
            {paymentType === 'stripe' && !stripePayment && (
              <p className="mt-2 text-xs text-gray-500">Please lookup the Stripe payment first</p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

// Financials Tab Component
function FinancialsTab() {
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const response = await fetch('/api/admin/financials');
      if (response.ok) {
        const data = await response.json();
        setFinancials(data);
      }
    } catch (err) {
      console.error('Failed to fetch financials:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="text-base font-medium text-black">Loading financial data...</p>
      </div>
    );
  }

  if (!financials) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
        <p className="text-base font-medium text-black">Failed to load financial data</p>
      </div>
    );
  }

  const { summary, byCategory, byStage } = financials;

  // Format currency with thousand separators (Swiss format: 1'234.56)
  const formatCHF = (cents: number) => {
    return (cents / 100).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Gross Revenue */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Gross Revenue</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatCHF(summary.grossRevenue)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            {summary.confirmedTickets} confirmed tickets
          </p>
        </div>

        {/* Stripe Fees */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Stripe Fees</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-bold text-purple-600">
            -{formatCHF(summary.totalStripeFees)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            {summary.grossRevenue > 0 ? ((summary.totalStripeFees / summary.grossRevenue) * 100).toFixed(1) : 0}% of gross
          </p>
        </div>

        {/* Net Revenue */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Net Revenue</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-bold text-blue-600">
            {formatCHF(summary.netRevenue)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            After Stripe fees
          </p>
        </div>

        {/* Refunded */}
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Total Refunded</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-bold text-red-600">
            {formatCHF(summary.totalRefunded)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            {summary.refundedTickets} refunded tickets
          </p>
        </div>
      </div>

      {/* Revenue by Sales Channel */}
      {financials.revenueBreakdown && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg sm:text-xl font-bold text-black">Revenue by Sales Channel</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown of revenue by individual sales, B2B sales, and complimentary tickets</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Individual Sales */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <h4 className="font-bold text-gray-900">Individual Sales</h4>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCHF(financials.revenueBreakdown.individual.total.revenue)} CHF
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {financials.revenueBreakdown.individual.total.count.toLocaleString('de-CH')} tickets
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Stripe fees: {formatCHF(financials.revenueBreakdown.individual.total.fees)} CHF
                </p>

                {/* Payment method breakdown */}
                <div className="mt-4 pt-3 border-t border-blue-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">via Stripe</span>
                    <span className="font-medium text-gray-900">
                      {financials.revenueBreakdown.individual.stripe.count.toLocaleString('de-CH')} tickets · {formatCHF(financials.revenueBreakdown.individual.stripe.revenue)} CHF
                    </span>
                  </div>
                  {financials.revenueBreakdown.individual.bank_transfer.count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">via Bank Transfer</span>
                      <span className="font-medium text-gray-900">
                        {financials.revenueBreakdown.individual.bank_transfer.count.toLocaleString('de-CH')} tickets · {formatCHF(financials.revenueBreakdown.individual.bank_transfer.revenue)} CHF
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* B2B Sales */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <h4 className="font-bold text-gray-900">B2B Sales</h4>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCHF(financials.revenueBreakdown.b2b.total.revenue)} CHF
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {financials.revenueBreakdown.b2b.total.count.toLocaleString('de-CH')} tickets
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Stripe fees: {formatCHF(financials.revenueBreakdown.b2b.total.fees)} CHF
                </p>

                {/* Payment method breakdown */}
                <div className="mt-4 pt-3 border-t border-green-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">via Bank Transfer</span>
                    <span className="font-medium text-gray-900">
                      {financials.revenueBreakdown.b2b.bank_transfer.count.toLocaleString('de-CH')} tickets · {formatCHF(financials.revenueBreakdown.b2b.bank_transfer.revenue)} CHF
                    </span>
                  </div>
                  {financials.revenueBreakdown.b2b.bank_transfer.count > 0 && (
                    <p className="text-xs text-green-600">No processing fees on bank transfers</p>
                  )}
                  {financials.revenueBreakdown.b2b.stripe.count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">via Stripe</span>
                      <span className="font-medium text-gray-900">
                        {financials.revenueBreakdown.b2b.stripe.count.toLocaleString('de-CH')} tickets · {formatCHF(financials.revenueBreakdown.b2b.stripe.revenue)} CHF
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Complimentary */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <h4 className="font-bold text-gray-900">Complimentary</h4>
                </div>
                <p className="text-2xl font-bold text-gray-700">
                  {financials.revenueBreakdown.complimentary.count} tickets
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Free tickets (no payment)
                </p>
              </div>
            </div>

            {/* B2B Invoice Summary */}
            {financials.b2bSummary && financials.b2bSummary.totalInvoices > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">B2B Invoice Pipeline</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Paid Invoices</p>
                    <p className="font-bold text-green-700">{financials.b2bSummary.paidInvoices}</p>
                    <p className="text-xs text-gray-500">{formatCHF(financials.b2bSummary.paidRevenue)} CHF</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pending Payment</p>
                    <p className="font-bold text-amber-600">{financials.b2bSummary.pendingInvoices}</p>
                    <p className="text-xs text-gray-500">{formatCHF(financials.b2bSummary.pendingRevenue)} CHF</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Draft Invoices</p>
                    <p className="font-bold text-gray-600">{financials.b2bSummary.draftInvoices}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Invoices</p>
                    <p className="font-bold text-gray-900">{financials.b2bSummary.totalInvoices}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Purchases Over Time Chart */}
      {financials.purchasesTimeSeries && financials.purchasesTimeSeries.length > 0 && (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h3 className="text-lg sm:text-xl font-bold text-black">Ticket Purchases Over Time</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Daily ticket sales and cumulative total</p>
          </div>
          <div className="p-4 sm:p-6">
            {/* Mobile: Simple cumulative chart | Desktop: Full chart with dual Y-axis */}
            <div className="sm:hidden h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={financials.purchasesTimeSeries.map((item) => ({
                    ...item,
                    date: new Date(item.date).toLocaleDateString('en-CH', { day: 'numeric', month: 'short' }),
                  }))}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value, name) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      if (name === 'Cumulative') return [numValue, 'Total Tickets'];
                      if (name === 'Daily') return [numValue, 'Daily Sales'];
                      return [numValue, String(name)];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#16a34a' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Daily"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#f97316' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-green-600 inline-block"></span> Total
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-orange-500 inline-block"></span> Daily
                </span>
              </div>
            </div>

            {/* Desktop: Full chart */}
            <div className="hidden sm:block h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={financials.purchasesTimeSeries.map((item) => ({
                    ...item,
                    date: new Date(item.date).toLocaleDateString('en-CH', { month: 'short', day: 'numeric' }),
                    revenueChf: item.revenue / 100,
                    cumulativeRevenueChf: item.cumulativeRevenue / 100,
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    label={{ value: 'Tickets', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    label={{ value: 'Revenue (CHF)', angle: 90, position: 'insideRight', fill: '#6b7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value, name) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      if (name === 'Daily Sales') return [numValue, 'Daily Sales'];
                      if (name === 'Cumulative') return [numValue, 'Cumulative Tickets'];
                      if (name === 'Daily Revenue') return [`${numValue.toFixed(2)} CHF`, 'Daily Revenue'];
                      return [numValue, String(name)];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    name="Daily Sales"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#f97316' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulative"
                    name="Cumulative"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#16a34a' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenueChf"
                    name="Daily Revenue"
                    stroke="#7c3aed"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#7c3aed' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* By Category */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg sm:text-xl font-bold text-black">Revenue by Category</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown by ticket type</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(byCategory).map(([category, data]) => (
              <div key={category} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="font-bold text-black capitalize text-sm sm:text-base">{category}</span>
                <div className="text-left sm:text-right">
                  <span className="text-black font-bold text-base sm:text-lg">
                    {(data.revenue / 100).toFixed(2)} CHF
                  </span>
                  <span className="text-gray-600 text-xs sm:text-sm ml-2 sm:ml-3 font-medium">
                    ({data.count} {data.count === 1 ? 'ticket' : 'tickets'})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* By Stage */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg sm:text-xl font-bold text-black">Revenue by Purchase Stage</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown by pricing period</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {Object.entries(byStage).map(([stage, data]) => (
              <div key={stage} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="font-bold text-black capitalize text-sm sm:text-base">{stage.replace('_', ' ')}</span>
                <div className="text-left sm:text-right">
                  <span className="text-black font-bold text-base sm:text-lg">
                    {(data.revenue / 100).toFixed(2)} CHF
                  </span>
                  <span className="text-gray-600 text-xs sm:text-sm ml-2 sm:ml-3 font-medium">
                    ({data.count} {data.count === 1 ? 'ticket' : 'tickets'})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
