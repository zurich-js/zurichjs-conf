/**
 * Reassign Ticket Modal
 * Modal for transferring ticket to another person
 */

import type { UseMutationResult } from '@tanstack/react-query';
import type { ReassignData } from './types';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  reassignData: ReassignData;
  setReassignData: (data: ReassignData) => void;
  mutation: UseMutationResult<unknown, Error, ReassignData>;
}

export function ReassignModal({ isOpen, onClose, reassignData, setReassignData, mutation }: ReassignModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setReassignData({ email: '', firstName: '', lastName: '' });
    mutation.reset();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-primary rounded-2xl max-w-md w-full p-8">
        <h2 className="text-xl font-bold text-black mb-4">Transfer Ticket</h2>
        <p className="text-black/80 mb-6">
          Enter the details of the person you want to transfer this ticket to. They will receive an email with their new
          ticket. This action cannot be undone.
        </p>

        {mutation.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to transfer ticket'}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-black font-semibold mb-2">First Name *</label>
            <input
              type="text"
              value={reassignData.firstName}
              onChange={(e) => setReassignData({ ...reassignData, firstName: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-black/20 focus:border-black focus:outline-none bg-white text-black"
              placeholder="John"
              disabled={mutation.isPending}
            />
          </div>

          <div>
            <label className="block text-black font-semibold mb-2">Last Name *</label>
            <input
              type="text"
              value={reassignData.lastName}
              onChange={(e) => setReassignData({ ...reassignData, lastName: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-black/20 focus:border-black focus:outline-none bg-white text-black"
              placeholder="Doe"
              disabled={mutation.isPending}
            />
          </div>

          <div>
            <label className="block text-black font-semibold mb-2">Email Address *</label>
            <input
              type="email"
              value={reassignData.email}
              onChange={(e) => setReassignData({ ...reassignData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border-2 border-black/20 focus:border-black focus:outline-none bg-white text-black"
              placeholder="john.doe@example.com"
              disabled={mutation.isPending}
            />
          </div>
        </div>

        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <p className="text-yellow-800 text-sm font-semibold">
            ⚠️ Warning: This action cannot be undone. You will lose access to this ticket immediately.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={mutation.isPending}
            className="flex-1 bg-gray-200 text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate(reassignData)}
            disabled={mutation.isPending || !reassignData.email || !reassignData.firstName || !reassignData.lastName}
            className="flex-1 bg-black text-brand-primary font-semibold py-3 px-6 rounded-lg hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
