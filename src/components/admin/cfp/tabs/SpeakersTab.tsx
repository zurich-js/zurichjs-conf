/**
 * Speakers Tab Component
 * Manages CFP speakers - list, add, edit, delete
 */

import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, type ColumnDef, type SortingState, type Updater } from '@tanstack/react-table';
import { Building2, Plus, Search } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { cfpQueryKeys, type CfpAdminSpeaker, type CfpAdminSubmission } from '@/lib/types/cfp-admin';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import { SpeakerModal } from './SpeakerModal';
import { AddSpeakerModal } from './AddSpeakerModal';

function SpeakerAvatar({ speaker, size = 'md' }: { speaker: CfpAdminSpeaker; size?: 'sm' | 'md' }) {
  const initials = `${speaker.first_name?.[0] || ''}${speaker.last_name?.[0] || ''}`.toUpperCase() || '?';
  const sizeClasses = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';

  if (speaker.profile_image_url) {
    return (
      <img
        src={speaker.profile_image_url}
        alt={`${speaker.first_name} ${speaker.last_name}`}
        className={`${sizeClasses} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-brand-primary`}>
      <span className="font-medium text-black">{initials}</span>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  activeClassName,
  inactiveClassName = 'bg-gray-300',
  title,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  activeClassName: string;
  inactiveClassName?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? activeClassName : inactiveClassName
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

interface SpeakersTabProps {
  speakers: CfpAdminSpeaker[];
  isLoading: boolean;
  onSelectSubmission?: (submission: CfpAdminSubmission, fromSpeaker?: CfpAdminSpeaker) => void;
  selectedSpeaker?: CfpAdminSpeaker | null;
  onSelectSpeaker?: (speaker: CfpAdminSpeaker | null) => void;
  initialSpeakerTab?: 'profile' | 'feedback';
}

const ITEMS_PER_PAGE = 10;
const columnHelper = createColumnHelper<CfpAdminSpeaker>();

export function SpeakersTab({
  speakers,
  isLoading,
  onSelectSubmission,
  selectedSpeaker: controlledSpeaker,
  onSelectSpeaker,
  initialSpeakerTab,
}: SpeakersTabProps) {
  const [internalSelectedSpeaker, setInternalSelectedSpeaker] = useState<CfpAdminSpeaker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'not_featured'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'joined', desc: true }]);
  const queryClient = useQueryClient();
  const toast = useToast();

  const selectedSpeaker = controlledSpeaker !== undefined ? controlledSpeaker : internalSelectedSpeaker;
  const setSelectedSpeaker = (speaker: CfpAdminSpeaker | null) => {
    if (onSelectSpeaker) {
      onSelectSpeaker(speaker);
      return;
    }
    setInternalSelectedSpeaker(speaker);
  };

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

  const filteredSpeakers = useMemo(() => {
    let result = [...speakers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (speaker) =>
          speaker.first_name?.toLowerCase().includes(query) ||
          speaker.last_name?.toLowerCase().includes(query) ||
          speaker.email.toLowerCase().includes(query) ||
          speaker.company?.toLowerCase().includes(query)
      );
    }

    if (profileFilter === 'complete') {
      result = result.filter((speaker) => Boolean(speaker.bio));
    } else if (profileFilter === 'incomplete') {
      result = result.filter((speaker) => !speaker.bio);
    }

    if (visibilityFilter === 'visible') {
      result = result.filter((speaker) => speaker.is_visible);
    } else if (visibilityFilter === 'hidden') {
      result = result.filter((speaker) => !speaker.is_visible);
    }

    if (featuredFilter === 'featured') {
      result = result.filter((speaker) => speaker.is_featured);
    } else if (featuredFilter === 'not_featured') {
      result = result.filter((speaker) => !speaker.is_featured);
    }

    if (sorting.length > 0) {
      result = [...result].sort((a, b) => {
        for (const rule of sorting) {
          const direction = rule.desc ? -1 : 1;
          let comparison = 0;

          if (rule.id === 'speaker') {
            comparison = getSpeakerName(a).localeCompare(getSpeakerName(b), undefined, { sensitivity: 'base' });
          } else if (rule.id === 'company') {
            comparison = (a.company || '').localeCompare(b.company || '', undefined, { sensitivity: 'base' });
          } else if (rule.id === 'joined') {
            comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          }

          if (comparison !== 0) {
            return comparison * direction;
          }
        }

        return 0;
      });
    }

    return result;
  }, [featuredFilter, profileFilter, searchQuery, sorting, speakers, visibilityFilter]);

  const totalPages = Math.ceil(filteredSpeakers.length / ITEMS_PER_PAGE);
  const paginatedSpeakers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSpeakers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredSpeakers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [featuredFilter, profileFilter, searchQuery, sorting, visibilityFilter]);

  const handleSortingChange = (updater: Updater<SortingState>) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next.slice(0, 1);
    });
  };

  const handleSpeakerUpdated = () => {
    queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
    setSelectedSpeaker(null);
  };

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

  const columns: Array<ColumnDef<CfpAdminSpeaker>> = getSpeakerColumns({
      onToggleVisibility: (speaker) =>
        toggleVisibilityMutation.mutate({ id: speaker.id, isVisible: !speaker.is_visible }),
      onToggleFeatured: (speaker) =>
        toggleFeaturedMutation.mutate({ id: speaker.id, isFeatured: !speaker.is_featured }),
      onSelectSpeaker: setSelectedSpeaker,
      visibilityPending: toggleVisibilityMutation.isPending,
      featuredPending: toggleFeaturedMutation.isPending,
    });

  const hasActiveFilters = Boolean(
    searchQuery || profileFilter !== 'all' || visibilityFilter !== 'all' || featuredFilter !== 'all'
  );

  return (
    <div>
      <AdminDataTable
        data={paginatedSpeakers}
        columns={columns}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        getRowId={(speaker) => speaker.id}
        isLoading={isLoading}
        emptyState={hasActiveFilters ? 'No speakers match your filters' : 'No speakers found'}
        toolbar={(
          <AdminTableToolbar
            left={hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setProfileFilter('all');
                  setVisibilityFilter('all');
                  setFeaturedFilter('all');
                }}
                className="ml-2 inline-flex text-xs text-brand-gray-dark underline hover:text-black cursor-pointer"
              >
                Reset filters
              </button>
            ) : undefined}
            right={(
              <>
                <div className="relative min-w-[280px] max-w-full flex-1 lg:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-medium" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search speakers by name, email, or company..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pl-10 text-sm text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <select
                  value={profileFilter}
                  onChange={(event) => setProfileFilter(event.target.value as typeof profileFilter)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All profiles</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                </select>
                <select
                  value={visibilityFilter}
                  onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All visibility</option>
                  <option value="visible">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
                <select
                  value={featuredFilter}
                  onChange={(event) => setFeaturedFilter(event.target.value as typeof featuredFilter)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="all">All featured</option>
                  <option value="featured">Featured</option>
                  <option value="not_featured">Not featured</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddSpeaker(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 font-semibold text-black transition-all hover:bg-[#e8d95e] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Speaker</span>
                </button>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (speaker) => (
            <AdminMobileCard key={speaker.id}>
              <div className="flex items-start gap-3">
                <SpeakerAvatar speaker={speaker} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-black">{getSpeakerName(speaker)}</div>
                  {speaker.job_title ? <div className="text-sm text-brand-gray-medium">{speaker.job_title}</div> : null}
                  <div className="mt-0.5 truncate text-xs text-brand-gray-dark">{speaker.email}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <ProfileBadge speaker={speaker} />
                  {speaker.company_interested_in_sponsoring ? <SponsorBadge compact /> : null}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-brand-gray-lightest pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-gray-dark">Visible</span>
                  <ToggleSwitch
                    checked={speaker.is_visible}
                    onChange={() => toggleVisibilityMutation.mutate({ id: speaker.id, isVisible: !speaker.is_visible })}
                    disabled={toggleVisibilityMutation.isPending}
                    activeClassName="bg-green-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-gray-dark">Featured</span>
                  <ToggleSwitch
                    checked={speaker.is_featured}
                    onChange={() => toggleFeaturedMutation.mutate({ id: speaker.id, isFeatured: !speaker.is_featured })}
                    disabled={toggleFeaturedMutation.isPending}
                    activeClassName="bg-brand-primary"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs text-brand-gray-medium">
                  {speaker.company ? <span className="mr-2 truncate">{speaker.company}</span> : null}
                  <span>Joined {formatDate(speaker.created_at)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSpeaker(speaker)}
                  className="shrink-0 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-black transition-all hover:bg-[#e8d95e] cursor-pointer"
                >
                  View / Edit
                </button>
              </div>
            </AdminMobileCard>
          ),
          emptyState: hasActiveFilters ? 'No speakers match your filters' : 'No speakers found',
        }}
        pagination={(
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredSpeakers.length}
            variant="light"
          />
        )}
      />

      {deleteError ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{deleteError}</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteError(null)}
              className="cursor-pointer text-red-600 hover:text-red-800"
            >
              &times;
            </button>
          </div>
        </div>
      ) : null}

      {selectedSpeaker ? (
        <SpeakerModal
          speaker={selectedSpeaker}
          onClose={() => setSelectedSpeaker(null)}
          onUpdated={handleSpeakerUpdated}
          onDeleted={() => {
            deleteSpeakerMutation.mutate(selectedSpeaker.id);
          }}
          isDeleting={deleteSpeakerMutation.isPending}
          onSelectSubmission={
            onSelectSubmission
              ? (submission) => onSelectSubmission(submission, selectedSpeaker)
              : undefined
          }
          initialTab={initialSpeakerTab}
        />
      ) : null}

      {showAddSpeaker ? (
        <AddSpeakerModal
          onClose={() => setShowAddSpeaker(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
            queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
            setShowAddSpeaker(false);
            toast.success('Speaker Added', 'New speaker has been created successfully');
          }}
        />
      ) : null}
    </div>
  );
}

