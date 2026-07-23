/**
 * Admin Verifications Dashboard
 * Manage student/unemployed verification requests and track which approved
 * applicants have purchased their ticket vs. need a follow-up.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Mail,
  Ticket,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import {
  VerificationDetailModal,
  StatusPill,
  TicketStatusPill,
  TypeIcon,
  buildFollowUpMailto,
  countryFlag,
  type VerificationWithTicket,
} from '@/components/admin/verifications';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast, type Toast } from '@/hooks/useToast';

type StatusFilter = '' | 'pending' | 'approved' | 'rejected';
type TicketFilter = '' | 'purchased' | 'needs_follow_up';

export default function VerificationsDashboard() {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [verifications, setVerifications] = useState<VerificationWithTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVerifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/verifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVerifications(data.verifications);
      }
    } catch (err) {
      console.error('Failed to fetch verifications:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchVerifications();
  }, [fetchVerifications]);

  const filtered = useMemo(() => {
    let result = verifications;
    if (ticketFilter) {
      result = result.filter((v) => v.follow_up_status === ticketFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.verification_id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [verifications, searchQuery, ticketFilter]);

  const selectedVerification = useMemo(
    () => verifications.find((v) => v.id === selectedId) ?? null,
    [verifications, selectedId]
  );

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Verification approved and payment link sent', 'success');
        setSelectedId(null);
        fetchVerifications();
      } else {
        showToast(data.error || 'Failed to approve', 'error');
      }
    } catch {
      showToast('Error approving verification', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        showToast('Verification rejected', 'success');
        setSelectedId(null);
        fetchVerifications();
      } else {
        showToast('Failed to reject', 'error');
      }
    } catch {
      showToast('Error rejecting verification', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  const pendingCount = verifications.filter((v) => v.status === 'pending').length;
  const purchasedCount = verifications.filter((v) => v.follow_up_status === 'purchased').length;
  const followUpCount = verifications.filter((v) => v.follow_up_status === 'needs_follow_up').length;

  return (
    <>
      <Head>
        <title>Verifications | ZurichJS Admin</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader
          title="Verifications"
          subtitle="Student & Unemployed Discount Requests"
          onLogout={logout}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 pb-12">
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="text-sm font-medium text-black">{pendingCount} pending</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Ticket className="w-4 h-4 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-black">{purchasedCount} purchased</span>
            </div>
            <button
              onClick={() => setTicketFilter(ticketFilter === 'needs_follow_up' ? '' : 'needs_follow_up')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm cursor-pointer transition-colors ${
                ticketFilter === 'needs_follow_up'
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-white border-gray-200 hover:border-amber-300'
              }`}
              title="Toggle needs-follow-up filter"
            >
              <Mail className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="text-sm font-medium text-black">{followUpCount} need follow-up</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm font-medium text-black">{verifications.length} total</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name, email, or verification ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value as TicketFilter)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white"
            >
              <option value="">All ticket states</option>
              <option value="purchased">Ticket purchased</option>
              <option value="needs_follow_up">Needs follow-up</option>
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-brand-primary rounded-full mx-auto" />
              <p className="mt-4 text-sm text-gray-500">Loading verifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200">
              <AdminEmptyState
                icon={<ShieldCheck className="w-6 h-6" />}
                title="No verification requests"
                description={
                  searchQuery
                    ? 'No results match your search'
                    : ticketFilter === 'needs_follow_up'
                      ? 'No approved requests are missing a ticket purchase'
                      : ticketFilter === 'purchased'
                        ? 'No requests with a completed ticket purchase'
                        : statusFilter
                          ? `No ${statusFilter} requests`
                          : 'No verification requests have been submitted yet'
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="space-y-3 md:hidden">
                {filtered.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedId(v.id)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-black">{v.name}</p>
                        <p className="text-sm text-gray-500">{v.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusPill status={v.status} />
                        <TicketStatusPill status={v.follow_up_status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <TypeIcon type={v.verification_type} />
                      <span className="capitalize">{v.verification_type}</span>
                      {v.currency && (
                        <>
                          <span>&middot;</span>
                          <span>{countryFlag(v.country_code)} {v.currency}</span>
                        </>
                      )}
                      <span>&middot;</span>
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Applicant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Currency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedId(v.id)}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-black">{v.name}</p>
                            <p className="text-sm text-gray-500">{v.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <TypeIcon type={v.verification_type} />
                            <span className="text-sm text-black capitalize">{v.verification_type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={v.status} />
                        </td>
                        <td className="px-6 py-4">
                          <TicketStatusPill status={v.follow_up_status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-black">
                          {v.currency ? (
                            <span title={v.country_code || undefined}>
                              {countryFlag(v.country_code)} {v.currency}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(v.created_at).toLocaleDateString('en-CH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {v.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleApprove(v.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(v.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                Reject
                              </button>
                            </div>
                          )}
                          {v.status === 'approved' && (
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {v.follow_up_status === 'needs_follow_up' && (
                                <a
                                  href={buildFollowUpMailto(v)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                                  Follow up
                                </a>
                              )}
                              {v.stripe_payment_link_url && (
                                <button
                                  onClick={() => copyToClipboard(v.stripe_payment_link_url!)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                  Copy Link
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Detail modal */}
        {selectedVerification && (
          <VerificationDetailModal
            verification={selectedVerification}
            onClose={() => setSelectedId(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={actionLoading}
            onCopy={copyToClipboard}
          />
        )}

        {/* Toast notifications */}
        {toasts.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((t: Toast) => (
              <div
                key={t.id}
                onClick={() => removeToast(t.id)}
                className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer transition-all ${
                  t.type === 'success'
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {t.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
