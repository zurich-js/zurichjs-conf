/**
 * WorkshopsRegistrantsTab
 * Admin overview for workshop registrations. Shows all workshops as overview
 * cards and opens a modal for attendee-level registration management.
 */

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  MapPin,
  Search,
  Users,
  X,
} from 'lucide-react';
import { ConfirmModal } from '@/components/admin/dashboard/ConfirmModal';
import { RegistrantReassignModal } from './RegistrantReassignModal';
import { RegistrantEditModal } from './RegistrantEditModal';
import type { WorkshopRegistrantRow } from '@/lib/workshops/getRegistrations';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkshopOfferingSummary {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  enrolled_count: number | null;
  currency: string | null;
  status: string | null;
  room: string | null;
  duration_minutes: number | null;
  stripe_price_lookup_key: string | null;
  metadata?: {
    stripeValidation?: {
      valid?: boolean;
      missing?: string[];
    };
  } | null;
}

interface AdminWorkshopListItem {
  cfpSubmissionId: string;
  submissionTitle: string;
  submissionAbstract: string;
  submissionStatus: string;
  speakerName: string | null;
  cfpDurationHours: number | null;
  sessionSlug: string | null;
  offering: WorkshopOfferingSummary | null;
  registrantCount: number;
  revenueByCurrency: Array<{ currency: string; grossCents: number; registrations: number }>;
}

interface WorkshopCardModel {
  cfpSubmissionId: string;
  title: string;
  description: string | null;
  speakerName: string | null;
  submissionStatus: string;
  cfpDurationHours: number | null;
  sessionSlug: string | null;
  offering: WorkshopOfferingSummary | null;
  registrantCount: number;
  revenueByCurrency: Array<{ currency: string; grossCents: number; registrations: number }>;
}

type SortField = 'created_at' | 'name' | 'email' | 'amount_paid' | 'status';
type SortDirection = 'asc' | 'desc';
type ModalAction = 'refund' | 'cancel' | 'reassign' | 'edit' | null;

const ITEMS_PER_PAGE = 10;

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function fetchWorkshops(): Promise<WorkshopCardModel[]> {
  const res = await fetch('/api/admin/workshops');
  if (!res.ok) throw new Error('Failed to load workshops');
  const data = await res.json();
  const rows = (data.items ?? data.workshops ?? data) as Array<AdminWorkshopListItem | Record<string, unknown>>;

  return rows.map((row) => {
    const item = row as AdminWorkshopListItem;
    const flatOffering = row as unknown as WorkshopOfferingSummary;
    const offering = item.offering ?? (flatOffering.id ? flatOffering : null);

    return {
      cfpSubmissionId: item.cfpSubmissionId ?? offering?.id ?? '',
      title: offering?.title ?? item.submissionTitle ?? 'Untitled workshop',
      description: offering?.description ?? item.submissionAbstract ?? null,
      speakerName: item.speakerName ?? null,
      submissionStatus: item.submissionStatus ?? offering?.status ?? 'unknown',
      cfpDurationHours: item.cfpDurationHours ?? null,
      sessionSlug: item.sessionSlug ?? null,
      offering,
      registrantCount: item.registrantCount ?? offering?.enrolled_count ?? 0,
      revenueByCurrency: item.revenueByCurrency ?? [],
    };
  });
}

