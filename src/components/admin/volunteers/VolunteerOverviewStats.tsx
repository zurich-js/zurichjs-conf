/**
 * Volunteer Overview Stats
 * Dashboard stats cards for the volunteer admin overview tab
 */

import { Briefcase, FileText, Clock, CheckCircle, Users } from 'lucide-react';
import { useVolunteerStats } from '@/hooks/useVolunteer';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-black">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function VolunteerOverviewStats() {
  const { data: stats, isLoading } = useVolunteerStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100" />
              <div>
                <div className="h-7 w-12 bg-gray-100 rounded mb-1" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
      <StatCard
        icon={<Briefcase className="w-5 h-5 text-blue-600" />}
        label="Open Roles"
        value={stats.open_roles}
        color="bg-blue-50"
      />
      <StatCard
        icon={<FileText className="w-5 h-5 text-purple-600" />}
        label="Total Applications"
        value={stats.total_applications}
        color="bg-purple-50"
      />
      <StatCard
        icon={<Clock className="w-5 h-5 text-amber-600" />}
        label="Pending Review"
        value={stats.pending_review}
        color="bg-amber-50"
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5 text-green-600" />}
        label="Accepted"
        value={stats.accepted}
        color="bg-green-50"
      />
      <StatCard
        icon={<Users className="w-5 h-5 text-brand-blue" />}
        label="Team Size"
        value={stats.team_size}
        color="bg-sky-50"
      />
    </div>
  );
}
