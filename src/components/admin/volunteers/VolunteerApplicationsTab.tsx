/**
 * Volunteer Applications Tab
 * Admin list of volunteer applications with filters
 */

import { useState, useMemo } from 'react';
import { Search, FileText } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { VolunteerStatusBadge } from './VolunteerStatusBadge';
import { VolunteerApplicationDetail } from './VolunteerApplicationDetail';
import { useVolunteerApplications, useVolunteerRoles } from '@/hooks/useVolunteer';
import { VOLUNTEER_APPLICATION_STATUSES } from '@/lib/types/volunteer';
import { APPLICATION_STATUS_LABELS } from '@/lib/volunteer/status';
import type { VolunteerApplicationWithRole, VolunteerApplicationStatus } from '@/lib/types/volunteer';

export function VolunteerApplicationsTab() {
  const [statusFilter, setStatusFilter] = useState<VolunteerApplicationStatus | ''>('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<VolunteerApplicationWithRole | null>(null);

  const { data: roles } = useVolunteerRoles();
  const { data: applications, isLoading } = useVolunteerApplications({
    status: statusFilter || undefined,
    role_id: roleFilter || undefined,
    search: searchQuery || undefined,
  });

  if (isLoading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-5 w-40 bg-gray-100 rounded mb-2" />
            <div className="h-4 w-56 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or reference..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VolunteerApplicationStatus | '')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
        >
          <option value="">All Statuses</option>
          {VOLUNTEER_APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
        >
          <option value="">All Roles</option>
          {(roles || []).map((role) => (
            <option key={role.id} value={role.id}>{role.title}</option>
          ))}
        </select>
      </div>

      {/* Applications List */}
      {!applications || applications.length === 0 ? (
        <AdminEmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No applications found"
          description={statusFilter || roleFilter || searchQuery
            ? 'Try adjusting your filters.'
            : 'Applications will appear here once volunteers start applying.'}
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ref</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-black">{app.first_name} {app.last_name}</div>
                      <div className="text-xs text-gray-500">{app.email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{app.role_title}</td>
                    <td className="px-4 py-3">
                      <VolunteerStatusBadge status={app.status} type="application" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{app.application_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-black">{app.first_name} {app.last_name}</p>
                    <p className="text-xs text-gray-500">{app.email}</p>
                  </div>
                  <VolunteerStatusBadge status={app.status} type="application" />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{app.role_title}</span>
                  <span>{new Date(app.submitted_at).toLocaleDateString()}</span>
                  <span className="font-mono">{app.application_id}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <VolunteerApplicationDetail
        application={selectedApp}
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
      />
    </div>
  );
}
