/**
 * Overview Tab Component
 * Dashboard stats and quick actions
 */

import type { TravelDashboardStats } from '@/lib/cfp/admin-travel';
import type { TabType } from './types';

interface OverviewTabProps {
  stats: TravelDashboardStats | undefined;
  isLoading: boolean;
  onNavigate: (tab: TabType) => void;
}

export function OverviewTab({ stats, isLoading, onNavigate }: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Speaker stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Accepted Speakers" value={stats.total_accepted_speakers} />
        <StatCard
          label="Travel Confirmed"
          value={stats.travel_confirmed}
          subtitle={`of ${stats.total_accepted_speakers}`}
          color="text-green-600"
        />
        <StatCard label="Attending Dinner" value={stats.attending_dinner} color="text-blue-600" />
        <StatCard label="Attending Activities" value={stats.attending_activities} color="text-purple-600" />
      </div>

      {/* Hotel & flight stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Hotels Booked" value={stats.hotels_booked} color="text-green-600" />
        <StatCard label="Hotels Pending" value={stats.hotels_pending} color="text-yellow-600" />
        <StatCard label="Total Hotel Nights" value={stats.total_hotel_nights} color="text-blue-600" />
        <StatCard
          label="Pending Invoices"
          value={stats.pending_invoices}
          subtitle={`CHF ${(stats.total_invoice_amount / 100).toFixed(2)}`}
          color="text-yellow-600"
        />
      </div>

      {/* Today's flights */}
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard label="Arrivals Today" value={stats.flights_arriving_today} color="text-green-600" />
        <StatCard label="Departures Today" value={stats.flights_departing_today} color="text-red-600" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-black mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('speakers')}
            className="px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-medium rounded-lg transition-colors cursor-pointer"
          >
            View All Speakers
          </button>
          <button
            onClick={() => onNavigate('arrivals')}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors cursor-pointer"
          >
            Airport Arrivals
          </button>
          <button
            onClick={() => onNavigate('flights')}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors cursor-pointer"
          >
            Flight Tracker
          </button>
          <button
            onClick={() => onNavigate('invoices')}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors cursor-pointer"
          >
            Review Invoices ({stats.pending_invoices})
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  color = 'text-gray-900',
}: {
  label: string;
  value: number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
