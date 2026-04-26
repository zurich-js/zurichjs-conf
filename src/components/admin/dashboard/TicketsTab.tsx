/**
 * TicketsTab - Main tickets management tab
 * Includes search, sort, pagination, and multiple modals
 */

import { useState, useEffect, useMemo } from 'react';
import { createColumnHelper, type ColumnDef, type SortingState, type Updater } from '@tanstack/react-table';
import { Eye, Search, Globe2, Plus, X } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { UpgradeToVipModal } from '@/components/admin/tickets';
import { Button, Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import { IssueTicketTab } from './IssueTicketTab';
import { TicketDetailsModal } from './TicketDetailsModal';
import { ReassignModal } from './ReassignModal';
import { ConfirmModal } from './ConfirmModal';
import type { Ticket, ToastMessage, SortField, SortDirection } from './types';

const ITEMS_PER_PAGE = 10;
const columnHelper = createColumnHelper<Ticket>();

function getStatusClass(status: string) {
  if (status === 'confirmed') return 'bg-green-100 text-green-800';
  if (status === 'refunded') return 'bg-red-100 text-red-800';
  if (status === 'cancelled') return 'bg-text-brand-gray-lightest text-gray-800';
  return 'bg-yellow-100 text-yellow-800';
}

export function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showIssueTicketModal, setShowIssueTicketModal] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterNonSwiss, setFilterNonSwiss] = useState(false);
  const hasActiveFilters = Boolean(searchQuery || filterNonSwiss);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const filteredAndSortedTickets = useMemo(() => {
    let result = [...tickets];
    // Filter non-Swiss countries
    if (filterNonSwiss) {
      const swissVariants = ['switzerland', 'ch', 'schweiz', 'suisse', 'svizzera'];
      result = result.filter((t) => {
        const country = t.metadata?.session_metadata?.country?.toLowerCase()?.trim();
        return country && !swissVariants.includes(country);
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.first_name.toLowerCase().includes(query) || t.last_name.toLowerCase().includes(query) ||
        t.email.toLowerCase().includes(query) || t.id.toLowerCase().includes(query) ||
        t.ticket_category?.toLowerCase().includes(query) || t.ticket_stage?.toLowerCase().includes(query) ||
        t.status.toLowerCase().includes(query)
      );
    }
    result.sort((a, b) => {
      let aVal: string | number = '', bVal: string | number = '';
      switch (sortField) {
        case 'created_at': aVal = a.created_at || ''; bVal = b.created_at || ''; break;
        case 'first_name': aVal = `${a.first_name} ${a.last_name}`.toLowerCase(); bVal = `${b.first_name} ${b.last_name}`.toLowerCase(); break;
        case 'email': aVal = a.email.toLowerCase(); bVal = b.email.toLowerCase(); break;
        case 'amount_paid': aVal = a.amount_paid; bVal = b.amount_paid; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'ticket_category': aVal = a.ticket_category || ''; bVal = b.ticket_category || ''; break;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [tickets, searchQuery, sortField, sortDirection, filterNonSwiss]);

  const totalPages = Math.ceil(filteredAndSortedTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedTickets, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/tickets');
      if (res.ok) { const data = await res.json(); setTickets(data.tickets); }
    } catch (err) { console.error('Failed to fetch tickets:', err); }
    finally { setLoading(false); }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const sorting = useMemo<SortingState>(() => [{ id: sortField, desc: sortDirection === 'desc' }], [sortField, sortDirection]);

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const nextRule = next[0];

    if (!nextRule) return;
    handleSort(nextRule.id as SortField);
  };

  const columns = useMemo(() => ([
    columnHelper.accessor('id', {
      header: 'ID',
      enableSorting: false,
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium text-black">
          {row.original.id.substring(0, 8)}...
        </span>
      ),
    }),
    columnHelper.display({
      id: 'first_name',
      header: 'Name',
      enableSorting: true,
      size: 220,
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium text-black">{row.original.first_name} {row.original.last_name}</div>
          <div className="mt-1 text-xs text-brand-gray-medium md:hidden">{row.original.email}</div>
        </div>
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      enableSorting: true,
      size: 280,
      cell: ({ getValue }) => <span className="text-gray-700">{getValue()}</span>,
    }),
    columnHelper.accessor('ticket_category', {
      header: 'Type',
      enableSorting: true,
      size: 170,
      cell: ({ row, getValue }) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium capitalize text-black">{getValue()}</span>
          <span className="text-xs capitalize text-brand-gray-medium">{row.original.ticket_stage.replace('_', ' ')}</span>
        </div>
      ),
    }),
    columnHelper.accessor('amount_paid', {
      header: 'Amount',
      enableSorting: true,
      size: 140,
      cell: ({ row, getValue }) => (
        <span className="font-semibold text-black">{(getValue() / 100).toFixed(2)} {row.original.currency}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      enableSorting: true,
      size: 150,
      cell: ({ getValue }) => (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(getValue())}`}>
          {getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 120,
      cell: ({ row }) => (
        <Button
          variant="primary"
          size="sm"
          className="rounded-lg px-3 py-1.5 text-sm"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedTicket(row.original);
            setShowDetailsModal(true);
          }}
        >
          <Eye className="h-4 w-4" />
          <span>View</span>
        </Button>
      ),
    }),
  ] as Array<ColumnDef<Ticket, unknown>>), []);

  const handleResend = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/resend`, { method: 'POST' });
      if (res.ok) { showToast('success', 'Ticket email resent successfully!'); setShowResendConfirm(false); setSelectedTicket(null); }
      else showToast('error', 'Failed to resend ticket email');
    } catch { showToast('error', 'Error resending ticket email'); }
  };

  const handleRefund = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/refund`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'requested_by_customer' }),
      });
      if (res.ok) { showToast('success', 'Ticket refunded successfully!'); fetchTickets(); setShowRefundConfirm(false); setSelectedTicket(null); }
      else { const data = await res.json(); showToast('error', `Failed to refund ticket: ${data.error}`); }
    } catch { showToast('error', 'Error refunding ticket'); }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/cancel`, { method: 'POST' });
      if (res.ok) { showToast('success', 'Ticket cancelled successfully!'); fetchTickets(); setShowCancelConfirm(false); setSelectedTicket(null); }
      else showToast('error', 'Failed to cancel ticket');
    } catch { showToast('error', 'Error cancelling ticket'); }
  };

  const handleDelete = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, { method: 'DELETE' });
      if (res.ok) { showToast('success', 'Ticket deleted successfully!'); fetchTickets(); setShowDeleteConfirm(false); setShowDetailsModal(false); setSelectedTicket(null); }
      else { const data = await res.json(); showToast('error', `Failed to delete ticket: ${data.error}`); }
    } catch { showToast('error', 'Error deleting ticket'); }
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
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <AdminDataTable
        data={paginatedTickets}
        columns={columns}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        onRowClick={(ticket) => {
          setSelectedTicket(ticket);
          setShowDetailsModal(true);
        }}
        toolbar={(
          <AdminTableToolbar
            left={hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterNonSwiss(false);
                }}
                className="ml-2 inline-flex text-xs text-brand-gray-dark underline hover:text-black cursor-pointer"
              >
                Reset filters
              </button>
            ) : undefined}
            right={(
              <>
                <div className="relative min-w-[280px] max-w-full flex-1 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-medium" />
                  <input
                    type="text"
                    placeholder="Search by name, email, ID, status..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-black placeholder:text-brand-gray-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-medium transition-colors hover:text-brand-gray-dark"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <button
                  onClick={() => setFilterNonSwiss(!filterNonSwiss)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    filterNonSwiss
                      ? 'border-blue-300 bg-blue-100 text-blue-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Globe2 className="h-4 w-4" />
                  <span>Non-Swiss Only</span>
                </button>
                <button
                  onClick={() => setShowIssueTicketModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#e8d95e]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Issue Ticket</span>
                </button>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (ticket) => (
            <AdminMobileCard key={ticket.id} className="overflow-hidden p-0">
              <div className="border-b border-brand-gray-lightest bg-gradient-to-r from-gray-50 to-white px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-black">{ticket.first_name} {ticket.last_name}</h3>
                    <p className="mt-0.5 truncate text-xs text-brand-gray-dark">{ticket.email}</p>
                  </div>
                  <span className={`ml-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
              </div>
              <div className="space-y-3 px-4 py-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-gray-medium">Ticket ID</p>
                    <p className="font-mono text-xs text-black">{ticket.id.substring(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-gray-medium">Amount</p>
                    <p className="font-bold text-black">{(ticket.amount_paid / 100).toFixed(2)} {ticket.currency}</p>
                  </div>
                </div>
                <div>
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-gray-medium">Ticket Type</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize text-black">{ticket.ticket_category}</span>
                    <span className="text-xs text-brand-gray-medium">•</span>
                    <span className="text-xs capitalize text-brand-gray-dark">{ticket.ticket_stage.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-brand-gray-lightest bg-gray-50 px-4 py-3">
                <button
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowDetailsModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-primary bg-brand-primary px-3 py-2.5 text-sm font-medium text-black transition-colors active:bg-[#e8d95e]"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Details</span>
                </button>
              </div>
            </AdminMobileCard>
          ),
        }}
        pagination={(
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAndSortedTickets.length}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            variant="light"
          />
        )}
      />

      {/* Modals */}
      {showDetailsModal && selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket}
          onClose={() => { setShowDetailsModal(false); setSelectedTicket(null); }}
          onResend={() => { setShowDetailsModal(false); setShowResendConfirm(true); }}
          onReassign={() => { setShowDetailsModal(false); setShowReassignModal(true); }}
          onRefund={() => { setShowDetailsModal(false); setShowRefundConfirm(true); }}
          onTicketUpdate={() => { fetchTickets(); setShowDetailsModal(false); setSelectedTicket(null); }}
          onCancel={() => { setShowDetailsModal(false); setShowCancelConfirm(true); }}
          onDelete={() => { setShowDetailsModal(false); setShowDeleteConfirm(true); }}
          onUpgrade={() => { setShowDetailsModal(false); setShowUpgradeModal(true); }}
        />
      )}
      {showReassignModal && selectedTicket && (
        <ReassignModal ticket={selectedTicket}
          onClose={() => { setShowReassignModal(false); setSelectedTicket(null); }}
          onSuccess={() => { fetchTickets(); setShowReassignModal(false); setSelectedTicket(null); }}
          showToast={showToast}
        />
      )}
      {showResendConfirm && selectedTicket && (
        <ConfirmModal title="Resend Ticket Email" message="Resend the ticket confirmation email to the customer?"
          details={[`Ticket ID: ${selectedTicket.id}`, `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`, `Email: ${selectedTicket.email}`, '', 'This action will:', '• Send a new copy of the ticket email', '• Include the QR code and ticket details']}
          confirmText="Send Email" confirmColor="gray" onConfirm={handleResend} onCancel={() => { setShowResendConfirm(false); setSelectedTicket(null); }}
        />
      )}
      {showRefundConfirm && selectedTicket && (
        <ConfirmModal title="Refund Ticket" message="Are you sure you want to refund this ticket?"
          details={[`Ticket ID: ${selectedTicket.id}`, `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`, `Amount: ${(selectedTicket.amount_paid / 100).toFixed(2)} ${selectedTicket.currency}`, '', 'This action will:', '• Process a full refund via Stripe', '• Update ticket status to "refunded"', '• This action cannot be undone']}
          confirmText="Process Refund" confirmColor="red" onConfirm={handleRefund} onCancel={() => { setShowRefundConfirm(false); setSelectedTicket(null); }}
        />
      )}
      {showCancelConfirm && selectedTicket && (
        <ConfirmModal title="Cancel Ticket" message="Are you sure you want to cancel this ticket?"
          details={[`Ticket ID: ${selectedTicket.id}`, `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`, '', 'This action will:', '• Mark the ticket as cancelled', '• NOT process a refund']}
          confirmText="Cancel Ticket" confirmColor="gray" onConfirm={handleCancel} onCancel={() => { setShowCancelConfirm(false); setSelectedTicket(null); }}
        />
      )}
      {showDeleteConfirm && selectedTicket && (
        <ConfirmModal title="Delete Ticket" message="Are you sure you want to permanently delete this ticket?"
          details={[`Ticket ID: ${selectedTicket.id}`, `Customer: ${selectedTicket.first_name} ${selectedTicket.last_name}`, '', 'WARNING: This action will:', '• Permanently remove the ticket from the database', '• This action CANNOT be undone']}
          confirmText="Delete Permanently" confirmColor="red" onConfirm={handleDelete} onCancel={() => { setShowDeleteConfirm(false); setSelectedTicket(null); }}
        />
      )}
      {showUpgradeModal && selectedTicket && (
        <UpgradeToVipModal isOpen={showUpgradeModal}
          onClose={() => { setShowUpgradeModal(false); setSelectedTicket(null); }}
          ticket={{ id: selectedTicket.id, firstName: selectedTicket.first_name, lastName: selectedTicket.last_name, email: selectedTicket.email, company: selectedTicket.company, ticketCategory: selectedTicket.ticket_category, ticketStage: selectedTicket.ticket_stage }}
          onSuccess={() => { fetchTickets(); showToast('success', 'Ticket upgraded to VIP successfully!'); }}
        />
      )}
      {showIssueTicketModal && (
        <AdminModal
          onClose={() => setShowIssueTicketModal(false)}
          title="Issue Ticket"
          description="Create a ticket manually without leaving the tickets table."
          size="3xl"
          showHeader={false}
        >
          <IssueTicketTab
            embedded
            onIssued={() => {
              fetchTickets();
            }}
          />
        </AdminModal>
      )}
    </>
  );
}

// Sub-components
function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 right-4 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={toast.type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
        </svg>
        <p className="text-sm font-medium">{toast.text}</p>
        <button onClick={onDismiss} className="ml-2 p-1 hover:bg-black/5 rounded transition-colors cursor-pointer">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
