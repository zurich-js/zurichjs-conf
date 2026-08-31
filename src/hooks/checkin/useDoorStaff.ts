/**
 * Door staff queries and mutations for the admin panel.
 *
 * Every mutation invalidates exactly one key — the staff list — and nothing
 * else. Staff changes are rare and the list is small, so a refetch here is the
 * right trade; that is NOT true of the roster, which is why the door station
 * writes into its cache instead.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api-fetch';
import { checkinKeys } from '@/lib/checkin/query-keys';
import type { DoorRole, DoorStaff } from '@/lib/types/checkin';

interface StaffListResponse {
  staff: DoorStaff[];
}

interface InviteResponse {
  staff: DoorStaff;
  warning?: string;
}

export function useDoorStaff() {
  return useQuery({
    queryKey: checkinKeys.staffList(),
    queryFn: ({ signal }) => adminFetch<StaffListResponse>('/api/admin/checkin/staff', { signal }),
    select: (data) => data.staff,
  });
}

export interface InviteDoorStaffInput {
  email: string;
  name?: string;
  role: DoorRole;
}

export function useInviteDoorStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteDoorStaffInput) =>
      adminFetch<InviteResponse>('/api/admin/checkin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkinKeys.staffList() });
    },
  });
}

export interface UpdateDoorStaffInput {
  id: string;
  role?: DoorRole;
  isActive?: boolean;
}

export function useUpdateDoorStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateDoorStaffInput) =>
      adminFetch<{ staff: DoorStaff }>(`/api/admin/checkin/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkinKeys.staffList() });
    },
  });
}

/** Revoke the whole crew. The teardown step, deliberately manual. */
export function useDeactivateAllDoorStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      adminFetch<{ deactivated: number }>('/api/admin/checkin/staff/deactivate-all', {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkinKeys.staffList() });
    },
  });
}
