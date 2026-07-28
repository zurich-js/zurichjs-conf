/**
 * Reassign Ticket Modal
 * Modal for transferring ticket to another person
 */

import React from 'react';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Modal, ModalBody, Input, Button } from '@/components/atoms';
import type { ReassignData } from './types';

const emailSchema = z.string().email();

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  reassignData: ReassignData;
  setReassignData: (data: ReassignData) => void;
  mutation: UseMutationResult<unknown, Error, ReassignData>;
}

export function ReassignModal({ isOpen, onClose, reassignData, setReassignData, mutation }: ReassignModalProps) {
  const [emailError, setEmailError] = React.useState<string | undefined>(undefined);

  const handleClose = () => {
    onClose();
    setReassignData({ email: '', firstName: '', lastName: '' });
    setEmailError(undefined);
    mutation.reset();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailSchema.safeParse(reassignData.email).success) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(undefined);
    mutation.mutate(reassignData);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Transfer Ticket" variant="dark" size="md">
      <ModalBody className="pt-0">
        <p className="text-brand-gray-light mb-6">
          Enter the details of the person you want to transfer this ticket to. They will receive an email with their new
          ticket. This action cannot be undone.
        </p>

        {mutation.error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4" role="alert">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to transfer ticket'}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="reassign-first-name" className="block text-brand-white font-semibold mb-2">
                First Name *
              </label>
              <Input
                id="reassign-first-name"
                name="firstName"
                autoComplete="given-name"
                value={reassignData.firstName}
                onChange={(e) => setReassignData({ ...reassignData, firstName: e.target.value })}
                placeholder="John"
                disabled={mutation.isPending}
                required
                fullWidth
              />
            </div>

            <div>
              <label htmlFor="reassign-last-name" className="block text-brand-white font-semibold mb-2">
                Last Name *
              </label>
              <Input
                id="reassign-last-name"
                name="lastName"
                autoComplete="family-name"
                value={reassignData.lastName}
                onChange={(e) => setReassignData({ ...reassignData, lastName: e.target.value })}
                placeholder="Doe"
                disabled={mutation.isPending}
                required
                fullWidth
              />
            </div>

            <div>
              <label htmlFor="reassign-email" className="block text-brand-white font-semibold mb-2">
                Email Address *
              </label>
              <Input
                id="reassign-email"
                name="email"
                type="email"
                autoComplete="email"
                value={reassignData.email}
                onChange={(e) => setReassignData({ ...reassignData, email: e.target.value })}
                placeholder="john.doe@example.com"
                disabled={mutation.isPending}
                required
                fullWidth
                error={emailError}
              />
            </div>
          </div>

          <p className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Warning:</strong> This action cannot be undone. You will lose access to this ticket immediately.
            </span>
          </p>

          <div className="flex gap-3">
            <Button type="button" variant="ghost" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={mutation.isPending}
              disabled={!reassignData.email || !reassignData.firstName || !reassignData.lastName}
            >
              {mutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}
