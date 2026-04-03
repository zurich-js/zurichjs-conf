/**
 * Speakers Tab Component
 * Manages CFP speakers - list, add, edit, delete
 */

import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { cfpQueryKeys, type CfpAdminSpeaker, type CfpAdminSubmission } from '@/lib/types/cfp-admin';
import { BusyArea, Pagination } from '@/components/atoms';
import { SpeakerModal } from './SpeakerModal';
import { AddSpeakerModal } from './AddSpeakerModal';
import { cycleSingleSort, SortIndicator, type SingleSort } from '../tableSort';

// Avatar component with initials fallback
function SpeakerAvatar({ speaker, size = 'md' }: { speaker: CfpAdminSpeaker; size?: 'sm' | 'md' }) {
  const initials = `${speaker.first_name?.[0] || ''}${speaker.last_name?.[0] || ''}`.toUpperCase() || '?';
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';

  if (speaker.profile_image_url) {
    return (
      <img
        src={speaker.profile_image_url}
        alt={`${speaker.first_name} ${speaker.last_name}`}
        className={`${sizeClasses} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full bg-[#F1E271] flex items-center justify-center shrink-0`}>
      <span className="font-medium text-black">{initials}</span>
    </div>
  );
}

interface SpeakersTabProps {
  speakers: CfpAdminSpeaker[];
  isLoading: boolean;
  onSelectSubmission?: (submission: CfpAdminSubmission) => void;
}

type SpeakerSortKey = 'speaker' | 'company' | 'joined';

export function SpeakersTab({ speakers, isLoading, onSelectSubmission }: SpeakersTabProps) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<CfpAdminSpeaker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState<Array<'complete' | 'incomplete'>>([]);
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [sort, setSort] = useState<SingleSort<SpeakerSortKey>>({ key: 'joined', direction: 'desc' });
  const ITEMS_PER_PAGE = 10;
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

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isFeatured }: { id: string; isFeatured: boolean }) => {
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: isFeatured }),
      });
      if (!res.ok) throw new Error('Failed to update featured status');
    },
    onSuccess: (_data, { isFeatured }) => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
      toast.success('Featured Status Updated', isFeatured ? 'Speaker is now featured' : 'Speaker is no longer featured');
    },
    onError: () => {
      toast.error('Error', 'Failed to update featured status');
    },
  });

  // Filter speakers
  const filteredSpeakers = useMemo(() => {
    let result = [...speakers];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.first_name?.toLowerCase().includes(query) ||
          s.last_name?.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.company?.toLowerCase().includes(query)
      );
    }

    // Profile status filter (multi-select)
    if (profileFilter.length > 0) {
      result = result.filter((s) => {
        const state: 'complete' | 'incomplete' = s.bio ? 'complete' : 'incomplete';
        return profileFilter.includes(state);
      });
    }

    // Visibility filter
    if (visibilityFilter === 'visible') {
      result = result.filter((s) => s.is_visible);
    } else if (visibilityFilter === 'hidden') {
      result = result.filter((s) => !s.is_visible);
    }

    // Featured filter
    if (featuredFilter === 'featured') {
      result = result.filter((s) => s.is_featured);
    } else if (featuredFilter === 'not_featured') {
      result = result.filter((s) => !s.is_featured);
    }

    result.sort((a, b) => {
      const directionFactor = sort.direction === 'asc' ? 1 : -1;

      const compareText = (aValue: string | null | undefined, bValue: string | null | undefined) =>
        (aValue || '').localeCompare(bValue || '', undefined, { sensitivity: 'base' }) * directionFactor;

      const compareDate = (aValue: string | null | undefined, bValue: string | null | undefined) =>
        ((new Date(aValue || 0).getTime() || 0) - (new Date(bValue || 0).getTime() || 0)) * directionFactor;

      switch (sort.key) {
        case 'speaker': {
          const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
          const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim();
          return compareText(aName, bName);
        }
        case 'company':
          return compareText(a.company, b.company);
        case 'joined':
        default:
          return compareDate(a.created_at, b.created_at);
      }
    });

    return result;
  }, [speakers, searchQuery, profileFilter, visibilityFilter, featuredFilter, sort]);

  // Pagination
  const totalPages = Math.ceil(filteredSpeakers.length / ITEMS_PER_PAGE);
  const paginatedSpeakers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSpeakers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSpeakers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, profileFilter, visibilityFilter, featuredFilter, sort]);

  const toggleSort = (key: SpeakerSortKey) => {
    setSort((prev) => cycleSingleSort(prev, key));
  };

  const sortIndicator = (key: SpeakerSortKey) => (sort.key === key ? sort.direction : null);

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
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search speakers by name, email, or company..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          />
          <select
            multiple
            value={profileFilter}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions).map((option) => option.value as 'complete' | 'incomplete');
              setProfileFilter(values);
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none min-h-[44px]"
          >
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Visibility</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Featured</option>
            <option value="featured">Featured</option>
            <option value="not_featured">Not Featured</option>
          </select>
          <button
            onClick={() => setShowAddSpeaker(true)}
            className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Speaker
          </button>
        </div>
      </div>

      <BusyArea busy={isLoading}>
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedSpeakers.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 shrink-0">
                    <SpeakerAvatar speaker={s} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black text-sm">
                      {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}` : 'No name'}
                    </div>
                    {s.job_title && (
                      <div className="text-xs text-gray-500">{s.job_title}</div>
                    )}
                    <div className="text-xs text-gray-600 truncate mt-0.5">{s.email}</div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {s.bio ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">Complete</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Incomplete</span>
                    )}
                    {s.company_interested_in_sponsoring && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Sponsor
                      </span>
                    )}
                  </div>
                </div>
                {/* Visibility and Featured Toggles */}
                <div className="flex items-center gap-4 mb-3 py-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Visible</span>
                    <button
                      onClick={() => toggleVisibilityMutation.mutate({ id: s.id, isVisible: !s.is_visible })}
                      disabled={toggleVisibilityMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        s.is_visible ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          s.is_visible ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Featured</span>
                    <button
                      onClick={() => toggleFeaturedMutation.mutate({ id: s.id, isFeatured: !s.is_featured })}
                      disabled={toggleFeaturedMutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        s.is_featured ? 'bg-[#F1E271]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          s.is_featured ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 min-w-0 truncate">
                    {s.company && <span className="mr-2">{s.company}</span>}
                    <span>Joined {new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => setSelectedSpeaker(s)}
                    className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    View / Edit
                  </button>
                </div>
              </div>
            ))}
            {paginatedSpeakers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery || profileFilter.length > 0 || visibilityFilter !== 'all' || featuredFilter !== 'all' ? 'No speakers match your filters' : 'No speakers found'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-4 py-3 w-[200px]">
                    <button type="button" onClick={() => toggleSort('speaker')} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Speaker</span><SortIndicator direction={sortIndicator('speaker')} />
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[180px]">Email</th>
                  <th className="px-4 py-3 w-[120px]">
                    <button type="button" onClick={() => toggleSort('company')} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Company</span><SortIndicator direction={sortIndicator('company')} />
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[90px]">Profile</th>
                  <th className="px-4 py-3 w-[80px]">Sponsor</th>
                  <th className="px-4 py-3 w-[70px]">Visible</th>
                  <th className="px-4 py-3 w-[70px]">Featured</th>
                  <th className="px-4 py-3 w-[90px]">
                    <button type="button" onClick={() => toggleSort('joined')} className="inline-flex items-center gap-1 cursor-pointer">
                      <span>Joined</span><SortIndicator direction={sortIndicator('joined')} />
                    </button>
                  </th>
                  <th className="px-4 py-3 w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSpeakers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <SpeakerAvatar speaker={s} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-black truncate">
                            {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}` : 'No name'}
                          </div>
                          {s.job_title && (
                            <div className="text-xs text-gray-500 truncate">{s.job_title}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-black truncate" title={s.email}>{s.email}</td>
                    <td className="px-4 py-4 text-sm text-black truncate" title={s.company || undefined}>{s.company || '-'}</td>
                    <td className="px-4 py-4">
                      {s.bio ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Complete</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Incomplete</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {s.company_interested_in_sponsoring ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
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
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleFeaturedMutation.mutate({ id: s.id, isFeatured: !s.is_featured })}
                        disabled={toggleFeaturedMutation.isPending}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          s.is_featured ? 'bg-[#F1E271]' : 'bg-gray-300'
                        }`}
                        title={s.is_featured ? 'Featured speaker' : 'Not featured'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            s.is_featured ? 'translate-x-6' : 'translate-x-1'
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
                {paginatedSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-black">
                      {searchQuery || profileFilter.length > 0 || visibilityFilter !== 'all' || featuredFilter !== 'all' ? 'No speakers match your filters' : 'No speakers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredSpeakers.length}
            variant="light"
          />
        </>
      </BusyArea>

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
          onSelectSubmission={onSelectSubmission}
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
