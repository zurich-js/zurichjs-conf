/**
 * Admin Verifications Dashboard
 * Manage student/unemployed verification requests
 */

import { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import {
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminModal, AdminModalFooter } from '@/components/admin/AdminModal';
import { Pill } from '@/components/admin/shared/Pill';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useToast, type Toast } from '@/hooks/useToast';

interface VerificationRequest {
  id: string;
  verification_id: string;
  name: string;
  email: string;
  verification_type: 'student' | 'unemployed';
  student_id: string | null;
  university: string | null;
  linkedin_url: string | null;
  rav_registration_date: string | null;
  additional_info: string | null;
  price_id: string;
  status: 'pending' | 'approved' | 'rejected';
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_session_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

type StatusFilter = '' | 'pending' | 'approved' | 'rejected';

export default function VerificationsDashboard() {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<VerificationRequest | null>(null);
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

  // Fetch on mount and when filter changes
  useState(() => { fetchVerifications(); });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return verifications;
    const q = searchQuery.toLowerCase();
    return verifications.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.verification_id.toLowerCase().includes(q)
    );
  }, [verifications, searchQuery]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Verification approved and payment link sent', 'success');
        setSelectedVerification(null);
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
        setSelectedVerification(null);
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
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-black">
                {pendingCount} pending
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-black">
                {verifications.length} total
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setLoading(true);
                // Re-fetch with new filter
                setTimeout(() => fetchVerifications(), 0);
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
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
                    onClick={() => setSelectedVerification(v)}
                    className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-black">{v.name}</p>
                        <p className="text-sm text-gray-500">{v.email}</p>
                      </div>
                      <StatusPill status={v.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <TypeIcon type={v.verification_type} />
                      <span className="capitalize">{v.verification_type}</span>
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
                        onClick={() => setSelectedVerification(v)}
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
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(v.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          )}
                          {v.status === 'approved' && v.stripe_payment_link_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(v.stripe_payment_link_url!);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy Link
                            </button>
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
            onClose={() => setSelectedVerification(null)}
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

function StatusPill({ status }: { status: string }) {
  const tone = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber';
  return <Pill tone={tone}>{status}</Pill>;
}

function TypeIcon({ type }: { type: string }) {
  return type === 'student' ? (
    <GraduationCap className="w-4 h-4 text-blue-600" />
  ) : (
    <Briefcase className="w-4 h-4 text-amber-600" />
  );
}

function VerificationDetailModal({
  verification: v,
  onClose,
  onApprove,
  onReject,
  isLoading,
  onCopy,
}: {
  verification: VerificationRequest;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
  onCopy: (text: string) => void;
}) {
  return (
    <AdminModal
      isOpen
      onClose={onClose}
      title={v.name}
      subtitle={`${v.verification_type === 'student' ? 'Student' : 'Unemployed'} Verification`}
      size="lg"
      footer={
        v.status === 'pending' ? (
          <>
            <button
              onClick={() => onReject(v.id)}
              disabled={isLoading}
              className="cursor-pointer rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(v.id)}
              disabled={isLoading}
              className="cursor-pointer rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-black hover:bg-[#E5D665] disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Approve & Send Payment Link'}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <StatusPill status={v.status} />
          <span className="text-sm text-gray-500">
            ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{v.verification_id}</code>
          </span>
        </div>

        {/* Contact info */}
        <Section title="Contact Information">
          <DetailRow label="Name" value={v.name} />
          <DetailRow label="Email" value={v.email} />
        </Section>

        {/* Verification details */}
        <Section title="Verification Details">
          <DetailRow label="Type" value={v.verification_type === 'student' ? 'Student' : 'Unemployed'} />
          {v.university && <DetailRow label="University" value={v.university} />}
          {v.student_id && <DetailRow label="Student ID" value={v.student_id} />}
          {v.linkedin_url && (
            <DetailRow
              label="LinkedIn"
              value={
                <a
                  href={v.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {v.linkedin_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              }
            />
          )}
          {v.rav_registration_date && (
            <DetailRow
              label="RAV Registration"
              value={new Date(v.rav_registration_date).toLocaleDateString('en-CH')}
            />
          )}
        </Section>

        {/* Additional info */}
        {v.additional_info && (
          <Section title="Additional Information">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.additional_info}</p>
          </Section>
        )}

        {/* Payment link (if approved) */}
        {v.status === 'approved' && v.stripe_payment_link_url && (
          <Section title="Payment Link">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-700 truncate">
                {v.stripe_payment_link_url}
              </code>
              <button
                onClick={() => onCopy(v.stripe_payment_link_url!)}
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                title="Copy link"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
              <a
                href={v.stripe_payment_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Open link"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>
          </Section>
        )}

        {/* Timestamps */}
        <Section title="Timeline">
          <DetailRow
            label="Submitted"
            value={new Date(v.created_at).toLocaleString('en-CH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
          {v.reviewed_at && (
            <DetailRow
              label="Reviewed"
              value={new Date(v.reviewed_at).toLocaleString('en-CH', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            />
          )}
        </Section>
      </div>
    </AdminModal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-black mb-3 border-b border-gray-100 pb-2">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-black">{value}</span>
    </div>
  );
}
