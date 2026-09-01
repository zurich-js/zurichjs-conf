import React, { useState } from 'react';
import { ShieldOff, UserPlus } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminErrorState } from '@/components/admin/AdminErrorState';
import {
  useDeactivateAllDoorStaff,
  useDoorStaff,
  useUpdateDoorStaff,
} from '@/hooks/checkin/useDoorStaff';
import type { DoorRole } from '@/lib/types/checkin';
import { DoorRoleGuide } from './DoorRoleGuide';
import { DoorStaffTable } from './DoorStaffTable';
import { InviteDoorStaffForm } from './InviteDoorStaffForm';

export interface DoorStaffTabProps {
  className?: string;
}

/**
 * Manage the door check-in crew.
 *
 * This tab is the ONLY way anyone gains door access, so it is door-blocking in
 * the plan: there is no seeding script and no fallback. It is admin-gated rather
 * than door-gated for the same reason — the first staff row cannot require a
 * staff row to exist.
 */
export const DoorStaffTab: React.FC<DoorStaffTabProps> = ({ className = '' }) => {
  const { data: staff, isLoading, isError, refetch } = useDoorStaff();
  const updateStaff = useUpdateDoorStaff();
  const deactivateAll = useDeactivateAllDoorStaff();
  const [confirmingTeardown, setConfirmingTeardown] = useState(false);
  // Mirrors the invite form's selection so the comparison table highlights the
  // column being decided about.
  const [previewRole, setPreviewRole] = useState<DoorRole>('scanner');

  const handleChangeRole = (id: string, role: DoorRole) => updateStaff.mutate({ id, role });
  const handleSetActive = (id: string, isActive: boolean) =>
    updateStaff.mutate({ id, isActive });

  const activeCount = staff?.filter((member) => member.isActive).length ?? 0;
  const awaitingSignIn =
    staff?.filter((member) => member.isActive && !member.acceptedAt).length ?? 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-gray-700" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-black">Invite a volunteer</h2>
        </div>
        <InviteDoorStaffForm onRoleChange={setPreviewRole} />
      </section>

      {/* Placed between inviting and the crew list because that is when the
          question gets asked: which role do I give this person, and what will
          they actually be able to do at the door. */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-black">What each role changes</h2>
          <p className="mt-1 text-sm text-gray-700">
            Same table the door UI reads to decide which buttons to show, so it cannot
            drift from what a volunteer actually gets.
          </p>
        </div>
        <DoorRoleGuide highlight={previewRole} />
      </section>

      {/* Surfaced prominently because a crew that has not signed in is the
          single most likely reason the door stalls at 08:30. */}
      {awaitingSignIn > 0 ? (
        <p
          role="status"
          className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800"
        >
          {awaitingSignIn} {awaitingSignIn === 1 ? 'volunteer has' : 'volunteers have'} not signed
          in yet. Chase them the evening before — signing in at the door means waiting on an email
          with a queue in front of you.
        </p>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black">
            Crew {staff ? `(${activeCount} active)` : ''}
          </h2>

          {activeCount > 0 ? (
            <div className="flex items-center gap-2">
              {confirmingTeardown ? (
                <>
                  <span className="text-sm text-gray-700">
                    Revoke all {activeCount}?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      deactivateAll.mutate(undefined, {
                        onSettled: () => setConfirmingTeardown(false),
                      });
                    }}
                    disabled={deactivateAll.isPending}
                    className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deactivateAll.isPending ? 'Revoking…' : 'Yes, revoke all'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingTeardown(false)}
                    className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingTeardown(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
                >
                  <ShieldOff className="h-4 w-4" aria-hidden="true" />
                  Revoke all (after the event)
                </button>
              )}
            </div>
          ) : null}
        </div>

        {isError ? (
          <AdminErrorState message="Could not load the crew" onRetry={() => void refetch()} />
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-gray-600">Loading crew…</p>
        ) : !staff || staff.length === 0 ? (
          <AdminEmptyState
            icon={<UserPlus className="h-8 w-8" aria-hidden="true" />}
            title="No door crew yet"
            description="Invite the volunteers who will work the door. Nobody can check anyone in until they appear here."
          />
        ) : (
          <DoorStaffTable
            staff={staff}
            pendingId={updateStaff.isPending ? updateStaff.variables?.id ?? null : null}
            onChangeRole={handleChangeRole}
            onSetActive={handleSetActive}
          />
        )}
      </section>
    </div>
  );
};
