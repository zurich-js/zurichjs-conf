import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { Workshop } from '@/lib/types/database';
import type { ProgramScheduleItemInput, ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type {
  ProgramSession,
  ProgramSessionInput,
  ProgramSessionSpeakerInput,
  ProgramSessionUpdateInput,
  StripeValidationResult,
  WorkshopOfferingInput,
} from '@/lib/types/program';

type SessionFilters = { status?: string; kind?: string; includeArchived?: boolean };

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallbackMessage);
  return data as T;
}

function sessionsUrl(filters?: SessionFilters) {
  const query = new URLSearchParams();
  if (filters?.status) query.set('status', filters.status);
  if (filters?.kind) query.set('kind', filters.kind);
  if (filters?.includeArchived) query.set('includeArchived', 'true');
  const qs = query.toString();
  return qs ? `/api/admin/program/sessions?${qs}` : '/api/admin/program/sessions';
}

export function useProgramSessions(filters?: SessionFilters) {
  return useQuery({
    queryKey: queryKeys.program.sessions(filters),
    queryFn: async () => {
      const response = await fetch(sessionsUrl(filters), { credentials: 'include' });
      const data = await readJson<{ sessions: ProgramSession[] }>(response, 'Failed to load program sessions');
      return data.sessions;
    },
  });
}

export function useProgramSession(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.program.session(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await fetch(`/api/admin/program/sessions/${id}`, { credentials: 'include' });
      const data = await readJson<{ session: ProgramSession }>(response, 'Failed to load program session');
      return data.session;
    },
  });
}

export function useCreateProgramSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgramSessionInput) => {
      const response = await fetch('/api/admin/program/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const data = await readJson<{ session: ProgramSession }>(response, 'Failed to create program session');
      return data.session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.all });
    },
  });
}

export function usePromoteSubmissionToSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { submission_id: string; status?: string }) => {
      const response = await fetch('/api/admin/program/sessions/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const data = await readJson<{ session: ProgramSession }>(response, 'Failed to promote submission');
      return data.session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.all });
      queryClient.invalidateQueries({ queryKey: ['speakers'] });
      queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
    },
  });
}

export function useUpdateProgramSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProgramSessionUpdateInput }) => {
      const response = await fetch(`/api/admin/program/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await readJson<{ session: ProgramSession }>(response, 'Failed to update program session');
      return result.session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.program.session(session.id) });
    },
  });
}

export function useProgramSessionSpeakers(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (speakers: ProgramSessionSpeakerInput[]) => {
      const response = await fetch(`/api/admin/program/sessions/${sessionId}/speakers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ speakers }),
      });
      const data = await readJson<{ session: ProgramSession }>(response, 'Failed to update session speakers');
      return data.session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.session(session.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.program.sessions() });
    },
  });
}

export function useProgramScheduleItems() {
  return useQuery({
    queryKey: queryKeys.program.scheduleItems(),
    queryFn: async () => {
      const response = await fetch('/api/admin/program-schedule', { credentials: 'include' });
      const data = await readJson<{ items: ProgramScheduleItemRecord[] }>(response, 'Failed to load schedule items');
      return data.items;
    },
  });
}

export function useCreateScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgramScheduleItemInput) => {
      const response = await fetch('/api/admin/program-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const data = await readJson<{ item: ProgramScheduleItemRecord }>(response, 'Failed to create schedule item');
      return data.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.scheduleItems() });
      queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
    },
  });
}

export function useUpdateScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProgramScheduleItemInput> }) => {
      const response = await fetch(`/api/admin/program-schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await readJson<{ item: ProgramScheduleItemRecord }>(response, 'Failed to update schedule item');
      return result.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.scheduleItems() });
      queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
    },
  });
}

export function useDeleteScheduleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/program-schedule/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      return readJson<{ success: true }>(response, 'Failed to delete schedule item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.program.scheduleItems() });
      queryClient.invalidateQueries({ queryKey: ['program-schedule'] });
    },
  });
}

export function useWorkshopOffering(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.program.workshopOffering(sessionId ?? ''),
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const response = await fetch(`/api/admin/program/workshop-offerings/${sessionId}`, { credentials: 'include' });
      const data = await readJson<{ offering: Workshop | null }>(response, 'Failed to load workshop offering');
      return data.offering;
    },
  });
}

export function useCreateWorkshopOffering() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: Partial<Omit<WorkshopOfferingInput, 'session_id'>> }) => {
      const response = await fetch(`/api/admin/program/workshop-offerings/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await readJson<{ offering: Workshop }>(response, 'Failed to create workshop offering');
      return result.offering;
    },
    onSuccess: (offering) => {
      if (offering.session_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.program.workshopOffering(offering.session_id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.all });
    },
  });
}

export function useUpdateWorkshopOffering() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, data }: { sessionId: string; data: Partial<Omit<WorkshopOfferingInput, 'session_id'>> }) => {
      const response = await fetch(`/api/admin/program/workshop-offerings/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await readJson<{ offering: Workshop }>(response, 'Failed to update workshop offering');
      return result.offering;
    },
    onSuccess: (offering) => {
      if (offering.session_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.program.workshopOffering(offering.session_id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.workshops.all });
    },
  });
}

export function useValidateWorkshopStripe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sessionId,
      lookupKey,
      stripeProductId,
      store,
    }: {
      sessionId: string;
      lookupKey: string;
      stripeProductId?: string | null;
      store?: boolean;
    }) => {
      const response = await fetch(`/api/admin/program/workshop-offerings/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lookupKey, stripeProductId, store }),
      });
      const data = await readJson<{ validation: StripeValidationResult }>(response, 'Failed to validate Stripe');
      return data.validation;
    },
    onSuccess: (_validation, variables) => {
      if (variables.store) {
        queryClient.invalidateQueries({ queryKey: queryKeys.program.workshopOffering(variables.sessionId) });
      }
    },
  });
}
