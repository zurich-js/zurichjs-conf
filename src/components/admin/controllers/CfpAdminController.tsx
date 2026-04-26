import { useState, useCallback, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTabLayout } from '@/components/admin/AdminTabLayout';
import type { AdminTab } from '@/components/admin/AdminTabBar';
import {
  SubmissionModal,
  ReviewersTab,
  SpeakersTab,
  SubmissionsTab,
  TagsTab,
  InsightsTab,
  AnalyticsTab,
  StatsCards,
} from '@/components/admin/cfp';
import type { SubmissionSortKey } from '@/components/admin/cfp/SubmissionsTab';
import type { MultiSort } from '@/components/admin/cfp/tableSort';
import {
  type CfpTab,
  type CfpAdminSubmission,
  type CfpAdminSpeaker,
  cfpQueryKeys,
} from '@/lib/types/cfp-admin';
import {
  fetchStats,
  fetchSubmissions,
  fetchSpeakers,
  fetchReviewersWithActivity,
  fetchTags,
  fetchInsights,
  fetchAnalytics,
  updateSubmissionStatus,
  deleteTag,
  bulkDecideSubmissions,
} from '@/lib/cfp/api';
import type { SubmissionQueryParams } from '@/lib/cfp/api';
import type { SubmissionSortRule } from '@/lib/types/cfp/admin';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const ITEMS_PER_PAGE = 10;

const TABS: AdminTab<CfpTab>[] = [
  { id: 'submissions', label: 'Submissions', href: '/admin/cfp/submissions' },
  { id: 'speakers', label: 'Speakers', href: '/admin/cfp/speakers' },
  { id: 'reviewers', label: 'Reviewers', href: '/admin/cfp/reviewers' },
  { id: 'tags', label: 'Tags', href: '/admin/cfp/tags' },
  { id: 'insights', label: 'Insights', href: '/admin/cfp/insights' },
  { id: 'analytics', label: 'Analytics', href: '/admin/cfp/analytics' },
];

