/**
 * Speakers Tab Component
 * Manages CFP speakers - list, add, edit, delete
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, User } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { cfpQueryKeys, type CfpAdminSpeaker } from '@/lib/types/cfp-admin';
import { SpeakerModal } from './SpeakerModal';
import { AddSpeakerModal } from './AddSpeakerModal';

interface SpeakersTabProps {
  speakers: CfpAdminSpeaker[];
  isLoading: boolean;
}

export function SpeakersTab({ speakers, isLoading }: SpeakersTabProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<CfpAdminSpeaker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Toggle visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isVisible }: { id: string; isVisible: boolean }) => {
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: isVisible }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
    },
    onSuccess: (_data, { isVisible }) => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
      toast.success('Visibility Updated', isVisible ? 'Speaker is now visible on the lineup' : 'Speaker is now hidden from the lineup');
    },
    onError: () => {
      toast.error('Error', 'Failed to update speaker visibility');
    },
  });

  const filteredSpeakers = speakers.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.company?.toLowerCase().includes(query)
    );
  });

  const handleSpeakerUpdated = () => {
    queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
    setSelectedSpeaker(null);
  };

  // Delete speaker mutation
  const deleteSpeakerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete speaker');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedSpeaker(null);
      setDeleteError(null);
    },
    onError: (error: Error) => {
      setDeleteError(error.message);
    },
  });

  return (
    <div>
      {/* Search and Add */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search speakers by name, email, or company..."
          className="w-full sm:max-w-md px-4 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
        />
        <button
          onClick={() => setShowAddSpeaker(true)}
          className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Speaker
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredSpeakers.map((s) => (
              <div key={s.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3 mb-3">
                  {s.profile_image_url ? (
                    <img
                      src={s.profile_image_url}
                      alt={`${s.first_name} ${s.last_name}`}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black text-sm">
                      {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}` : 'No name'}
                    </div>
                    {s.job_title && (
                      <div className="text-xs text-gray-500">{s.job_title}</div>
                    )}
                    <div className="text-xs text-gray-600 truncate mt-0.5">{s.email}</div>
                  </div>
                  {s.bio ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium shrink-0">Complete</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium shrink-0">Incomplete</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {s.company && <span className="mr-2">{s.company}</span>}
                    <span>Joined {new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => setSelectedSpeaker(s)}
                    className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg transition-all cursor-pointer"
                  >
                    View / Edit
                  </button>
                </div>
              </div>
            ))}
            {filteredSpeakers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No speakers match your search' : 'No speakers found'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Visible</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSpeakers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {s.profile_image_url ? (
                          <img
                            src={s.profile_image_url}
                            alt={`${s.first_name} ${s.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-black">
                            {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}` : 'No name'}
                          </div>
                          {s.job_title && (
                            <div className="text-xs text-gray-500">{s.job_title}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-black">{s.email}</td>
                    <td className="px-4 py-4 text-sm text-black">{s.company || '-'}</td>
                    <td className="px-4 py-4">
                      {s.bio ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Complete</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Incomplete</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleVisibilityMutation.mutate({ id: s.id, isVisible: !s.is_visible })}
                        disabled={toggleVisibilityMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          s.is_visible ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={s.is_visible ? 'Visible on lineup' : 'Hidden from lineup'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            s.is_visible ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-black">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedSpeaker(s)}
                        className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-sm rounded-lg transition-all cursor-pointer"
                      >
                        View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-black">
                      {searchQuery ? 'No speakers match your search' : 'No speakers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete Error Alert */}
      {deleteError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-600 hover:text-red-800 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Speaker Modal */}
      {selectedSpeaker && (
        <SpeakerModal
          speaker={selectedSpeaker}
          onClose={() => setSelectedSpeaker(null)}
          onUpdated={handleSpeakerUpdated}
          onDeleted={() => {
            deleteSpeakerMutation.mutate(selectedSpeaker.id);
          }}
          isDeleting={deleteSpeakerMutation.isPending}
        />
      )}

      {/* Add Speaker Modal */}
      {showAddSpeaker && (
        <AddSpeakerModal
          onClose={() => setShowAddSpeaker(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
            queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
            setShowAddSpeaker(false);
            toast.success('Speaker Added', 'New speaker has been created successfully');
          }}
        />
      )}
    </div>
  );
}
