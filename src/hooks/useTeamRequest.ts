/**
 * Team Request Hook
 * Handles team package request modal state and submission using TanStack Query
 * Encapsulates all team request business logic
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { teamRequestKeys } from '@/lib/query-keys';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

export interface TeamRequestData {
  email: string;
  company: string;
  quantity: number;
  ticketType: string;
  message?: string;
}

interface TeamTicketInfo {
  type: string;
  quantity: number;
}

interface TeamRequestResponse {
  success: boolean;
  message?: string;
}

interface UseTeamRequestOptions {
  /** Callback when team request fails */
  onError?: (message: string) => void;
}

export interface UseTeamRequestReturn {
  /** Whether the team request modal is open */
  isModalOpen: boolean;
  /** Current ticket info for the modal */
  ticketInfo: TeamTicketInfo | null;
  /** Whether the success dialog is shown */
  isSuccessDialogOpen: boolean;
  /** Data from successful submission (for success dialog) */
  successData: TeamRequestData | null;
  /** Whether the mutation is pending */
  isPending: boolean;
  /** Open the team request modal */
  openModal: (ticketType: string, quantity: number) => void;
  /** Close the team request modal */
  closeModal: () => void;
  /** Submit a team request */
  submitRequest: (data: TeamRequestData) => Promise<void>;
  /** Handle successful submission (called by modal) */
  handleSuccess: (data: TeamRequestData) => void;
  /** Close the success dialog */
  closeSuccessDialog: () => void;
}

/**
 * API function to submit team request
 */
async function submitTeamRequest(data: TeamRequestData): Promise<TeamRequestResponse> {
  const response = await fetch('/api/team-request', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMessage = result.error || 'Failed to submit team request';
    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Hook for managing team package requests
 * Uses TanStack Query mutation for API calls
 */
export function useTeamRequest(options: UseTeamRequestOptions = {}): UseTeamRequestReturn {
  const { onError } = options;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketInfo, setTicketInfo] = useState<TeamTicketInfo | null>(null);

  // Success dialog state
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [successData, setSuccessData] = useState<TeamRequestData | null>(null);

  // TanStack Query mutation
  const mutation = useMutation({
    mutationKey: teamRequestKeys.submit(),
    mutationFn: submitTeamRequest,
    onSuccess: () => {
      // Track successful submission
      analytics.track('form_submitted', {
        form_name: 'team_request',
        form_type: 'other',
        form_success: true,
      } as EventProperties<'form_submitted'>);
    },
    onError: (error: Error) => {
      analytics.error('Team request error', error, {
        type: 'network',
        severity: 'medium',
      });
      onError?.(error.message);
    },
  });

  const openModal = useCallback((ticketType: string, quantity: number) => {
    setTicketInfo({ type: ticketType, quantity });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const submitRequest = useCallback(
    async (data: TeamRequestData) => {
      await mutation.mutateAsync(data);
    },
    [mutation]
  );

  const handleSuccess = useCallback((data: TeamRequestData) => {
    setSuccessData(data);
    setIsModalOpen(false);
    setIsSuccessDialogOpen(true);
  }, []);

  const closeSuccessDialog = useCallback(() => {
    setIsSuccessDialogOpen(false);
    setSuccessData(null);
  }, []);

  return {
    isModalOpen,
    ticketInfo,
    isSuccessDialogOpen,
    successData,
    isPending: mutation.isPending,
    openModal,
    closeModal,
    submitRequest,
    handleSuccess,
    closeSuccessDialog,
  };
}
