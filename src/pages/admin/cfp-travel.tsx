/**
 * Admin CFP Travel Dashboard
 * Manage speaker travel, flights, and reimbursements
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import {
  getTravelDashboardStats,
  getAcceptedSpeakersWithTravel,
  getAllFlights,
  getAllReimbursements,
  type TravelDashboardStats,
  type SpeakerWithTravel,
  type FlightWithSpeaker,
  type ReimbursementWithSpeaker,
} from '@/lib/cfp/admin-travel';
import type { CfpReimbursementStatus, CfpFlightStatus } from '@/lib/types/cfp';

interface AdminTravelPageProps {
  stats: TravelDashboardStats;
  speakers: SpeakerWithTravel[];
  flights: FlightWithSpeaker[];
  reimbursements: ReimbursementWithSpeaker[];
}

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

export default function AdminTravelPage({
  stats,
  speakers,
  flights,
  reimbursements,
}: AdminTravelPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [reimbursementFilter, setReimbursementFilter] = useState<CfpReimbursementStatus | 'all'>('pending');
  const [flightDirection, setFlightDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const filteredReimbursements = reimbursementFilter === 'all'
    ? reimbursements
    : reimbursements.filter(r => r.status === reimbursementFilter);

  const filteredFlights = flightDirection === 'all'
    ? flights
    : flights.filter(f => f.direction === flightDirection);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleReimbursementAction = async (
    id: string,
    action: 'approved' | 'rejected' | 'paid',
    notes?: string
  ) => {
    setIsUpdating(id);
    try {
      const response = await fetch(`/api/admin/cfp/travel/reimbursements/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, admin_notes: notes }),
      });

      if (response.ok) {
        router.reload();
      }
    } finally {
      setIsUpdating(null);
    }
  };

  const handleFlightStatusUpdate = async (id: string, status: CfpFlightStatus) => {
    setIsUpdating(id);
    try {
      const response = await fetch(`/api/admin/cfp/travel/flights/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        router.reload();
      }
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <>
      <Head>
        <title>Travel Management | Admin - ZurichJS</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-black">Travel Management</h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Speaker travel & reimbursements</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 transition-all"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="hidden sm:inline">Admin</span>
                </Link>
                <Link
                  href="/admin/cfp"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 transition-all"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <span className="hidden sm:inline">CFP</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

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

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-black mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('reimbursements')}
                    className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg transition-colors"
                  >
                    Review Pending Reimbursements ({stats.pending_reimbursements})
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
                    {speakers.map((speaker) => (
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
                    {speakers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No accepted speakers found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                    {filteredFlights.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No flights found</td>
                      </tr>
                    ) : (
                      filteredFlights.map((flight) => (
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
                              onChange={(e) => handleFlightStatusUpdate(flight.id, e.target.value as CfpFlightStatus)}
                              disabled={isUpdating === flight.id}
                              className="text-sm px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
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

              {filteredReimbursements.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No reimbursements found</p>
                </div>
              ) : (
                filteredReimbursements.map((reimbursement) => (
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
                              onClick={() => handleReimbursementAction(reimbursement.id, 'approved')}
                              disabled={isUpdating === reimbursement.id}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReimbursementAction(reimbursement.id, 'rejected')}
                              disabled={isUpdating === reimbursement.id}
                              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {reimbursement.status === 'approved' && (
                          <button
                            onClick={() => handleReimbursementAction(reimbursement.id, 'paid')}
                            disabled={isUpdating === reimbursement.id}
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

export const getServerSideProps: GetServerSideProps<AdminTravelPageProps> = async (ctx) => {
  // Import verifyAdminToken here to avoid issues with server-only code
  const { verifyAdminToken } = await import('@/lib/admin/auth');

  // Verify admin authentication (same as main admin)
  const token = ctx.req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return {
      redirect: { destination: '/admin', permanent: false },
    };
  }

  // Fetch all data
  const [stats, speakers, flights, reimbursements] = await Promise.all([
    getTravelDashboardStats(),
    getAcceptedSpeakersWithTravel(),
    getAllFlights(),
    getAllReimbursements(),
  ]);

  return {
    props: {
      stats,
      speakers,
      flights,
      reimbursements,
    },
  };
};
