/**
 * Admin Session Feedback
 * Live view of attendee ratings and comments as they come in from /schedule.
 * Polls every 15 seconds while the tab is visible so the room can be watched
 * during the conference without refreshing.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, MessageSquareText } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminQueryProvider } from '@/components/admin/AdminQueryProvider';
import { FeedbackFeed, FeedbackStatsBar, SessionFeedbackTable } from '@/components/admin/feedback';
import { SEO } from '@/components/SEO';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminFetch } from '@/lib/admin/api-fetch';
import { adminKeys } from '@/lib/admin/query-keys';
import type { AdminSessionFeedbackResponse } from '@/lib/feedback/types';

const REFRESH_MS = 15_000;

/** Admin-only page polling the feedback overview and rendering stats, per-session table and live feed. */
export default function AdminFeedbackPage() {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [commentsOnly, setCommentsOnly] = useState(false);

  const { data, isPending, isError, error, dataUpdatedAt } = useQuery({
    queryKey: adminKeys.feedbackOverview(),
    queryFn: ({ signal }) => adminFetch<AdminSessionFeedbackResponse>('/api/admin/feedback', { signal }),
    enabled: isAuthenticated,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: REFRESH_MS / 2,
  });

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    return selectedItemId ? data.entries.filter((entry) => entry.schedule_item_id === selectedItemId) : data.entries;
  }, [data, selectedItemId]);

  const selectedTitle = selectedItemId
    ? data?.sessions.find((session) => session.scheduleItemId === selectedItemId)?.title ?? null
    : null;

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <AdminQueryProvider>
      <SEO title="Session Feedback | Admin" description="Attendee ratings and comments as they come in." noindex />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Session Feedback" subtitle="Attendee ratings as they come in" onLogout={logout} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6 pb-12">
          {isPending ? (
            <div className="py-16 text-center text-sm text-gray-500">Loading feedback…</div>
          ) : isError || !data ? (
            <AdminEmptyState
              icon={<AlertCircle className="w-6 h-6" />}
              title="Could not load feedback"
              description={error instanceof Error ? error.message : 'Please try again.'}
            />
          ) : (
            <>
              <FeedbackStatsBar
                totals={data.totals}
                sessionCount={data.sessions.length}
                isLive
                lastUpdatedAt={dataUpdatedAt || null}
              />

              {data.sessions.length === 0 ? (
                <AdminEmptyState
                  icon={<MessageSquareText className="w-6 h-6" />}
                  title="No rateable sessions on the schedule"
                  description="Feedback forms appear on talks, panels and workshops once they are scheduled and visible."
                />
              ) : (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
                  <SessionFeedbackTable
                    sessions={data.sessions}
                    selectedItemId={selectedItemId}
                    onSelect={setSelectedItemId}
                  />
                  <FeedbackFeed
                    entries={filteredEntries}
                    filterTitle={selectedTitle}
                    onClearFilter={() => setSelectedItemId(null)}
                    commentsOnly={commentsOnly}
                    onToggleCommentsOnly={setCommentsOnly}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminQueryProvider>
  );
}
