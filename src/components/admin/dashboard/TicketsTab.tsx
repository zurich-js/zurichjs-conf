/**
 * TicketsTab - Main tickets management tab
 * Includes search, sort, pagination, and multiple modals
 */

import { useState, useEffect, useMemo } from 'react';
import { UpgradeToVipModal } from '@/components/admin/tickets';
import { TicketDetailsModal } from './TicketDetailsModal';
import { ReassignModal } from './ReassignModal';
import { ConfirmModal } from './ConfirmModal';
import type { Ticket, ToastMessage, SortField, SortDirection } from './types';

const ITEMS_PER_PAGE = 10;

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
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const filteredAndSortedTickets = useMemo(() => {
    let result = [...tickets];
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
  }, [tickets, searchQuery, sortField, sortDirection]);

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
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <TicketHeader tickets={tickets} filteredCount={filteredAndSortedTickets.length} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <DesktopTable tickets={paginatedTickets} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} onViewTicket={(t) => { setSelectedTicket(t); setShowDetailsModal(true); }} />
        <MobileCards tickets={paginatedTickets} onViewTicket={(t) => { setSelectedTicket(t); setShowDetailsModal(true); }} />
        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filteredAndSortedTickets.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      </div>

      {/* Modals */}
      {showDetailsModal && selectedTicket && (
        <TicketDetailsModal ticket={selectedTicket}
          onClose={() => { setShowDetailsModal(false); setSelectedTicket(null); }}
          onResend={() => { setShowDetailsModal(false); setShowResendConfirm(true); }}
          onReassign={() => { setShowDetailsModal(false); setShowReassignModal(true); }}
          onRefund={() => { setShowDetailsModal(false); setShowRefundConfirm(true); }}
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

function TicketHeader({ tickets, filteredCount, searchQuery, setSearchQuery }: { tickets: Ticket[]; filteredCount: number; searchQuery: string; setSearchQuery: (q: string) => void }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-black">Ticket Management</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{filteredCount} of {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}{searchQuery && ' (filtered)'}</p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium">{tickets.filter(t => t.status === 'confirmed').length} confirmed</span>
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">{tickets.filter(t => t.status === 'pending').length} pending</span>
        </div>
      </div>
      <div className="mt-4 relative">
        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search by name, email, ID, status..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (sortField !== field) return <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
  return sortDirection === 'asc'
    ? <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
    : <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
}

function DesktopTable({ tickets, sortField, sortDirection, onSort, onViewTicket }: { tickets: Ticket[]; sortField: SortField; sortDirection: SortDirection; onSort: (f: SortField) => void; onViewTicket: (t: Ticket) => void }) {
  const statusClass = (s: string) => s === 'confirmed' ? 'bg-green-100 text-green-800' : s === 'refunded' ? 'bg-red-100 text-red-800' : s === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800';
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">ID</th>
            <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => onSort('first_name')}>
              <div className="flex items-center gap-1">Name<SortIcon field="first_name" sortField={sortField} sortDirection={sortDirection} /></div>
            </th>
            <th className="hidden lg:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => onSort('email')}>
              <div className="flex items-center gap-1">Email<SortIcon field="email" sortField={sortField} sortDirection={sortDirection} /></div>
            </th>
            <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => onSort('ticket_category')}>
              <div className="flex items-center gap-1">Type<SortIcon field="ticket_category" sortField={sortField} sortDirection={sortDirection} /></div>
            </th>
            <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => onSort('amount_paid')}>
              <div className="flex items-center gap-1">Amount<SortIcon field="amount_paid" sortField={sortField} sortDirection={sortDirection} /></div>
            </th>
            <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100" onClick={() => onSort('status')}>
              <div className="flex items-center gap-1">Status<SortIcon field="status" sortField={sortField} sortDirection={sortDirection} /></div>
            </th>
            <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tickets.map((t) => (
            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-mono text-black font-medium">{t.id.substring(0, 8)}...</td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-black font-medium">{t.first_name} {t.last_name}</td>
              <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{t.email}</td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <div className="flex flex-col space-y-1"><span className="font-medium text-black capitalize">{t.ticket_category}</span><span className="text-xs text-gray-500 capitalize">{t.ticket_stage.replace('_', ' ')}</span></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-black font-semibold">{(t.amount_paid / 100).toFixed(2)} {t.currency}</td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusClass(t.status)}`}>{t.status}</span></td>
              <td className="px-4 lg:px-6 py-4 text-sm">
                <button onClick={() => onViewTicket(t)} className="inline-flex items-center px-3 py-1.5 border border-[#F1E271] rounded-md text-xs font-medium text-black bg-[#F1E271] hover:bg-[#e8d95e] cursor-pointer transition-colors">
                  <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileCards({ tickets, onViewTicket }: { tickets: Ticket[]; onViewTicket: (t: Ticket) => void }) {
  const statusClass = (s: string) => s === 'confirmed' ? 'bg-green-100 text-green-800' : s === 'refunded' ? 'bg-red-100 text-red-800' : s === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800';
  return (
    <div className="md:hidden space-y-4 p-4">
      {tickets.map((t) => (
        <div key={t.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0"><h3 className="text-base font-bold text-black truncate">{t.first_name} {t.last_name}</h3><p className="text-xs text-gray-600 truncate mt-0.5">{t.email}</p></div>
              <span className={`ml-2 px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${statusClass(t.status)}`}>{t.status}</span>
            </div>
          </div>
          <div className="px-4 py-3 space-y-2.5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Ticket ID</p><p className="text-black font-mono text-xs">{t.id.substring(0, 12)}...</p></div>
              <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Amount</p><p className="text-black font-bold">{(t.amount_paid / 100).toFixed(2)} {t.currency}</p></div>
            </div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Ticket Type</p><div className="flex items-center gap-2"><span className="text-sm font-medium text-black capitalize">{t.ticket_category}</span><span className="text-xs text-gray-500">•</span><span className="text-xs text-gray-600 capitalize">{t.ticket_stage.replace('_', ' ')}</span></div></div>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <button onClick={() => onViewTicket(t)} className="w-full flex items-center justify-center px-3 py-2.5 border border-[#F1E271] rounded-lg text-sm font-medium text-black bg-[#F1E271] active:bg-[#e8d95e] transition-colors">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (currentPage <= 3) return i + 1;
    if (currentPage >= totalPages - 2) return totalPages - 4 + i;
    return currentPage - 2 + i;
  });
  return (
    <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-600">Showing {start} to {end} of {totalItems} results</div>
        <div className="flex items-center gap-2">
          <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">First</button>
          <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-1">
            {pages.map((p) => (
              <button key={p} onClick={() => onPageChange(p)} className={`w-8 h-8 text-sm font-medium rounded-lg cursor-pointer ${currentPage === p ? 'bg-[#F1E271] text-black border border-[#F1E271]' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>{p}</button>
            ))}
          </div>
          <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Last</button>
        </div>
      </div>
    </div>
  );
}
