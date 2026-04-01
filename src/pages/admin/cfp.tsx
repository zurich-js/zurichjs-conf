/**
 * CFP Admin Dashboard
 * Manage submissions, reviewers, and speakers
 */

import { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import {
  SubmissionModal,
  ReviewersTab,
  SpeakersTab,
  SubmissionsTab,
  TagsTab,
  InsightsTab,
  AnalyticsTab,
  StatsCards,
  TabNavigation,
} from '@/components/admin/cfp';
import {
  type CfpTab,
  type CfpAdminSubmission,
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
  mergeTags,
} from '@/lib/cfp/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function CfpAdminDashboard() {
  const [activeTab, setActiveTab] = useState<CfpTab>('submissions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<CfpAdminSubmission | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionStatus, setBulkActionStatus] = useState<string>('');
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();

  // Fetch data
  const { data: stats } = useQuery({
    queryKey: cfpQueryKeys.stats,
    queryFn: fetchStats,
    enabled: isAuthenticated === true,
    staleTime: 30 * 1000,
  });

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: cfpQueryKeys.submissions(statusFilter),
    queryFn: () => fetchSubmissions(statusFilter),
    enabled: isAuthenticated === true && activeTab === 'submissions',
    staleTime: 30 * 1000,
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
          method: 'PATCH',
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

  const mergeTagsMutation = useMutation({
    mutationFn: ({ sourceTagIds, targetName }: { sourceTagIds: string[]; targetName: string }) =>
      mergeTags(sourceTagIds, targetName),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.tags });
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.insights });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.analytics });
      toast.success(
        'Tags Merged',
        `${data.merged_tag_ids.length} tag(s) merged into "${data.tag.name}" across ${data.reassigned_submission_count} submission(s)`
      );
    },
    onError: (error: Error) => {
      toast.error('Merge Failed', error.message);
    },
  });

  // Handlers
  const submissions = submissionsData?.submissions || [];

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

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="CFP Admin" />;

  return (
    <>
      <Head>
        <title>CFP Admin | ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="CFP Management" subtitle="ZurichJS Conference 2026" onLogout={logout} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <StatsCards stats={stats} />
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {activeTab === 'submissions' && (
                <SubmissionsTab
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

              {activeTab === 'speakers' && (
                <SpeakersTab speakers={speakers} isLoading={isLoadingSpeakers} onSelectSubmission={setSelectedSubmission} />
              )}
              {activeTab === 'reviewers' && (
                <ReviewersTab
                  reviewers={reviewers}
                  isLoading={isLoadingReviewers}
                />
              )}
              {activeTab === 'tags' && (
                <TagsTab
                  tags={tags}
                  isLoading={isLoadingTags}
                  onDelete={(id) => deleteTagMutation.mutate(id)}
                  isDeleting={deleteTagMutation.isPending}
                  onMerge={(sourceTagIds, targetName) =>
                    mergeTagsMutation.mutateAsync({ sourceTagIds, targetName }).then(() => undefined)
                  }
                  isMerging={mergeTagsMutation.isPending}
                />
              )}
              {activeTab === 'insights' && (
                <InsightsTab insights={insightsData?.insights || null} stats={stats} isLoading={isLoadingInsights} />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsTab analytics={analyticsData?.analytics || null} isLoading={isLoadingAnalytics} />
              )}
            </div>
          </div>
        </main>

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
