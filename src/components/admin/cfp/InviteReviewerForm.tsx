/**
 * Invite Reviewer Form Component
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { cfpQueryKeys, type ReviewerRole } from '@/lib/types/cfp-admin';

const REVIEWER_ROLES: { value: ReviewerRole; label: string; description: string }[] = [
  {
    value: 'full_access',
    label: 'Full Access',
    description: 'Can see speaker names, emails, and all details. Can score and leave feedback.',
  },
  {
    value: 'anonymous',
    label: 'Anonymous Review',
    description: 'Cannot see speaker names or personal details. Can score submissions blindly.',
  },
  {
    value: 'readonly',
    label: 'Read Only',
    description: 'Can view submissions but cannot score or leave feedback. Observer access.',
  },
];

export function InviteReviewerForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ReviewerRole>('anonymous');
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
      setRole('anonymous');
      setError('');
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const apiRole = role === 'readonly' ? 'readonly' : 'reviewer';
    const canSeeSpeakerIdentity = role === 'full_access';

    inviteMutation.mutate({
      email,
      name,
      role: apiRole,
      can_see_speaker_identity: canSeeSpeakerIdentity,
    });
  };

  const selectedRole = REVIEWER_ROLES.find((r) => r.value === role);

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-sm font-bold text-black mb-4">Invite New Reviewer</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reviewer@example.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Access Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ReviewerRole)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none cursor-pointer"
            >
              {REVIEWER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedRole && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-black">{selectedRole.label}</p>
                <p className="text-sm text-black">{selectedRole.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invite'}
          </button>
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        </div>
      </form>
    </div>
  );
}