export function CfpAdminController({ activeTab }: { activeTab: CfpTab }) {
  const [selectedSubmission, setSelectedSubmission] = useState<CfpAdminSubmission | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<CfpAdminSpeaker | null>(null);
  const [returnToSpeaker, setReturnToSpeaker] = useState<CfpAdminSpeaker | null>(null);
  const [speakerInitialTab, setSpeakerInitialTab] = useState<'profile' | 'feedback'>('profile');

  const handleSelectSpeaker = useCallback((speaker: CfpAdminSpeaker | null) => {
    setSpeakerInitialTab('profile');
    setSelectedSpeaker(speaker);
  }, []);

  const handleSelectSubmissionFromSpeaker = useCallback(
    (submission: CfpAdminSubmission, fromSpeaker?: CfpAdminSpeaker) => {
      if (fromSpeaker) {
        setReturnToSpeaker(fromSpeaker);
        setSelectedSpeaker(null);
      } else {
        setReturnToSpeaker(null);
      }
      setSelectedSubmission(submission);
    },
    []
  );

  const handleBackToSpeaker = useCallback(() => {
    if (!returnToSpeaker) return;
    setSelectedSubmission(null);
    setSpeakerInitialTab('feedback');
    setSelectedSpeaker(returnToSpeaker);
    setReturnToSpeaker(null);
  }, [returnToSpeaker]);

  const handleCloseSubmission = useCallback(() => {
    setSelectedSubmission(null);
    setReturnToSpeaker(null);
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionStatus, setBulkActionStatus] = useState<string>('');
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated } = useAdminAuth();

  // Submission filter state (lifted from SubmissionsTab for server-side pagination)
  const [statuses, setStatuses] = useState<string[]>([]);
  const [submissionTypes, setSubmissionTypes] = useState<string[]>([]);
  const [shortlistStatuses, setShortlistStatuses] = useState<string[]>([]);
  const [decisionStatuses, setDecisionStatuses] = useState<string[]>([]);
  const [emailStates, setEmailStates] = useState<string[]>([]);
  const [coverageMin, setCoverageMin] = useState<string>('');
  const [coverageMax, setCoverageMax] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [submissionSort, setSubmissionSort] = useState<MultiSort<SubmissionSortKey>>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Debounced search: updates debouncedSearch 400ms after typing stops
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 400);
  }, []);

  const submissionSortParams = useMemo<SubmissionSortRule[]>(
    () =>
      submissionSort.map((rule): SubmissionSortRule => ({
        key:
          rule.key === 'title'
            ? 'title'
            : rule.key === 'speaker'
              ? 'speaker'
              : rule.key === 'reviews'
                ? 'review_count'
                : rule.key === 'score'
                  ? 'avg_score'
                  : rule.key === 'coverage'
                    ? 'coverage'
                    : 'shortlist',
        direction: rule.direction,
      })),
    [submissionSort]
  );

  // Build query params object for React Query key and fetch
  const submissionQueryParams: SubmissionQueryParams = useMemo(() => ({
    statuses: statuses.length > 0 ? statuses : undefined,
    types: submissionTypes.length > 0 ? submissionTypes : undefined,
    shortlistStatuses: shortlistStatuses.length > 0 ? shortlistStatuses : undefined,
    decisionStatuses: decisionStatuses.length > 0 ? decisionStatuses : undefined,
    emailStates: emailStates.length > 0 ? emailStates : undefined,
    search: debouncedSearch || undefined,
    sort: submissionSortParams.length > 0 ? submissionSortParams : undefined,
    coverage_min: coverageMin.trim() ? Math.max(0, Math.min(100, Number(coverageMin))) : undefined,
    coverage_max: coverageMax.trim() ? Math.max(0, Math.min(100, Number(coverageMax))) : undefined,
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  }), [statuses, submissionTypes, shortlistStatuses, decisionStatuses, emailStates, debouncedSearch, submissionSortParams, coverageMin, coverageMax, currentPage]);

  const setSubmissionStatuses = useCallback((value: string[]) => {
    setStatuses(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionTypesFilter = useCallback((value: string[]) => {
    setSubmissionTypes(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionShortlistStatuses = useCallback((value: string[]) => {
    setShortlistStatuses(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionDecisionStatuses = useCallback((value: string[]) => {
    setDecisionStatuses(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionEmailStates = useCallback((value: string[]) => {
    setEmailStates(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionCoverageMin = useCallback((value: string) => {
    setCoverageMin(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionCoverageMax = useCallback((value: string) => {
    setCoverageMax(value);
    setCurrentPage(1);
  }, []);

  const setSubmissionSortState = useCallback((value: MultiSort<SubmissionSortKey>) => {
    setSubmissionSort(value);
    setCurrentPage(1);
  }, []);

  // Fetch data
  const { data: stats } = useQuery({
    queryKey: cfpQueryKeys.stats,
    queryFn: fetchStats,
    enabled: isAuthenticated === true,
    staleTime: 30 * 1000,
  });

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: cfpQueryKeys.submissions(submissionQueryParams),
    queryFn: () => fetchSubmissions(submissionQueryParams),
    enabled: isAuthenticated === true && activeTab === 'submissions',
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: cfpQueryKeys.speakers,
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true && activeTab === 'speakers',
    staleTime: 30 * 1000,
  });

  const { data: reviewersData, isLoading: isLoadingReviewers } = useQuery({
    queryKey: cfpQueryKeys.reviewers,
    queryFn: fetchReviewersWithActivity,
    enabled: isAuthenticated === true && activeTab === 'reviewers',
    staleTime: 30 * 1000,
  });

  const { data: insightsData, isLoading: isLoadingInsights } = useQuery({
    queryKey: cfpQueryKeys.insights,
    queryFn: fetchInsights,
    enabled: isAuthenticated === true && activeTab === 'insights',
    staleTime: 30 * 1000,
  });

  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: cfpQueryKeys.analytics,
    queryFn: fetchAnalytics,
    enabled: isAuthenticated === true && activeTab === 'analytics',
    staleTime: 60 * 1000,
  });

  const { data: tagsData, isLoading: isLoadingTags } = useQuery({
    queryKey: cfpQueryKeys.tags,
    queryFn: fetchTags,
    enabled: isAuthenticated === true && activeTab === 'tags',
    staleTime: 30 * 1000,
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
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error(`Failed to update ${failed.length} submission(s)`);
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

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, notes }: { ids: string[]; notes?: string }) =>
      bulkDecideSubmissions(ids, 'rejected', notes),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedIds(new Set());
      if (result.failed > 0) {
        toast.error(
          'Bulk Reject Partial Failure',
          `${result.success} rejected, ${result.failed} failed. See console for details.`
        );
        console.error('[Bulk reject errors]', result.errors);
      } else {
        toast.success(
          'Bulk Reject Complete',
          `${result.success} submission(s) rejected with decision records`
        );
      }
    },
    onError: (error: Error) => {
      toast.error('Bulk Reject Failed', error.message);
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
  const submissions = submissionsData?.submissions || [];
  const submissionsTotal = submissionsData?.total || 0;
  const submissionsTotalUnfiltered = submissionsData?.totalUnfiltered || 0;

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

  const speakers = speakersData?.speakers || [];
  const reviewers = reviewersData?.reviewers || [];
  const tags = tagsData?.tags || [];

  return (
    <AdminLayout title="CFP Management" headTitle="CFP Admin | ZurichJS" loginTitle="CFP Admin">
      <AdminTabLayout tabs={TABS} activeTab={activeTab} overview={<StatsCards stats={stats} />}>
          {activeTab === 'submissions' && (
            <SubmissionsTab
              submissions={submissions}
              total={submissionsTotal}
              totalUnfiltered={submissionsTotalUnfiltered}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={ITEMS_PER_PAGE}
              isLoading={isLoadingSubmissions}
              searchQuery={searchQuery}
              setSearchQuery={handleSearchChange}
              statuses={statuses}
              setStatuses={setSubmissionStatuses}
              submissionTypes={submissionTypes}
              setSubmissionTypes={setSubmissionTypesFilter}
              shortlistStatuses={shortlistStatuses}
              setShortlistStatuses={setSubmissionShortlistStatuses}
              decisionStatuses={decisionStatuses}
              setDecisionStatuses={setSubmissionDecisionStatuses}
              emailStates={emailStates}
              setEmailStates={setSubmissionEmailStates}
              coverageMin={coverageMin}
              setCoverageMin={setSubmissionCoverageMin}
              coverageMax={coverageMax}
              setCoverageMax={setSubmissionCoverageMax}
              sort={submissionSort}
              setSort={setSubmissionSortState}
              selectedIds={selectedIds}
              toggleSelection={toggleSelection}
              toggleSelectAll={toggleSelectAll}
              bulkActionStatus={bulkActionStatus}
              setBulkActionStatus={setBulkActionStatus}
              bulkUpdateStatusMutation={bulkUpdateStatusMutation}
              bulkRejectMutation={bulkRejectMutation}
              onSelectSubmission={setSelectedSubmission}
            />
          )}

          {activeTab === 'speakers' && (
            <SpeakersTab
              speakers={speakers}
              isLoading={isLoadingSpeakers}
              onSelectSubmission={handleSelectSubmissionFromSpeaker}
              selectedSpeaker={selectedSpeaker}
              onSelectSpeaker={handleSelectSpeaker}
              initialSpeakerTab={speakerInitialTab}
            />
          )}
          {activeTab === 'reviewers' && (
            <ReviewersTab
              reviewers={reviewers}
              isLoading={isLoadingReviewers}
            />
          )}
          {activeTab === 'tags' && (
            <TagsTab tags={tags} isLoading={isLoadingTags} onDelete={(id) => deleteTagMutation.mutate(id)} isDeleting={deleteTagMutation.isPending} />
          )}
          {activeTab === 'insights' && (
            <InsightsTab insights={insightsData?.insights || null} stats={stats} isLoading={isLoadingInsights} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab analytics={analyticsData?.analytics || null} isLoading={isLoadingAnalytics} />
          )}
      </AdminTabLayout>

        {selectedSubmission && (
          <SubmissionModal
            submission={selectedSubmission}
            onClose={handleCloseSubmission}
            onUpdateStatus={(status) => updateStatusMutation.mutate({ id: selectedSubmission.id, status })}
            isUpdating={updateStatusMutation.isPending}
            onDelete={() => deleteSubmissionMutation.mutate(selectedSubmission.id)}
            isDeleting={deleteSubmissionMutation.isPending}
            onEdit={(data) => editSubmissionMutation.mutate({ id: selectedSubmission.id, data })}
            isEditing={editSubmissionMutation.isPending}
            onBack={returnToSpeaker ? handleBackToSpeaker : undefined}
            backLabel={
              returnToSpeaker
                ? `Back to ${returnToSpeaker.first_name || returnToSpeaker.last_name ? `${returnToSpeaker.first_name} ${returnToSpeaker.last_name}`.trim() : 'speaker'}`
                : undefined
            }
          />
        )}
    </AdminLayout>
  );
}
