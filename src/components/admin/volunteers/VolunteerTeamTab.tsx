/**
 * Volunteer Team Tab
 * Admin list of accepted volunteer profiles
 */

import { useState } from 'react';
import { Plus, Users, Pencil } from 'lucide-react';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { VolunteerStatusBadge } from './VolunteerStatusBadge';
import { VolunteerProfileForm } from './VolunteerProfileForm';
import { useVolunteerProfiles, useCreateVolunteerProfile, useUpdateVolunteerProfile } from '@/hooks/useVolunteer';
import type { VolunteerProfileWithRole } from '@/lib/types/volunteer';
import { useToast, type Toast } from '@/hooks/useToast';

export function VolunteerTeamTab() {
  const { data: profiles, isLoading } = useVolunteerProfiles();
  const createProfile = useCreateVolunteerProfile();
  const updateProfile = useUpdateVolunteerProfile();
  const { toasts, showToast, removeToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VolunteerProfileWithRole | null>(null);

  const handleCreate = () => {
    setEditingProfile(null);
    setIsFormOpen(true);
  };

  const handleEdit = (profile: VolunteerProfileWithRole) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (editingProfile) {
        await updateProfile.mutateAsync({ id: editingProfile.id, data });
        showToast('Profile updated', 'success');
      } else {
        await createProfile.mutateAsync(data as any);
        showToast('Volunteer added', 'success');
      }
      setIsFormOpen(false);
      setEditingProfile(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black">
          Volunteer Team {profiles ? `(${profiles.length})` : ''}
        </h3>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-black bg-brand-primary hover:bg-[#e8d95e] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Volunteer
        </button>
      </div>

      {!profiles || profiles.length === 0 ? (
        <AdminEmptyState
          icon={<Users className="w-6 h-6" />}
          title="No volunteers yet"
          description="Volunteers will appear here once applications are accepted and profiles are created."
        />
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => handleEdit(profile)}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium text-black">
                      {profile.first_name} {profile.last_name}
                    </h4>
                    <VolunteerStatusBadge status={profile.status} type="profile" />
                    {profile.is_public && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Public
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{profile.email}</span>
                    {profile.role_title && <span>{profile.role_title}</span>}
                    {profile.internal_contact && <span>Contact: {profile.internal_contact}</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(profile); }}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <VolunteerProfileForm
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProfile(null); }}
        onSave={handleSave}
        profile={editingProfile}
        isSaving={createProfile.isPending || updateProfile.isPending}
      />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((t: Toast) => (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer transition-all ${
                t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
