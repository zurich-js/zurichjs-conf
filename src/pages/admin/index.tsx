/**
 * Admin Dashboard
 * Password-protected admin panel for managing tickets and viewing financials
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

type Tab = 'tickets' | 'financials';

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
}

interface FinancialData {
  summary: {
    totalRevenue: number;
    confirmedTickets: number;
    totalRefunded: number;
    refundedTickets: number;
    netRevenue: number;
    totalTickets: number;
  };
  byCategory: Record<string, { revenue: number; count: number }>;
  byStage: Record<string, { revenue: number; count: number }>;
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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-black">
                    Admin Dashboard
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">ZurichJS Conference 2026</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`${
                activeTab === 'tickets'
                  ? 'bg-[#F1E271] text-black shadow-sm'
                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
              } flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <span>Tickets</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`${
                activeTab === 'financials'
                  ? 'bg-[#F1E271] text-black shadow-sm'
                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
              } flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all cursor-pointer`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Financials</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6 pb-12">
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'financials' && <FinancialsTab />}
          </div>
        </div>
      </div>
    </>
  );
}

// Tickets Tab Component
function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
        alert('Ticket email resent successfully!');
        setShowResendConfirm(false);
        setSelectedTicket(null);
      } else {
        alert('Failed to resend ticket email');
      }
    } catch {
      alert('Error resending ticket email');
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
        alert('Ticket refunded successfully!');
        fetchTickets();
        setShowRefundConfirm(false);
        setSelectedTicket(null);
      } else {
        const data = await response.json();
        alert(`Failed to refund ticket: ${data.error}`);
      }
    } catch {
      alert('Error refunding ticket');
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    try {
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/cancel`, {
        method: 'POST',
      });
      if (response.ok) {
        alert('Ticket cancelled successfully!');
        fetchTickets();
        setShowCancelConfirm(false);
        setSelectedTicket(null);
      } else {
        alert('Failed to cancel ticket');
      }
    } catch {
      alert('Error cancelling ticket');
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
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-black">Ticket Management</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} total
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
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  ID
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Name
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Email
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Type
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-mono text-black font-medium">
                    {ticket.id.substring(0, 8)}...
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-black font-medium">
                    {ticket.first_name} {ticket.last_name}
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {ticket.email}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex flex-col space-y-1">
                      <span className="font-medium text-black capitalize">{ticket.ticket_category}</span>
                      <span className="text-xs text-gray-500 capitalize">{ticket.ticket_stage.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">
                    {(ticket.amount_paid / 100).toFixed(2)} {ticket.currency}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
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
                  <td className="px-3 sm:px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://dashboard.stripe.com/payments/${ticket.stripe_payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                        title="View in Stripe Dashboard"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Stripe
                      </a>
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowResendConfirm(true);
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-indigo-300 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer transition-colors"
                        title="Resend ticket email to customer"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Resend
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowReassignModal(true);
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 border border-purple-300 rounded-md text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                        title="Transfer ticket to another person"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Reassign
                      </button>
                      {ticket.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowRefundConfirm(true);
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
                            title="Process full refund via Stripe"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Refund
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowCancelConfirm(true);
                            }}
                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            title="Cancel ticket without refunding"
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
    </>
  );
}

// Reassign Modal Component
function ReassignModal({
  ticket,
  onClose,
  onSuccess,
}: {
  ticket: Ticket;
  onClose: () => void;
  onSuccess: () => void;
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
        alert('Ticket reassigned successfully!');
        onSuccess();
      } else {
        const data = await response.json();
        alert(`Failed to reassign ticket: ${data.error}`);
      }
    } catch {
      alert('Error reassigning ticket');
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
              className={`flex-1 ${buttonBg} text-white px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${confirmColor}-500 transition-all cursor-pointer`}
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Total Revenue</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-600">
            {(summary.totalRevenue / 100).toFixed(2)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            {summary.confirmedTickets} confirmed tickets
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Total Refunded</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-red-600">
            {(summary.totalRefunded / 100).toFixed(2)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            {summary.refundedTickets} refunded tickets
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-4 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">Net Revenue</h3>
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600">
            {(summary.netRevenue / 100).toFixed(2)} CHF
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium">
            {summary.totalTickets} total tickets
          </p>
        </div>
      </div>

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
