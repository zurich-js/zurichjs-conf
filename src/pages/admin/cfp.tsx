/**
 * CFP Admin Dashboard
 * Manage submissions, reviewers, and speakers
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pagination } from '@/components/atoms';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  StatusBadge,
  SubmissionModal,
  AddTagForm,
  ReviewersTab,
  SpeakersTab,
} from '@/components/admin/cfp';
import {
  type CfpTab,
  type CfpStats,
  type CfpAdminSubmission,
  type CfpAdminSpeaker,
  type CfpAdminReviewer,
  type CfpAdminTag,
  cfpQueryKeys,
} from '@/lib/types/cfp-admin';

// API fetch functions
async function fetchStats(): Promise<CfpStats> {
  const res = await fetch('/api/admin/cfp/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchSubmissions(status?: string): Promise<{ submissions: CfpAdminSubmission[] }> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  const res = await fetch(`/api/admin/cfp/submissions?${params}`);
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return res.json();
}

async function fetchSpeakers(): Promise<{ speakers: CfpAdminSpeaker[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

async function fetchReviewers(): Promise<{ reviewers: CfpAdminReviewer[] }> {
  const res = await fetch('/api/admin/cfp/reviewers');
  if (!res.ok) throw new Error('Failed to fetch reviewers');
  return res.json();
}

async function fetchTags(): Promise<{ tags: CfpAdminTag[] }> {
  const res = await fetch('/api/admin/cfp/tags');
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

async function updateSubmissionStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/submissions/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

async function deleteTag(id: string): Promise<void> {
  const res = await fetch('/api/admin/cfp/tags', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to delete tag');
  }
}

export default function CfpAdminDashboard() {
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<CfpTab>('submissions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<CfpAdminSubmission | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionStatus, setBulkActionStatus] = useState<string>('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Check auth status using dedicated verify endpoint
  const { data: isAuthenticated, isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch data with proper staleTime to prevent flickering on navigation
  const { data: stats } = useQuery({
    queryKey: cfpQueryKeys.stats,
    queryFn: fetchStats,
    enabled: isAuthenticated === true,
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: cfpQueryKeys.submissions(statusFilter),
    queryFn: () => fetchSubmissions(statusFilter),
    enabled: isAuthenticated === true && activeTab === 'submissions',
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: cfpQueryKeys.speakers,
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true && activeTab === 'speakers',
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: reviewersData, isLoading: isLoadingReviewers } = useQuery({
    queryKey: cfpQueryKeys.reviewers,
    queryFn: fetchReviewers,
    enabled: isAuthenticated === true && activeTab === 'reviewers',
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: tagsData, isLoading: isLoadingTags } = useQuery({
    queryKey: cfpQueryKeys.tags,
    queryFn: fetchTags,
    enabled: isAuthenticated === true && activeTab === 'tags',
    staleTime: 30 * 1000, // 30 seconds
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateSubmissionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedSubmission(null);
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/submissions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete submission');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
      setSelectedSubmission(null);
    },
  });

  const editSubmissionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/admin/cfp/submissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update submission');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      toast.success('Submission Updated', 'Talk details have been saved');
    },
    onError: () => {
      toast.error('Update Failed', 'Failed to save submission changes');
    },
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/cfp/submissions/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} submission(s)`);
      }
    },
    onSuccess: (_data, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedIds(new Set());
      setBulkActionStatus('');
      toast.success('Bulk Update Complete', `${ids.length} submission(s) updated to ${status}`);
    },
    onError: (error: Error) => {
      toast.error('Bulk Update Failed', error.message);
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.tags });
      toast.success('Tag Deleted', 'The tag has been removed');
    },
    onError: (error: Error) => {
      toast.error('Delete Failed', error.message);
    },
  });

  // Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setPassword('');
        // Invalidate auth query to re-check and all other queries
        queryClient.invalidateQueries({ queryKey: ['admin', 'cfp', 'auth'] });
        queryClient.invalidateQueries({ queryKey: ['cfp'] });
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      // Clear all queries and invalidate auth
      queryClient.clear();
      router.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const submissions = submissionsData?.submissions || [];
  const speakers = speakersData?.speakers || [];
  const reviewers = reviewersData?.reviewers || [];
  const tags = tagsData?.tags || [];

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="text-lg font-medium text-black">Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>CFP Admin Login | ZurichJS</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F1E271] rounded-full mb-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-black">CFP Admin</h2>
                <p className="mt-2 text-sm text-black">ZurichJS Conference 2026</p>
              </div>
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                  />
                </div>
                {loginError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">{loginError}</p>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 px-4 text-base font-medium rounded-lg text-black bg-[#F1E271] hover:bg-[#e8d95e] transition-all cursor-pointer"
                >
                  Sign in
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>CFP Admin | ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="CFP Management" subtitle="ZurichJS Conference 2026" onLogout={handleLogout} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-8">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-black">{stats.total_submissions}</div>
                <div className="text-xs sm:text-sm text-black">Total Submissions</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.submissions_by_status?.submitted || 0}</div>
                <div className="text-xs sm:text-sm text-black">Pending Review</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.submissions_by_status?.accepted || 0}</div>
                <div className="text-xs sm:text-sm text-black">Accepted</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-black">{stats.total_reviews}</div>
                <div className="text-xs sm:text-sm text-black">Total Reviews</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as CfpTab)}
                className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-black"
              >
                <option value="submissions">Submissions</option>
                <option value="speakers">Speakers</option>
                <option value="reviewers">Reviewers</option>
                <option value="tags">Tags</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
                {(['submissions', 'speakers', 'reviewers', 'tags'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer ${
                      activeTab === tab ? 'bg-[#F1E271] text-black shadow-sm' : 'text-black hover:bg-gray-50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {/* Submissions Tab */}
              {activeTab === 'submissions' && (
                <SubmissionsTabContent
                  submissions={submissions}
                  isLoading={isLoadingSubmissions}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  selectedIds={selectedIds}
                  toggleSelection={toggleSelection}
                  toggleSelectAll={toggleSelectAll}
                  bulkActionStatus={bulkActionStatus}
                  setBulkActionStatus={setBulkActionStatus}
                  bulkUpdateStatusMutation={bulkUpdateStatusMutation}
                  onSelectSubmission={setSelectedSubmission}
                />
              )}

              {/* Speakers Tab */}
              {activeTab === 'speakers' && <SpeakersTab speakers={speakers} isLoading={isLoadingSpeakers} />}

              {/* Reviewers Tab */}
              {activeTab === 'reviewers' && <ReviewersTab reviewers={reviewers} isLoading={isLoadingReviewers} />}

              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div>
                  <div className="mb-6">
                    <AddTagForm />
                  </div>
                  {isLoadingTags ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                            tag.is_suggested ? 'bg-[#F1E271] text-black' : 'bg-gray-100 text-black'
                          }`}
                        >
                          {tag.name}
                          {tag.is_suggested && <span className="text-xs opacity-75">suggested</span>}
                          <button
                            onClick={() => deleteTagMutation.mutate(tag.id)}
                            disabled={deleteTagMutation.isPending}
                            className="ml-1 w-4 h-4 rounded-full bg-black/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete tag"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                      {tags.length === 0 && <p className="text-black">No tags found</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Submission Modal */}
        {selectedSubmission && (
          <SubmissionModal
            submission={selectedSubmission}
            onClose={() => setSelectedSubmission(null)}
            onUpdateStatus={(status) => updateStatusMutation.mutate({ id: selectedSubmission.id, status })}
            isUpdating={updateStatusMutation.isPending}
            onDelete={() => deleteSubmissionMutation.mutate(selectedSubmission.id)}
            isDeleting={deleteSubmissionMutation.isPending}
            onEdit={(data) => editSubmissionMutation.mutate({ id: selectedSubmission.id, data })}
            isEditing={editSubmissionMutation.isPending}
          />
        )}
      </div>
    </>
  );
}

// Inline Submissions Tab Content (keeping table logic inline for simplicity)
function SubmissionsTabContent({
  submissions,
  isLoading,
  statusFilter,
  setStatusFilter,
  selectedIds,
  toggleSelection,
  toggleSelectAll,
  bulkActionStatus,
  setBulkActionStatus,
  bulkUpdateStatusMutation,
  onSelectSubmission,
}: {
  submissions: CfpAdminSubmission[];
  isLoading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  bulkActionStatus: string;
  setBulkActionStatus: (v: string) => void;
  bulkUpdateStatusMutation: ReturnType<typeof useMutation<void, Error, { ids: string[]; status: string }>>;
  onSelectSubmission: (s: CfpAdminSubmission) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.abstract.toLowerCase().includes(query) ||
          s.speaker?.first_name?.toLowerCase().includes(query) ||
          s.speaker?.last_name?.toLowerCase().includes(query) ||
          s.speaker?.email?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((s) => s.submission_type === typeFilter);
    }

    return result;
  }, [submissions, searchQuery, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubmissions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSubmissions, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  return (
    <div>
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, abstract, or speaker..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="waitlisted">Waitlisted</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="talk">Talk</option>
            <option value="workshop">Workshop</option>
            <option value="lightning">Lightning Talk</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2 w-fit">
            <span className="text-sm font-medium text-black">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-gray-300" />
            <select
              value={bulkActionStatus}
              onChange={(e) => setBulkActionStatus(e.target.value)}
              className="text-sm px-2 py-1 rounded border border-gray-300 text-black"
            >
              <option value="">Change status to...</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="accepted">Accepted</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              onClick={() => {
                if (bulkActionStatus) {
                  bulkUpdateStatusMutation.mutate({ ids: Array.from(selectedIds), status: bulkActionStatus });
                }
              }}
              disabled={!bulkActionStatus || bulkUpdateStatusMutation.isPending}
              className="px-3 py-1 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg disabled:opacity-50 cursor-pointer"
            >
              {bulkUpdateStatusMutation.isPending ? 'Updating...' : 'Apply'}
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {paginatedSubmissions.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedSubmissions.length && paginatedSubmissions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#F1E271] cursor-pointer"
                />
                <span className="text-sm text-gray-600">Select all on page</span>
              </div>
            )}
            {paginatedSubmissions.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl p-4 border border-gray-200 transition-all ${
                  selectedIds.has(s.id) ? 'bg-yellow-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleSelection(s.id)}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-[#F1E271] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-black text-sm line-clamp-2">{s.title}</h3>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {s.speaker?.first_name} {s.speaker?.last_name}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3 ml-7">{s.abstract}</p>
                <div className="flex items-center justify-between ml-7">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="px-2 py-0.5 bg-gray-200 rounded capitalize">{s.submission_type}</span>
                    <span>{s.stats?.review_count || 0} reviews</span>
                    {s.stats?.avg_overall && <span>Avg: {s.stats.avg_overall.toFixed(1)}</span>}
                  </div>
                  <button
                    onClick={() => onSelectSubmission(s)}
                    className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
            {paginatedSubmissions.length === 0 && <div className="text-center py-8 text-gray-500">No submissions found</div>}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedSubmissions.length && paginatedSubmissions.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#F1E271] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reviews</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedSubmissions.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50 ${selectedIds.has(s.id) ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelection(s.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#F1E271] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-black">{s.title}</div>
                      <div className="text-sm text-black truncate max-w-xs">{s.abstract}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-black">
                        {s.speaker?.first_name} {s.speaker?.last_name}
                      </div>
                      <div className="text-xs text-black">{s.speaker?.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs text-black capitalize font-medium">
                        {s.submission_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-black font-medium">{s.stats?.review_count || 0}</td>
                    <td className="px-4 py-4 text-sm text-black font-medium">
                      {s.stats?.avg_overall ? s.stats.avg_overall.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => onSelectSubmission(s)}
                        className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-sm rounded-lg cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedSubmissions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-black">
                      No submissions found
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
            totalItems={filteredSubmissions.length}
            variant="light"
          />
        </>
      )}
    </div>
  );
}