async function fetchRegistrants(workshopId: string): Promise<WorkshopRegistrantRow[]> {
  const res = await fetch(`/api/admin/workshops/${workshopId}/registrants`);
  if (!res.ok) throw new Error('Failed to load registrants');
  const data = await res.json();
  return data.registrants as WorkshopRegistrantRow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function registrantName(row: WorkshopRegistrantRow): string {
  return `${row.first_name ?? row.profile_first_name ?? ''} ${row.last_name ?? row.profile_last_name ?? ''}`.trim() || '—';
}

function registrantEmail(row: WorkshopRegistrantRow): string {
  return row.email ?? row.profile_email ?? '—';
}

function discountCode(row: WorkshopRegistrantRow): string | null {
  return row.coupon_code ?? row.partnership_coupon_code ?? row.partnership_voucher_code ?? null;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return 'Date TBD';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return 'Time TBD';
  if (start && end) return `${start.slice(0, 5)}-${end.slice(0, 5)}`;
  return start?.slice(0, 5) ?? end?.slice(0, 5) ?? 'Time TBD';
}

function formatDuration(minutes: number | null | undefined, fallbackHours: number | null | undefined): string {
  if (minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (hours && remainder) return `${hours}h ${remainder}m`;
    if (hours) return `${hours}h`;
    return `${minutes}m`;
  }
  if (fallbackHours) return `${fallbackHours}h`;
  return 'Duration TBD';
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRevenue(revenue: WorkshopCardModel['revenueByCurrency'] | undefined): string {
  if (!revenue || revenue.length === 0) return 'No revenue yet';
  return revenue.map((item) => formatCurrency(item.grossCents, item.currency)).join(', ');
}

function formatAverageRevenue(revenue: WorkshopCardModel['revenueByCurrency'] | undefined): string {
  const items = revenue?.filter((item) => item.registrations > 0) ?? [];
  if (items.length === 0) return 'No paid seats';
  return items
    .map((item) => formatCurrency(Math.round(item.grossCents / item.registrations), item.currency))
    .join(', ');
}

function countPaidRegistrations(revenue: WorkshopCardModel['revenueByCurrency'] | undefined): number {
  return revenue?.reduce((sum, item) => sum + item.registrations, 0) ?? 0;
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' },
    published: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Published' },
    draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
    accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Accepted' },
  };
  const s = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WorkshopsRegistrantsTab() {
  const queryClient = useQueryClient();
  const [workshopSearch, setWorkshopSearch] = useState('');
  const [activeWorkshop, setActiveWorkshop] = useState<WorkshopCardModel | null>(null);
  const selectedWorkshopId = activeWorkshop?.offering?.id ?? '';

  const { data: workshops, isLoading: workshopsLoading, error: workshopsError } = useQuery({
    queryKey: ['admin', 'workshops-list'],
    queryFn: fetchWorkshops,
  });

  const filteredWorkshops = useMemo(() => {
    const items = workshops ?? [];
    const query = workshopSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((workshop) =>
      workshop.title.toLowerCase().includes(query) ||
      workshop.speakerName?.toLowerCase().includes(query) ||
      workshop.offering?.room?.toLowerCase().includes(query)
    );
  }, [workshops, workshopSearch]);

  const overview = useMemo(() => {
    const items = workshops ?? [];
    return {
      total: items.length,
      configured: items.filter((item) => item.offering).length,
      registrants: items.reduce((sum, item) => sum + item.registrantCount, 0),
    };
  }, [workshops]);

  const registrantsKey = ['admin', 'workshops', 'registrants', selectedWorkshopId];
  const { data: registrants, isLoading: registrantsLoading } = useQuery({
    queryKey: registrantsKey,
    queryFn: () => fetchRegistrants(selectedWorkshopId),
    enabled: !!selectedWorkshopId,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [selectedRegistrant, setSelectedRegistrant] = useState<WorkshopRegistrantRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const openRegistrants = (workshop: WorkshopCardModel) => {
    if (!workshop.offering) return;
    setActiveWorkshop(workshop);
    setSearchQuery('');
    setSortField('created_at');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const closeRegistrants = () => {
    setActiveWorkshop(null);
    setSelectedRegistrant(null);
    setModalAction(null);
  };

  const filteredAndSorted = useMemo(() => {
    if (!registrants) return [];
    let result = [...registrants];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) =>
        registrantName(r).toLowerCase().includes(q) ||
        registrantEmail(r).toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortField) {
        case 'created_at': aVal = a.created_at ?? ''; bVal = b.created_at ?? ''; break;
        case 'name': aVal = registrantName(a).toLowerCase(); bVal = registrantName(b).toLowerCase(); break;
        case 'email': aVal = registrantEmail(a).toLowerCase(); bVal = registrantEmail(b).toLowerCase(); break;
        case 'amount_paid': aVal = a.amount_paid; bVal = b.amount_paid; break;
        case 'status': aVal = a.status; bVal = b.status; break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [registrants, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSorted, currentPage]);

  const statusCounts = useMemo(() => {
    if (!registrants) return { confirmed: 0, cancelled: 0, refunded: 0, total: 0 };
    return {
      confirmed: registrants.filter((r) => r.status === 'confirmed').length,
      cancelled: registrants.filter((r) => r.status === 'cancelled').length,
      refunded: registrants.filter((r) => r.status === 'refunded').length,
      total: registrants.length,
    };
  }, [registrants]);

  const refreshData = () => {
    if (selectedWorkshopId) {
      void queryClient.invalidateQueries({ queryKey: registrantsKey });
    }
    void queryClient.invalidateQueries({ queryKey: ['admin', 'workshops-list'] });
    setModalAction(null);
    setSelectedRegistrant(null);
  };

  const handleAction = (action: ModalAction, row: WorkshopRegistrantRow) => {
    setSelectedRegistrant(row);
    setModalAction(action);
  };

  const executeSimpleAction = async (
    action: 'refund' | 'cancel' | 'resend',
    row: WorkshopRegistrantRow | null = selectedRegistrant
  ) => {
    if (!row || !selectedWorkshopId) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/workshops/${selectedWorkshopId}/registrants/${row.id}/${action}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        showToast('success', `Registration ${action === 'resend' ? 'email resent' : action + 'led'} successfully!`);
        refreshData();
      } else {
        const data = await res.json();
        showToast('error', data.error || `Failed to ${action}`);
      }
    } catch {
      showToast('error', `Error performing ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-black">Workshop Registrations</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {overview.configured}/{overview.total} workshops configured, {overview.registrants} total registrations
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={workshopSearch}
              onChange={(e) => setWorkshopSearch(e.target.value)}
              placeholder="Search workshops..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {workshopsLoading ? (
        <div className="p-8 text-center text-gray-500">Loading workshops...</div>
      ) : workshopsError ? (
        <div className="p-8 text-center text-red-600">Failed to load workshops.</div>
      ) : filteredWorkshops.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No workshops match your search.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 sm:p-6">
          {filteredWorkshops.map((workshop) => (
            <WorkshopOverviewCard
              key={workshop.offering?.id ?? workshop.cfpSubmissionId}
              workshop={workshop}
              onOpenRegistrants={openRegistrants}
            />
          ))}
        </div>
      )}

      {activeWorkshop && activeWorkshop.offering && (
        <div className="fixed inset-0 z-40 bg-black/50 p-3 sm:p-6">
          <div className="mx-auto flex max-h-[calc(100vh-24px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]">
            <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold text-black break-words">{activeWorkshop.title}</h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600">
                    {statusCounts.confirmed} confirmed, {statusCounts.cancelled} cancelled, {statusCounts.refunded} refunded — {statusCounts.total} total
                  </p>
                </div>
                <button
                  onClick={closeRegistrants}
                  className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-black cursor-pointer"
                  aria-label="Close registrations"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search registrants..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{statusCounts.confirmed} confirmed</span>
                  {statusCounts.refunded > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{statusCounts.refunded} refunded</span>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {registrantsLoading ? (
                <div className="p-8 text-center text-gray-500">Loading registrations...</div>
              ) : !registrants || registrants.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No registrations found for this workshop.</div>
              ) : (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {([['name', 'Name'], ['email', 'Email'], ['amount_paid', 'Amount'], ['status', 'Status'], ['created_at', 'Registered']] as [SortField, string][]).map(([field, label]) => (
                            <th
                              key={field}
                              onClick={() => toggleSort(field)}
                              className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:text-black select-none"
                            >
                              <span className="inline-flex items-center gap-1">
                                {label} <SortIcon field={field} />
                              </span>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Code</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginated.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-black">{registrantName(row)}</td>
                            <td className="px-4 py-3 text-gray-700">{registrantEmail(row)}</td>
                            <td className="px-4 py-3 text-gray-700">
                              {(row.amount_paid / 100).toFixed(2)} {row.currency}
                              {row.discount_amount > 0 && (
                                <span className="ml-1 text-xs text-green-700">(-{(row.discount_amount / 100).toFixed(2)})</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{statusBadge(row.status)}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(row.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{discountCode(row) ?? '—'}</td>
                            <td className="px-4 py-3 text-right">
                              <ActionMenu row={row} onAction={handleAction} onResend={(r) => void executeSimpleAction('resend', r)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-gray-100">
                    {paginated.map((row) => (
                      <div key={row.id} className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-black break-words">{registrantName(row)}</p>
                            <p className="text-xs text-gray-500 break-all">{registrantEmail(row)}</p>
                          </div>
                          <div className="shrink-0">{statusBadge(row.status)}</div>
                        </div>
                        <div className="flex justify-between gap-3 text-xs text-gray-600">
                          <span>{(row.amount_paid / 100).toFixed(2)} {row.currency}</span>
                          <span>{new Date(row.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <MobileActionButton onClick={() => handleAction('edit', row)} tone="blue">
                            Edit
                          </MobileActionButton>
                          <MobileActionButton onClick={() => handleAction('reassign', row)} tone="purple">
                            Reassign
                          </MobileActionButton>
                          <MobileActionButton onClick={() => void executeSimpleAction('resend', row)}>
                            Resend
                          </MobileActionButton>
                          {row.status === 'confirmed' && (
                            <>
                              <MobileActionButton onClick={() => handleAction('cancel', row)}>
                                Cancel
                              </MobileActionButton>
                              <MobileActionButton onClick={() => handleAction('refund', row)} tone="red">
                                Refund
                              </MobileActionButton>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                      <p className="text-gray-600">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} of {filteredAndSorted.length}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-black disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-black disabled:opacity-40 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {modalAction === 'refund' && selectedRegistrant && (
        <ConfirmModal
          title="Refund Registration"
          message="Are you sure you want to refund this workshop registration?"
          details={[
            `Attendee: ${registrantName(selectedRegistrant)}`,
            `Email: ${registrantEmail(selectedRegistrant)}`,
            `Amount: ${(selectedRegistrant.amount_paid / 100).toFixed(2)} ${selectedRegistrant.currency}`,
            '',
            'This action will:',
            '• Process a refund via Stripe',
            '• Update registration status to "refunded"',
            '• Free up one workshop seat',
          ]}
          confirmText={actionLoading ? 'Processing...' : 'Process Refund'}
          confirmColor="red"
          onConfirm={() => void executeSimpleAction('refund')}
          onCancel={() => { setModalAction(null); setSelectedRegistrant(null); }}
        />
      )}

      {modalAction === 'cancel' && selectedRegistrant && (
        <ConfirmModal
          title="Cancel Registration"
          message="Cancel this registration without issuing a refund?"
          details={[
            `Attendee: ${registrantName(selectedRegistrant)}`,
            `Email: ${registrantEmail(selectedRegistrant)}`,
            '',
            'This action will:',
            '• Update registration status to "cancelled"',
            '• Free up one workshop seat',
            '• No refund will be issued',
          ]}
          confirmText={actionLoading ? 'Cancelling...' : 'Cancel Registration'}
          confirmColor="gray"
          onConfirm={() => void executeSimpleAction('cancel')}
          onCancel={() => { setModalAction(null); setSelectedRegistrant(null); }}
        />
      )}

      {modalAction === 'reassign' && selectedRegistrant && selectedWorkshopId && (
        <RegistrantReassignModal
          workshopId={selectedWorkshopId}
          registration={selectedRegistrant}
          onClose={() => { setModalAction(null); setSelectedRegistrant(null); }}
          onSuccess={refreshData}
          showToast={showToast}
        />
      )}

      {modalAction === 'edit' && selectedRegistrant && selectedWorkshopId && (
        <RegistrantEditModal
          workshopId={selectedWorkshopId}
          registration={selectedRegistrant}
          onClose={() => { setModalAction(null); setSelectedRegistrant(null); }}
          onSuccess={refreshData}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

function WorkshopOverviewCard({
  workshop,
  onOpenRegistrants,
}: {
  workshop: WorkshopCardModel;
  onOpenRegistrants: (workshop: WorkshopCardModel) => void;
}) {
  const offering = workshop.offering;
  const capacity = offering?.capacity ?? null;
  const registered = workshop.registrantCount;
  const fillPercent = capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
  const stripeValid = offering?.metadata?.stripeValidation?.valid;
  const paidRegistrations = countPaidRegistrations(workshop.revenueByCurrency);

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {statusBadge(offering?.status ?? workshop.submissionStatus)}
            {!offering && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                No offering
              </span>
            )}
            {offering && stripeValid === false && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Stripe missing
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold leading-snug text-black break-words">
            {workshop.title}
          </h3>
          {workshop.speakerName && (
            <p className="mt-1 text-sm text-gray-600 break-words">{workshop.speakerName}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
          <InfoPill icon={<Calendar className="size-4" />} text={formatDate(offering?.date)} />
          <InfoPill icon={<Clock className="size-4" />} text={`${formatTimeRange(offering?.start_time, offering?.end_time)} · ${formatDuration(offering?.duration_minutes, workshop.cfpDurationHours)}`} />
          <InfoPill icon={<MapPin className="size-4" />} text={offering?.room ?? 'Room TBD'} />
        </div>

        <div className="border-y border-gray-100 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <DollarSign className="size-3.5" />
            Revenue
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Gross</p>
              <p className="font-semibold text-black break-words">{formatRevenue(workshop.revenueByCurrency)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid seats</p>
              <p className="font-semibold text-black">{paidRegistrations}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Avg / seat</p>
              <p className="font-semibold text-black break-words">{formatAverageRevenue(workshop.revenueByCurrency)}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {registered}{capacity ? `/${capacity}` : ''} registrations
            </span>
            {capacity ? <span>{fillPercent}% full</span> : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${fillPercent}%` }} />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => onOpenRegistrants(workshop)}
            disabled={!offering}
            className="inline-flex justify-center rounded-lg bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {registered > 0 ? 'View registrations' : 'No registrants yet'}
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <span className="shrink-0 text-gray-500">{icon}</span>
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}

function MobileActionButton({
  children,
  onClick,
  tone = 'gray',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'gray' | 'blue' | 'purple' | 'red';
}) {
  const styles = {
    gray: 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100',
    blue: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
    purple: 'border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100',
    red: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold cursor-pointer transition-colors ${styles}`}
    >
      {children}
    </button>
  );
}

// ── Action dropdown ────────────────────────────────────────────────────────────

function ActionMenu({
  row,
  onAction,
  onResend,
}: {
  row: WorkshopRegistrantRow;
  onAction: (action: ModalAction, row: WorkshopRegistrantRow) => void;
  onResend: (row: WorkshopRegistrantRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!open && rect) {
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 160),
      });
    }
    setOpen((value) => !value);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="text-gray-500 hover:text-black px-2 py-1 rounded cursor-pointer text-xs font-medium"
      >
        Actions <ChevronDown className="inline size-3" />
      </button>
      {open && position && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
            style={{ top: position.top, left: position.left }}
          >
            <button onClick={() => { setOpen(false); onResend(row); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              Resend Email
            </button>
            <button onClick={() => { setOpen(false); onAction('edit', row); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              Edit Details
            </button>
            <button onClick={() => { setOpen(false); onAction('reassign', row); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              Reassign
            </button>
            {row.status === 'confirmed' && (
              <>
                <hr className="my-1 border-gray-100" />
                <button onClick={() => { setOpen(false); onAction('cancel', row); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                  Cancel
                </button>
                <button onClick={() => { setOpen(false); onAction('refund', row); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer">
                  Refund
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