function getSpeakerColumns({
  onToggleVisibility,
  onToggleFeatured,
  onSelectSpeaker,
  visibilityPending,
  featuredPending,
}: {
  onToggleVisibility: (speaker: CfpAdminSpeaker) => void;
  onToggleFeatured: (speaker: CfpAdminSpeaker) => void;
  onSelectSpeaker: (speaker: CfpAdminSpeaker) => void;
  visibilityPending: boolean;
  featuredPending: boolean;
}): Array<ColumnDef<CfpAdminSpeaker>> {
  return [
    columnHelper.display({
      id: 'speaker',
      header: 'Speaker',
      enableSorting: true,
      size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <SpeakerAvatar speaker={row.original} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-black">{getSpeakerName(row.original)}</div>
            {row.original.job_title ? (
              <div className="truncate text-xs text-brand-gray-medium">{row.original.job_title}</div>
            ) : null}
          </div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'email',
      header: 'Email',
      enableSorting: false,
      size: 220,
      cell: ({ row }) => <span title={row.original.email} className="block truncate">{row.original.email}</span>,
    }),
    columnHelper.display({
      id: 'company',
      header: 'Company',
      enableSorting: true,
      size: 140,
      cell: ({ row }) => (
        <span title={row.original.company || undefined} className="block truncate">
          {row.original.company || '-'}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'profile',
      header: 'Profile',
      enableSorting: false,
      size: 100,
      cell: ({ row }) => <ProfileBadge speaker={row.original} />,
    }),
    columnHelper.display({
      id: 'sponsor',
      header: 'Sponsor',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (row.original.company_interested_in_sponsoring ? <SponsorBadge /> : <span className="text-sm text-brand-gray-medium">-</span>),
    }),
    columnHelper.display({
      id: 'visible',
      header: 'Visible',
      enableSorting: false,
      size: 90,
      cell: ({ row }) => (
        <ToggleSwitch
          checked={row.original.is_visible}
          onChange={() => onToggleVisibility(row.original)}
          disabled={visibilityPending}
          activeClassName="bg-green-500"
          title={row.original.is_visible ? 'Visible on lineup' : 'Hidden from lineup'}
        />
      ),
    }),
    columnHelper.display({
      id: 'featured',
      header: 'Featured',
      enableSorting: false,
      size: 90,
      cell: ({ row }) => (
        <ToggleSwitch
          checked={row.original.is_featured}
          onChange={() => onToggleFeatured(row.original)}
          disabled={featuredPending}
          activeClassName="bg-brand-primary"
          title={row.original.is_featured ? 'Featured speaker' : 'Not featured'}
        />
      ),
    }),
    columnHelper.display({
      id: 'joined',
      header: 'Joined',
      enableSorting: true,
      size: 110,
      cell: ({ row }) => formatDate(row.original.created_at),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 120,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelectSpeaker(row.original);
          }}
          className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-black transition-all hover:bg-[#e8d95e] cursor-pointer"
        >
          View / Edit
        </button>
      ),
    }),
  ];
}

function getSpeakerName(speaker: CfpAdminSpeaker) {
  const fullName = `${speaker.first_name || ''} ${speaker.last_name || ''}`.trim();
  return fullName || 'No name';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function ProfileBadge({ speaker }: { speaker: CfpAdminSpeaker }) {
  if (speaker.bio) {
    return <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Complete</span>;
  }

  return <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">Incomplete</span>;
}

function SponsorBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
      <Building2 className="h-3 w-3" />
      <span>{compact ? 'Sponsor' : 'Yes'}</span>
    </span>
  );
}
