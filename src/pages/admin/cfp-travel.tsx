/**
 * Admin CFP Travel Dashboard
 * Manage speaker travel, flights, and reimbursements
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminHeader from '@/components/admin/AdminHeader';
import { Pagination } from '@/components/atoms';
import { useToast } from '@/contexts/ToastContext';
import type {
  TravelDashboardStats,
  SpeakerWithTravel,
  FlightWithSpeaker,
  ReimbursementWithSpeaker,
} from '@/lib/cfp/admin-travel';
import type { CfpReimbursementStatus, CfpFlightStatus } from '@/lib/types/cfp';

type TabType = 'overview' | 'speakers' | 'flights' | 'reimbursements';

const STATUS_COLORS: Record<CfpReimbursementStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

const FLIGHT_STATUS_COLORS: Record<CfpFlightStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-green-100 text-green-700',
  checked_in: 'bg-blue-100 text-blue-700',
  boarding: 'bg-purple-100 text-purple-700',
  departed: 'bg-indigo-100 text-indigo-700',
  arrived: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  delayed: 'bg-orange-100 text-orange-700',
};

// Query keys for cache management
const travelQueryKeys = {
  all: ['admin', 'travel'] as const,
  stats: ['admin', 'travel', 'stats'] as const,
  speakers: ['admin', 'travel', 'speakers'] as const,
  flights: ['admin', 'travel', 'flights'] as const,
  reimbursements: ['admin', 'travel', 'reimbursements'] as const,
};

// API fetch functions
async function fetchTravelStats(): Promise<TravelDashboardStats> {
  const res = await fetch('/api/admin/cfp/travel/stats');
  if (!res.ok) throw new Error('Failed to fetch travel stats');
  return res.json();
}

async function fetchSpeakers(): Promise<SpeakerWithTravel[]> {
  const res = await fetch('/api/admin/cfp/travel/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  const data = await res.json();
  return data.speakers;
}

async function fetchFlights(): Promise<FlightWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/flights');
  if (!res.ok) throw new Error('Failed to fetch flights');
  const data = await res.json();
  return data.flights;
}

async function fetchReimbursements(): Promise<ReimbursementWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/reimbursements');
  if (!res.ok) throw new Error('Failed to fetch reimbursements');
  const data = await res.json();
  return data.reimbursements;
}

export default function AdminTravelPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [reimbursementFilter, setReimbursementFilter] = useState<CfpReimbursementStatus | 'all'>('pending');
  const [flightDirection, setFlightDirection] = useState<'all' | 'inbound' | 'outbound'>('all');

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [speakersPage, setSpeakersPage] = useState(1);
  const [flightsPage, setFlightsPage] = useState(1);
  const [reimbursementsPage, setReimbursementsPage] = useState(1);

  // Auth check using modern pattern
  const { data: isAuthenticated, isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Data queries - fetch in parallel when authenticated
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: travelQueryKeys.stats,
    queryFn: fetchTravelStats,
    enabled: isAuthenticated === true,
    staleTime: 30 * 1000,
  });

  const { data: speakers = [], isLoading: isLoadingSpeakers } = useQuery({
    queryKey: travelQueryKeys.speakers,
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'speakers'),
    staleTime: 30 * 1000,
  });

  const { data: flights = [], isLoading: isLoadingFlights } = useQuery({
    queryKey: travelQueryKeys.flights,
    queryFn: fetchFlights,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'flights'),
    staleTime: 30 * 1000,
  });

  const { data: reimbursements = [], isLoading: isLoadingReimbursements } = useQuery({
    queryKey: travelQueryKeys.reimbursements,
    queryFn: fetchReimbursements,
    enabled: isAuthenticated === true && (activeTab === 'overview' || activeTab === 'reimbursements'),
    staleTime: 30 * 1000,
  });

  // Mutations with cache invalidation
  const reimbursementMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: 'approved' | 'rejected' | 'paid';
      notes?: string;
    }) => {
      const response = await fetch(`/api/admin/cfp/travel/reimbursements/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, admin_notes: notes }),
      });
      if (!response.ok) throw new Error('Failed to update reimbursement');
      return response.json();
    },
    onSuccess: (_data, { action }) => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.reimbursements });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Reimbursement Updated', `Status changed to ${action}`);
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update reimbursement status');
    },
  });

  const flightMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CfpFlightStatus }) => {
      const response = await fetch(`/api/admin/cfp/travel/flights/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update flight status');
      return response.json();
    },
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.flights });
      queryClient.invalidateQueries({ queryKey: travelQueryKeys.stats });
      toast.success('Flight Updated', `Status changed to ${status.replace('_', ' ')}`);
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to update flight status');
    },
  });

  const filteredReimbursements = reimbursementFilter === 'all'
    ? reimbursements
    : reimbursements.filter(r => r.status === reimbursementFilter);

  const filteredFlights = flightDirection === 'all'
    ? flights
    : flights.filter(f => f.direction === flightDirection);

  // Pagination calculations
  const speakersTotalPages = Math.ceil(speakers.length / ITEMS_PER_PAGE);
  const paginatedSpeakers = useMemo(() => {
    const startIndex = (speakersPage - 1) * ITEMS_PER_PAGE;
    return speakers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [speakers, speakersPage]);

  const flightsTotalPages = Math.ceil(filteredFlights.length / ITEMS_PER_PAGE);
  const paginatedFlights = useMemo(() => {
    const startIndex = (flightsPage - 1) * ITEMS_PER_PAGE;
    return filteredFlights.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFlights, flightsPage]);

  const reimbursementsTotalPages = Math.ceil(filteredReimbursements.length / ITEMS_PER_PAGE);
  const paginatedReimbursements = useMemo(() => {
    const startIndex = (reimbursementsPage - 1) * ITEMS_PER_PAGE;
    return filteredReimbursements.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReimbursements, reimbursementsPage]);

  // Reset page when filters change
  useEffect(() => {
    setFlightsPage(1);
  }, [flightDirection]);

  useEffect(() => {
    setReimbursementsPage(1);
  }, [reimbursementFilter]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      queryClient.clear();
      router.push('/admin');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (isAuthenticated === false) {
    router.push('/admin');
    return null;
  }

  return (
    <>
      <Head>
        <title>Travel Management | Admin - ZurichJS</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader
          title="Travel Management"
          subtitle="Speaker travel & reimbursements"
          onLogout={handleLogout}
        />

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
            {(['overview', 'speakers', 'flights', 'reimbursements'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'bg-[#F1E271] text-black shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                } px-4 sm:px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer capitalize`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {isLoadingStats ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  ))}
                </div>
              ) : stats && (
                <>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Accepted Speakers" value={stats.total_accepted_speakers} />
                    <StatCard label="Travel Confirmed" value={stats.travel_confirmed} subtitle={`of ${stats.total_accepted_speakers}`} color="text-green-600" />
                    <StatCard label="Attending Dinner" value={stats.attending_dinner} color="text-blue-600" />
                    <StatCard label="Attending Activities" value={stats.attending_activities} color="text-purple-600" />
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Pending Reimbursements" value={stats.pending_reimbursements} subtitle={`CHF ${(stats.total_reimbursement_amount / 100).toFixed(2)}`} color="text-yellow-600" />
                    <StatCard label="Arrivals Today" value={stats.flights_arriving_today} color="text-green-600" />
                    <StatCard label="Departures Today" value={stats.flights_departing_today} color="text-red-600" />
                  </div>
                </>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-black mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('reimbursements')}
                    className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg transition-colors"
                  >
                    Review Pending Reimbursements ({stats?.pending_reimbursements || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('speakers')}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors"
                  >
                    View All Speakers
                  </button>
                  <button
                    onClick={() => setActiveTab('flights')}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors"
                  >
                    Flight Tracker
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Speakers Tab */}
          {activeTab === 'speakers' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-black">Accepted Speakers ({speakers.length})</h2>
              </div>
              {isLoadingSpeakers ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-left text-sm text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Speaker</th>
                          <th className="px-4 py-3">Talks</th>
                          <th className="px-4 py-3">Arrival</th>
                          <th className="px-4 py-3">Departure</th>
                          <th className="px-4 py-3">Dinner</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedSpeakers.map((speaker) => (
                          <tr key={speaker.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="font-medium text-gray-900">{speaker.first_name} {speaker.last_name}</div>
                              <div className="text-sm text-gray-500">{speaker.email}</div>
                            </td>
                            <td className="px-4 py-4 text-gray-600">{speaker.accepted_submissions_count}</td>
                            <td className="px-4 py-4 text-gray-600">
                              {speaker.travel?.arrival_date ? new Date(speaker.travel.arrival_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                              {speaker.travel?.departure_date ? new Date(speaker.travel.departure_date).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-4">
                              {speaker.travel?.attending_speakers_dinner ? (
                                <span className="text-green-600">Yes</span>
                              ) : speaker.travel?.attending_speakers_dinner === false ? (
                                <span className="text-red-600">No</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {speaker.travel?.travel_confirmed ? (
                                <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Confirmed</span>
                              ) : speaker.travel ? (
                                <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">In Progress</span>
                              ) : (
                                <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Not Started</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {paginatedSpeakers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No accepted speakers found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={speakersPage}
                    totalPages={speakersTotalPages}
                    onPageChange={setSpeakersPage}
                    pageSize={ITEMS_PER_PAGE}
                    totalItems={speakers.length}
                    variant="light"
                  />
                </>
              )}
            </div>
          )}

          {/* Flights Tab */}
          {activeTab === 'flights' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-bold text-black">Flight Tracker</h2>
                <div className="flex gap-2">
                  {(['all', 'inbound', 'outbound'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setFlightDirection(dir)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                        flightDirection === dir
                          ? 'bg-[#F1E271] text-black'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </div>
              {isLoadingFlights ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-left text-sm text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Speaker</th>
                          <th className="px-4 py-3">Direction</th>
                          <th className="px-4 py-3">Flight</th>
                          <th className="px-4 py-3">Route</th>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedFlights.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No flights found</td>
                          </tr>
                        ) : (
                          paginatedFlights.map((flight) => (
                            <tr key={flight.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 font-medium text-gray-900">
                                {flight.speaker.first_name} {flight.speaker.last_name}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 text-xs rounded capitalize ${
                                  flight.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {flight.direction}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-gray-600">{flight.airline} {flight.flight_number}</td>
                              <td className="px-4 py-4 text-gray-600">{flight.departure_airport} → {flight.arrival_airport}</td>
                              <td className="px-4 py-4 text-gray-600">
                                {flight.departure_time ? new Date(flight.departure_time).toLocaleString() : '-'}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`px-2 py-1 text-xs rounded capitalize ${FLIGHT_STATUS_COLORS[flight.flight_status]}`}>
                                  {flight.flight_status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  value={flight.flight_status}
                                  onChange={(e) => flightMutation.mutate({ id: flight.id, status: e.target.value as CfpFlightStatus })}
                                  disabled={flightMutation.isPending}
                                  className="text-sm px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-50"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="checked_in">Checked In</option>
                                  <option value="boarding">Boarding</option>
                                  <option value="departed">Departed</option>
                                  <option value="arrived">Arrived</option>
                                  <option value="delayed">Delayed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    currentPage={flightsPage}
                    totalPages={flightsTotalPages}
                    onPageChange={setFlightsPage}
                    pageSize={ITEMS_PER_PAGE}
                    totalItems={filteredFlights.length}
                    variant="light"
                  />
                </>
              )}
            </div>
          )}

          {/* Reimbursements Tab */}
          {activeTab === 'reimbursements' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-black">Reimbursements</h2>
                <div className="flex gap-2">
                  {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setReimbursementFilter(status)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                        reimbursementFilter === status
                          ? 'bg-[#F1E271] text-black'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingReimbursements ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : paginatedReimbursements.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No reimbursements found</p>
                </div>
              ) : (
                paginatedReimbursements.map((reimbursement) => (
                  <div key={reimbursement.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium text-gray-900">
                            {reimbursement.speaker.first_name} {reimbursement.speaker.last_name}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[reimbursement.status]}`}>
                            {reimbursement.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {reimbursement.expense_type} - {reimbursement.description}
                        </div>
                        <div className="text-xs text-gray-400">
                          Submitted {new Date(reimbursement.created_at).toLocaleDateString()}
                        </div>
                        {reimbursement.iban && (
                          <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                            <div>IBAN: {reimbursement.iban}</div>
                            {reimbursement.swift_bic && <div>SWIFT: {reimbursement.swift_bic}</div>}
                            {reimbursement.bank_account_holder && <div>Account: {reimbursement.bank_account_holder}</div>}
                          </div>
                        )}
                        {reimbursement.admin_notes && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              <span className="text-gray-400">Note:</span> {reimbursement.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {reimbursement.currency} {(reimbursement.amount / 100).toFixed(2)}
                        </div>
                        {reimbursement.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => reimbursementMutation.mutate({ id: reimbursement.id, action: 'approved' })}
                              disabled={reimbursementMutation.isPending}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => reimbursementMutation.mutate({ id: reimbursement.id, action: 'rejected' })}
                              disabled={reimbursementMutation.isPending}
                              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {reimbursement.status === 'approved' && (
                          <button
                            onClick={() => reimbursementMutation.mutate({ id: reimbursement.id, action: 'paid' })}
                            disabled={reimbursementMutation.isPending}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            Mark as Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              <Pagination
                currentPage={reimbursementsPage}
                totalPages={reimbursementsTotalPages}
                onPageChange={setReimbursementsPage}
                pageSize={ITEMS_PER_PAGE}
                totalItems={filteredReimbursements.length}
                variant="light"
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function StatCard({ label, value, subtitle, color = 'text-gray-900' }: { label: string; value: number; subtitle?: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
