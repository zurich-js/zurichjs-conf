/**
 * WorkshopsRegistrantsTab
 * Admin tab for managing workshop registrations with search, sort, pagination, and actions.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { ConfirmModal } from '@/components/admin/dashboard/ConfirmModal';
import { RegistrantReassignModal } from './RegistrantReassignModal';
import { RegistrantEditModal } from './RegistrantEditModal';
import type { WorkshopRegistrantRow } from '@/lib/workshops/getRegistrations';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkshopOption {
  id: string;
  title: string;
  enrolled_count: number;
  capacity: number | null;
}

interface AdminWorkshopListItem {
  offering?: {
    id?: string | null;
    title?: string | null;
    enrolled_count?: number | null;
    capacity?: number | null;
  } | null;
  registrantCount?: number | null;
}

type SortField = 'created_at' | 'name' | 'email' | 'amount_paid' | 'status';
type SortDirection = 'asc' | 'desc';
type ModalAction = 'refund' | 'cancel' | 'reassign' | 'edit' | null;

const ITEMS_PER_PAGE = 10;

// ── Data fetchers ──────────────────────────────────────────────────────────────

async function fetchWorkshops(): Promise<WorkshopOption[]> {
  const res = await fetch('/api/admin/workshops');
  if (!res.ok) throw new Error('Failed to load workshops');
  const data = await res.json();
  const rows = (data.items ?? data.workshops ?? data) as Array<AdminWorkshopListItem | Record<string, unknown>>;

  return rows
    .map((row) => {
      const item = row as AdminWorkshopListItem;
      const offering = item.offering ?? (row as Record<string, unknown>);
      if (!offering?.id) return null;

      return {
        id: offering.id,
        title: offering.title ?? 'Untitled workshop',
        enrolled_count: item.registrantCount ?? offering.enrolled_count ?? 0,
        capacity: offering.capacity ?? null,
      };
    })
    .filter((workshop): workshop is WorkshopOption => workshop !== null);
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

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmed' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' },
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

  // Workshop selector
  const { data: workshops, isLoading: workshopsLoading } = useQuery({
    queryKey: ['admin', 'workshops-list'],
    queryFn: fetchWorkshops,
  });
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');

  // Auto-select first workshop
  useEffect(() => {
    if (workshops && workshops.length > 0 && !selectedWorkshopId) {
      setSelectedWorkshopId(workshops[0].id);
    }
  }, [workshops, selectedWorkshopId]);

  // Registrants
  const registrantsKey = ['admin', 'workshops', 'registrants', selectedWorkshopId];
  const { data: registrants, isLoading: registrantsLoading } = useQuery({
    queryKey: registrantsKey,
    queryFn: () => fetchRegistrants(selectedWorkshopId),
    enabled: !!selectedWorkshopId,
  });

  // Search, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [selectedRegistrant, setSelectedRegistrant] = useState<WorkshopRegistrantRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Reset page on search/workshop change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedWorkshopId]);

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

  // Status counts
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
    void queryClient.invalidateQueries({ queryKey: registrantsKey });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'workshops-list'] });
    setModalAction(null);
    setSelectedRegistrant(null);
  };

  const handleAction = (action: ModalAction, row: WorkshopRegistrantRow) => {
    setSelectedRegistrant(row);
    setModalAction(action);
  };

  const executeSimpleAction = async (action: 'refund' | 'cancel' | 'resend') => {
    if (!selectedRegistrant || !selectedWorkshopId) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/admin/workshops/${selectedWorkshopId}/registrants/${selectedRegistrant.id}/${action}`,
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

  const selectedWorkshop = workshops?.find((w) => w.id === selectedWorkshopId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-black">Workshop Registrations</h2>
            {selectedWorkshop && (
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {statusCounts.confirmed} confirmed, {statusCounts.cancelled} cancelled, {statusCounts.refunded} refunded — {statusCounts.total} total
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{statusCounts.confirmed} confirmed</span>
            {statusCounts.refunded > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{statusCounts.refunded} refunded</span>
            )}
          </div>
        </div>

        {/* Workshop selector + search */}
        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <select
              value={selectedWorkshopId}
              onChange={(e) => setSelectedWorkshopId(e.target.value)}
              className="w-full min-w-0 truncate border border-gray-300 rounded-lg px-3 py-2 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Select workshop"
            >
              {workshopsLoading && <option>Loading...</option>}
              {workshops?.map((w, index) => (
                <option key={w.id} value={w.id}>
                  {index + 1}. {w.title} ({w.enrolled_count}{w.capacity ? `/${w.capacity}` : ''})
                </option>
              ))}
            </select>
            {selectedWorkshop && (
              <p className="mt-2 text-xs leading-5 text-gray-600 break-words sm:hidden">
                <span className="font-semibold text-black">{selectedWorkshop.title}</span>
                {' '}
                ({selectedWorkshop.enrolled_count}{selectedWorkshop.capacity ? `/${selectedWorkshop.capacity}` : ''})
              </p>
            )}
          </div>
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {registrantsLoading ? (
        <div className="p-8 text-center text-gray-500">Loading registrations...</div>
      ) : !registrants || registrants.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No registrations found for this workshop.</div>
      ) : (
        <>
          {/* Desktop table */}
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
                      <ActionMenu row={row} onAction={handleAction} onResend={async (r) => { setSelectedRegistrant(r); await executeSimpleAction('resend'); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {paginated.map((row) => (
              <div key={row.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-black">{registrantName(row)}</p>
                    <p className="text-xs text-gray-500">{registrantEmail(row)}</p>
                  </div>
                  {statusBadge(row.status)}
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{(row.amount_paid / 100).toFixed(2)} {row.currency}</span>
                  <span>{new Date(row.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleAction('edit', row)} className="text-xs text-blue-600 hover:underline cursor-pointer">Edit</button>
                  <button onClick={() => handleAction('reassign', row)} className="text-xs text-purple-600 hover:underline cursor-pointer">Reassign</button>
                  {row.status === 'confirmed' && (
                    <>
                      <button onClick={() => handleAction('cancel', row)} className="text-xs text-gray-600 hover:underline cursor-pointer">Cancel</button>
                      <button onClick={() => handleAction('refund', row)} className="text-xs text-red-600 hover:underline cursor-pointer">Refund</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
              <p className="text-gray-600">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length)} of {filteredAndSorted.length}
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

      {/* Modals */}
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

      {modalAction === 'reassign' && selectedRegistrant && (
        <RegistrantReassignModal
          workshopId={selectedWorkshopId}
          registration={selectedRegistrant}
          onClose={() => { setModalAction(null); setSelectedRegistrant(null); }}
          onSuccess={refreshData}
          showToast={showToast}
        />
      )}

      {modalAction === 'edit' && selectedRegistrant && (
        <RegistrantEditModal
          workshopId={selectedWorkshopId}
          registration={selectedRegistrant}
          onClose={() => { setModalAction(null); setSelectedRegistrant(null); }}
          onSuccess={refreshData}
          showToast={showToast}
        />
      )}

      {/* Toast */}
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

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="text-gray-500 hover:text-black px-2 py-1 rounded cursor-pointer text-xs font-medium"
      >
        Actions <ChevronDown className="inline size-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
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
