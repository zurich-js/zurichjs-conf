/**
 * Admin Session Feedback
 * Live view of attendee ratings and comments as they come in from /schedule.
 * Polls every 15 seconds while the tab is visible so the room can be watched
 * during the conference without refreshing.
 *
 * Two rollups: by session (schedule order) and by speaker (ratings pooled
 * across every session they appeared in). Either one drills down into a
 * per-talk / per-speaker view with the full star breakdown and comments.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, MessageSquareText, Mic, Presentation } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminQueryProvider } from '@/components/admin/AdminQueryProvider';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import {
  FeedbackDetailModal,
  FeedbackFeed,
  FeedbackStatsBar,
  SessionFeedbackTable,
  SpeakerFeedbackTable,
} from '@/components/admin/feedback';
import { SEO } from '@/components/SEO';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { adminFetch } from '@/lib/admin/api-fetch';
import { adminKeys } from '@/lib/admin/query-keys';
import { selectFeedbackDetail } from '@/lib/feedback/detail';
import type { AdminSessionFeedbackResponse, FeedbackDetailTarget } from '@/lib/types/session-feedback';

const REFRESH_MS = 15_000;

type FeedbackView = 'sessions' | 'speakers';

const VIEW_TABS: AdminTab<FeedbackView>[] = [
  { id: 'sessions', label: 'By session', icon: Presentation },
  { id: 'speakers', label: 'By speaker', icon: Mic },
];

/** Admin-only page polling the feedback overview and rendering stats, rollups and the live feed. */
export default function AdminFeedbackPage(): React.JSX.Element {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const [view, setView] = useState<FeedbackView>('sessions');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<FeedbackDetailTarget | null>(null);
  const [commentsOnly, setCommentsOnly] = useState(false);

  const { data, isPending, isError, error, dataUpdatedAt } = useQuery({
    queryKey: adminKeys.feedbackOverview(),
    queryFn: ({ signal }) => adminFetch<AdminSessionFeedbackResponse>('/api/admin/feedback', { signal }),
    enabled: isAuthenticated,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: REFRESH_MS / 2,
  });

  const selectedSpeaker = useMemo(
    () => (selectedSpeakerId ? data?.speakers.find((speaker) => speaker.speakerId === selectedSpeakerId) ?? null : null),
    [data, selectedSpeakerId]
  );

  /** Schedule items the feed is narrowed to, or null when it shows everything. */
  const feedFilter = useMemo((): { title: string; itemIds: Set<string> } | null => {
    if (view === 'speakers') {
      if (!selectedSpeaker) return null;
      return {
        title: selectedSpeaker.name,
        itemIds: new Set(selectedSpeaker.sessions.map((session) => session.scheduleItemId)),
      };
    }
    if (!selectedItemId) return null;
    const session = data?.sessions.find((summary) => summary.scheduleItemId === selectedItemId);
    return { title: session?.title ?? 'Selected session', itemIds: new Set([selectedItemId]) };
  }, [data, selectedItemId, selectedSpeaker, view]);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    if (!feedFilter) return data.entries;
    return data.entries.filter((entry) => entry.schedule_item_id !== null && feedFilter.itemIds.has(entry.schedule_item_id));
  }, [data, feedFilter]);

  const detail = useMemo(
    () => (data && detailTarget ? selectFeedbackDetail(data, detailTarget) : null),
    [data, detailTarget]
  );

  const clearFeedFilter = (): void => {
    if (view === 'speakers') setSelectedSpeakerId(null);
    else setSelectedItemId(null);
  };

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
                <>
                  <AdminTabBar tabs={VIEW_TABS} activeTab={view} onTabChange={setView} />

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start">
                    {view === 'sessions' ? (
                      <SessionFeedbackTable
                        sessions={data.sessions}
                        selectedItemId={selectedItemId}
                        onSelect={setSelectedItemId}
                        onOpenDetail={(scheduleItemId) => setDetailTarget({ kind: 'session', id: scheduleItemId })}
                      />
                    ) : (
                      <SpeakerFeedbackTable
                        speakers={data.speakers}
                        selectedSpeakerId={selectedSpeakerId}
                        onSelect={setSelectedSpeakerId}
                        onOpenDetail={(speakerId) => setDetailTarget({ kind: 'speaker', id: speakerId })}
                      />
                    )}
                    <FeedbackFeed
                      entries={filteredEntries}
                      filterTitle={feedFilter?.title ?? null}
                      onClearFilter={clearFeedFilter}
                      commentsOnly={commentsOnly}
                      onToggleCommentsOnly={setCommentsOnly}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {detail ? (
          <FeedbackDetailModal
            detail={detail}
            onClose={() => setDetailTarget(null)}
            onOpenSession={(scheduleItemId) => setDetailTarget({ kind: 'session', id: scheduleItemId })}
          />
        ) : null}
      </div>
    </AdminQueryProvider>
  );
}
