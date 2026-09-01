import React from 'react';
import { CheckCircle2, Clock, ShieldOff } from 'lucide-react';
import {
  DOOR_ROLES,
  DOOR_ROLE_LABELS,
  DOOR_ROLE_LANE,
  type DoorRole,
  type DoorStaff,
} from '@/lib/types/checkin';

export interface DoorStaffTableProps {
  staff: DoorStaff[];
  pendingId?: string | null;
  onChangeRole: (id: string, role: DoorRole) => void;
  onSetActive: (id: string, isActive: boolean) => void;
  className?: string;
}

/**
 * The crew list.
 *
 * Two states are shown separately because they mean different things
 * operationally: "invited" is someone who has not signed in yet and may need
 * chasing before the day, while "active" is someone ready to work. Conflating
 * them is how a lead discovers at 08:30 that half the crew never accepted.
 *
 * Role is editable in place, since promoting a scanner to a lead mid-event is a
 * normal thing to need when the problem desk gets busy.
 */
export const DoorStaffTable: React.FC<DoorStaffTableProps> = ({
  staff,
  pendingId,
  onChangeRole,
  onSetActive,
  className = '',
}) => (
  <div className={`rounded-xl border border-gray-200 bg-white ${className}`}>
    {/* Mobile Card View */}
    <div className="divide-y divide-gray-200 md:hidden">
      {staff.map((member) => {
        const busy = pendingId === member.id;
        return (
          <div
            key={member.id}
            className={`p-4 ${member.isActive ? '' : 'bg-gray-50/60'}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-black">{member.name || '—'}</p>
                <p className="truncate text-sm text-gray-600">{member.email}</p>
              </div>
              <StaffStatus member={member} />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`role-mobile-${member.id}`}>
                Role
              </label>
              <select
                id={`role-mobile-${member.id}`}
                value={member.role}
                disabled={busy || !member.isActive}
                onChange={(e) => onChangeRole(member.id, e.target.value as DoorRole)}
                className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {DOOR_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {DOOR_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-600">{DOOR_ROLE_LANE[member.role]}</p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => onSetActive(member.id, !member.isActive)}
              className={`w-full cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                member.isActive
                  ? 'border border-red-200 bg-red-50 text-red-700'
                  : 'border border-green-200 bg-green-50 text-green-700'
              }`}
            >
              {busy ? '…' : member.isActive ? 'Revoke access' : 'Restore access'}
            </button>
          </div>
        );
      })}
    </div>

    {/* Desktop Table View */}
    <div className="hidden overflow-x-auto md:block">
      <table className="min-w-full divide-y divide-gray-200">
        <caption className="sr-only">Door check-in crew</caption>
        <thead className="bg-gray-50">
          <tr>
            <Th>Volunteer</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {staff.map((member) => {
            const busy = pendingId === member.id;
            return (
              <tr key={member.id} className={member.isActive ? '' : 'bg-gray-50/60'}>
                <td className="px-4 py-3">
                  <p className="font-medium text-black">{member.name || '—'}</p>
                  <p className="break-all text-sm text-gray-600">{member.email}</p>
                </td>

                <td className="px-4 py-3">
                  <label className="sr-only" htmlFor={`role-${member.id}`}>
                    Role for {member.name || member.email}
                  </label>
                  <select
                    id={`role-${member.id}`}
                    value={member.role}
                    disabled={busy || !member.isActive}
                    onChange={(e) => onChangeRole(member.id, e.target.value as DoorRole)}
                    className="cursor-pointer rounded-lg border border-gray-300 px-2 py-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {DOOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {DOOR_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 max-w-[15rem] text-xs text-gray-600">
                    {DOOR_ROLE_LANE[member.role]}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <StaffStatus member={member} />
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSetActive(member.id, !member.isActive)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                      member.isActive
                        ? 'text-red-700 hover:bg-red-50'
                        : 'text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {busy ? '…' : member.isActive ? 'Revoke' : 'Restore'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th
    scope="col"
    className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
  >
    {children}
  </th>
);

const StaffStatus: React.FC<{ member: DoorStaff }> = ({ member }) => {
  if (!member.isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <ShieldOff className="h-4 w-4" aria-hidden="true" />
        Revoked
      </span>
    );
  }

  if (!member.acceptedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600">
        <Clock className="h-4 w-4" aria-hidden="true" />
        Not signed in yet
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700">
      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      Ready
    </span>
  );
};
