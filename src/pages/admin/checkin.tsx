/**
 * Admin Check-in Page
 * Mobile-friendly interface for event staff to check in attendees
 * via search or QR code scanning
 */

import { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  QrCode,
  UserCheck,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminKeys } from '@/lib/admin/query-keys';
import { adminFetch } from '@/lib/admin/api-fetch';

interface Ticket {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_category: string | null;
  ticket_stage: string | null;
  status: string;
  checked_in: boolean | null;
  checked_in_at: string | null;
}

interface CheckInResult {
  success: boolean;
  alreadyCheckedIn?: boolean;
  message?: string;
  error?: string;
}

async function fetchTickets(signal?: AbortSignal): Promise<Ticket[]> {
  const data = await adminFetch<{ tickets: Ticket[] }>('/api/admin/tickets', { signal });
  return data.tickets;
}

export default function AdminCheckinPage() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const { data: tickets = [], isPending: loading } = useQuery({
    queryKey: adminKeys.ticketList(),
    queryFn: ({ signal }) => fetchTickets(signal),
    staleTime: 30_000,
    enabled: isAuthenticated,
  });

  const checkInMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const response = await fetch(`/api/validate/${ticketId}`, { method: 'POST' });
      const data: CheckInResult = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Check-in failed');
      }
      return data;
    },
    onMutate: (ticketId) => {
      setCheckingInId(ticketId);
    },
    onSuccess: (data) => {
      if (data.alreadyCheckedIn) {
        showToast('info', 'Already checked in');
      } else {
        showToast('success', 'Checked in successfully!');
      }
      queryClient.invalidateQueries({ queryKey: adminKeys.tickets() });
    },
    onError: (err: Error) => {
      showToast('error', err.message || 'Failed to check in');
    },
    onSettled: () => {
      setCheckingInId(null);
    },
  });

  const confirmedTickets = useMemo(
    () => tickets.filter((t) => t.status === 'confirmed'),
    [tickets]
  );

  const stats = useMemo(() => {
    const total = confirmedTickets.length;
    const checkedIn = confirmedTickets.filter((t) => t.checked_in).length;
    const remaining = total - checkedIn;
    const percentage = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    return { total, checkedIn, remaining, percentage };
  }, [confirmedTickets]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return confirmedTickets
      .filter(
        (t) =>
          t.first_name.toLowerCase().includes(query) ||
          t.last_name.toLowerCase().includes(query) ||
          t.email.toLowerCase().includes(query) ||
          `${t.first_name} ${t.last_name}`.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [confirmedTickets, searchQuery]);

  const handleCheckIn = (ticketId: string) => {
    if (checkingInId) return;
    checkInMutation.mutate(ticketId);
  };

  if (authLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <>
      <Head>
        <title>Check-in - ZurichJS Conference</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : toast.type === 'info'
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : toast.type === 'info' ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <X className="w-5 h-5 shrink-0" />
              )}
              <p className="text-sm font-medium flex-1">{toast.text}</p>
              <button
                onClick={() => setToast(null)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-black">Check-in</h1>
                  <p className="text-xs text-gray-500">ZurichJS Conf 2026</p>
                </div>
              </div>
              <a
                href="/admin"
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                Dashboard
              </a>
            </div>
          </div>
        </header>

        {/* Stats cards */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold text-black">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-600 font-medium">In</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.checkedIn}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">Left</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.remaining}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold text-black">{stats.percentage}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Search section */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Search results */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : searchQuery.trim() ? (
              searchResults.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {searchResults.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-black truncate">
                          {ticket.first_name} {ticket.last_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{ticket.email}</p>
                        <p className="text-xs text-gray-400 mt-1 capitalize">
                          {ticket.ticket_category || 'Ticket'}
                        </p>
                      </div>
                      {ticket.checked_in ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm font-semibold">In</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(ticket.id)}
                          disabled={checkingInId === ticket.id}
                          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-[#e8d95e] active:bg-[#d9ca50] text-black rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
                        >
                          {checkingInId === ticket.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <UserCheck className="w-5 h-5" />
                          )}
                          <span>Check In</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No attendees found</p>
                </div>
              )
            ) : (
              <div className="py-8 text-center">
                <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">Search for an attendee to check in</p>
              </div>
            )}
          </div>
        </div>

        {/* QR Scanner hint */}
        <div className="px-4 pb-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Scan QR Codes</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Open your phone&apos;s camera and scan attendee QR codes to check them in instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
