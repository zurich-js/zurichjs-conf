/**
 * Invite Reviewer Form Component
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { CFP_REVIEWER_ROLES } from '@/lib/types/cfp';
import { ADMIN_REVIEWER_ROLES, cfpQueryKeys, type ReviewerRole } from '@/lib/types/cfp-admin';

const REVIEWER_ROLES: { value: ReviewerRole; label: string; description: string }[] = [
  {
    value: ADMIN_REVIEWER_ROLES.SUPER_ADMIN,
    label: 'Super Admin',
    description: 'Can see speaker names, emails, and all details. Can score and leave feedback.',
  },
  {
    value: ADMIN_REVIEWER_ROLES.COMMITTEE_MEMBER,
    label: 'Committee Member',
    description: 'Can see speaker details except email and anonymized committee reviews. Can score and leave feedback.',
  },
  {
    value: ADMIN_REVIEWER_ROLES.ANONYMOUS,
    label: 'Anonymous Review',
    description: 'Cannot see speaker names or personal details. Can score submissions blindly.',
  },
  {
    value: ADMIN_REVIEWER_ROLES.READONLY,
    label: 'Read Only',
    description: 'Can view submissions but cannot score or leave feedback. Observer access.',
  },
];

interface InviteReviewerFormProps {
  onInvited?: () => void;
  variant?: 'default' | 'modal';
  onCancel?: () => void;
}

export function InviteReviewerForm({
  onInvited,
  variant = 'default',
  onCancel,
}: InviteReviewerFormProps = {}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ReviewerRole>(ADMIN_REVIEWER_ROLES.ANONYMOUS);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; role: string; can_see_speaker_identity: boolean }) => {
      const res = await fetch('/api/admin/cfp/reviewers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to invite');
      }
      return res.json();
    },
    onSuccess: () => {
      setEmail('');
      setName('');
      setRole(ADMIN_REVIEWER_ROLES.ANONYMOUS);
      setError('');
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
      onInvited?.();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const apiRole = role === ADMIN_REVIEWER_ROLES.ANONYMOUS ? CFP_REVIEWER_ROLES.REVIEWER : role;

    inviteMutation.mutate({
      email,
      name,
      role: apiRole,
      can_see_speaker_identity: false,
    });
  };

  const selectedRole = REVIEWER_ROLES.find((r) => r.value === role);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className={variant === 'modal' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-3 gap-4'}>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reviewer@example.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-brand-gray-medium focus:ring-2 focus:ring-brand-primary focus:outline-none"
            />
          </div>
          <div className={variant === 'modal' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'contents'}>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-brand-gray-medium focus:ring-2 focus:ring-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">Access Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ReviewerRole)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-brand-primary focus:outline-none cursor-pointer"
              >
                {REVIEWER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedRole && (
          <div className="bg-white rounded-lg p-3 border border-brand-gray-lightest">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-black">{selectedRole.label}</p>
                <p className="text-sm text-black">{selectedRole.description}</p>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

        {variant === 'modal' ? (
          <div className="flex justify-end gap-3 pt-4 border-t border-brand-gray-lightest mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-black hover:bg-text-brand-gray-lightest rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-semibold rounded-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="px-4 py-2 bg-brand-primary hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invite'}
            </button>
          </div>
        )}
      </form>
  );
}
