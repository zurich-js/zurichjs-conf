/**
 * Reviewer Detail Page
 * Shows individual reviewer's activity and metrics
 */

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Calendar, Star, FileText, ExternalLink } from 'lucide-react';
import { SCORE_LABELS } from '@/components/cfp/reviewer/types';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { Pagination } from '@/components/atoms';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { fetchReviewerActivity } from '@/lib/cfp/api';
import { formatScore } from '@/lib/cfp/scoring';
import { formatRatingSpreadLabel } from '@/lib/cfp/reviewer-scoring';
import { cfpQueryKeys, type CfpAdminReviewerWithActivity, type CfpReviewerActivity } from '@/lib/types/cfp-admin';

type DateRange = '7d' | '30d' | 'all';

function ActivityNoteCell(props: { text: string | null }): ReactNode {
  const { text } = props;
  if (!text?.trim()) {
    return <span className="text-sm text-gray-400">-</span>;
  }
  return (
    <div className="text-sm text-gray-600 max-w-[10rem] xl:max-w-xs truncate" title={text}>
      {text}
    </div>
  );
}

export default function ReviewerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();

  // Fetch reviewer info
  const { data: reviewerInfo, isLoading: isLoadingReviewer } = useQuery<CfpAdminReviewerWithActivity>({
    queryKey: ['cfp', 'reviewer', id, 'info'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}`);
      if (!res.ok) throw new Error('Failed to fetch reviewer');
      const data = await res.json();
      return data.reviewer;
    },
    enabled: isAuthenticated && typeof id === 'string',
  });

  // Fetch activity
  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: cfpQueryKeys.reviewerActivity(id as string, dateRange),
    queryFn: () => fetchReviewerActivity(id as string, dateRange),
    enabled: isAuthenticated && typeof id === 'string',
  });

  const activities = activityData?.activities || [];
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const paginatedActivities = activities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Reviewer Activity" />;

  // Loading reviewer data
  if (isLoadingReviewer || !reviewerInfo) {
    return (
      <>
        <Head>
          <title>Reviewer Activity | ZurichJS</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <AdminHeader title="Reviewer Activity" subtitle="ZurichJS Conference 2026" onLogout={logout} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{reviewerInfo.name || reviewerInfo.email} - Reviewer Activity | ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Reviewer Activity" subtitle="ZurichJS Conference 2026" onLogout={logout} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Back link */}
          <Link
            href="/admin/cfp"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CFP Admin
          </Link>

          {/* Reviewer Header Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-black mb-1">
                  {reviewerInfo.name || 'Unknown Reviewer'}
                </h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{reviewerInfo.email}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-black">{reviewerInfo.total_reviews}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Last 7d</span>
                  </div>
                  <div className="text-2xl font-bold text-black">{reviewerInfo.reviews_last_7_days}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                    <Star className="w-4 h-4" />
                    <span className="text-xs">Avg Score</span>
                  </div>
                  <div className="text-2xl font-bold text-black">{formatScore(reviewerInfo.avg_score_given)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Last Active</div>
                  <div className="text-sm font-medium text-black">
                    {reviewerInfo.last_activity_at
                      ? new Date(reviewerInfo.last_activity_at).toLocaleDateString()
                      : 'Never'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reviewer Scoring Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold text-black mb-1">Reviewer Scoring</h2>
                <p className="text-sm text-gray-600 max-w-2xl">
                  Contribution rating is a 100-point score: 45 points for review volume, 35 points for written internal or speaker feedback, 15 points for useful overall score range, and 5 points for category score range.
                </p>
              </div>
              <div className="rounded-lg bg-black px-4 py-3 text-center">
                <div className="text-xs font-semibold text-gray-300">Rating</div>
                <div className="text-3xl font-bold text-[#F1E271]">{formatScore(reviewerInfo.contribution_score)}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-500">Review Volume</div>
                <div className="text-xl font-bold text-black">{formatScore(reviewerInfo.contribution_volume_score)}</div>
                <div className="mt-1 text-xs text-gray-600">{reviewerInfo.total_reviews} reviews</div>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-500">Written Feedback</div>
                <div className="text-xl font-bold text-black">{formatScore(reviewerInfo.contribution_feedback_score)}</div>
                <div className="mt-1 text-xs text-gray-600">
                  {Math.round(reviewerInfo.feedback_written_percent)}% ({reviewerInfo.feedback_written_count} reviews)
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-500">Score Range</div>
                <div className="text-xl font-bold text-black">{formatRatingSpreadLabel(reviewerInfo.rating_spread)}</div>
                <div className="mt-1 text-xs text-gray-600">
                  {formatScore(reviewerInfo.contribution_rating_spread_score)} contribution points
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <div className="text-xs text-gray-500">Category Range</div>
                <div className="text-xl font-bold text-black">{formatScore(reviewerInfo.contribution_category_rating_spread_score)}</div>
                <div className="mt-1 text-xs text-gray-600">
                  Avg range: {formatScore(reviewerInfo.category_rating_spread)}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Filter Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-black">Review Activity</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Date range:</span>
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value as DateRange);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
            </div>

            {/* Activity Table */}
            <div className="p-6">
              {isLoadingActivity ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No review activity found for this period
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {paginatedActivities.map((activity: CfpReviewerActivity) => (
                      <div key={activity.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="font-medium text-black text-sm line-clamp-2 min-w-0">
                            {activity.submission_title}
                          </div>
                          <Link
                            href={`/cfp/reviewer/submissions/${activity.submission_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                            aria-label={`Open ${activity.submission_title} in reviewer view (opens in new tab)`}
                          >
                            <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 mb-2">
                          <div>
                            <span className="text-gray-500">{SCORE_LABELS.score_overall}:</span>{' '}
                            <span className="font-medium text-black">{formatScore(activity.score_overall)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>{' '}
                            <span className="font-medium text-black">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">{SCORE_LABELS.score_relevance}:</span>{' '}
                            <span className="font-medium text-black">{formatScore(activity.score_relevance)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{SCORE_LABELS.score_technical_depth}:</span>{' '}
                            <span className="font-medium text-black">
                              {formatScore(activity.score_technical_depth)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">{SCORE_LABELS.score_clarity}:</span>{' '}
                            <span className="font-medium text-black">{formatScore(activity.score_clarity)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{SCORE_LABELS.score_diversity}:</span>{' '}
                            <span className="font-medium text-black">{formatScore(activity.score_diversity)}</span>
                          </div>
                        </div>
                        {(activity.private_notes?.trim() || activity.feedback_to_speaker?.trim()) && (
                          <div className="space-y-2 text-xs">
                            {activity.private_notes?.trim() ? (
                              <div className="rounded-lg bg-white p-2 border border-gray-200">
                                <div className="font-semibold text-gray-700 mb-0.5">Internal notes</div>
                                <div className="text-gray-600 line-clamp-3">{activity.private_notes}</div>
                              </div>
                            ) : null}
                            {activity.feedback_to_speaker?.trim() ? (
                              <div className="rounded-lg bg-white p-2 border border-gray-200">
                                <div className="font-semibold text-gray-700 mb-0.5">Speaker feedback</div>
                                <div className="text-gray-600 line-clamp-3">{activity.feedback_to_speaker}</div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-[960px]">
                      <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                        <tr>
                          <th className="px-3 py-3 w-10">
                            <span className="sr-only">Open in reviewer view</span>
                          </th>
                          <th className="px-3 py-3">Submission</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">{SCORE_LABELS.score_overall}</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">{SCORE_LABELS.score_relevance}</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">{SCORE_LABELS.score_technical_depth}</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">{SCORE_LABELS.score_clarity}</th>
                          <th className="px-3 py-3 text-center whitespace-nowrap">{SCORE_LABELS.score_diversity}</th>
                          <th className="px-3 py-3 whitespace-nowrap">Date</th>
                          <th className="px-3 py-3">Internal notes</th>
                          <th className="px-3 py-3">Speaker feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedActivities.map((activity: CfpReviewerActivity) => (
                          <tr key={activity.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3">
                              <Link
                                href={`/cfp/reviewer/submissions/${activity.submission_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                                aria-label={`Open ${activity.submission_title} in reviewer view (opens in new tab)`}
                              >
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                              </Link>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-black text-sm max-w-[14rem] xl:max-w-md truncate">
                                {activity.submission_title}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-black">
                                {formatScore(activity.score_overall)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-sm text-black">
                              {formatScore(activity.score_relevance)}
                            </td>
                            <td className="px-3 py-3 text-center text-sm text-black">
                              {formatScore(activity.score_technical_depth)}
                            </td>
                            <td className="px-3 py-3 text-center text-sm text-black">
                              {formatScore(activity.score_clarity)}
                            </td>
                            <td className="px-3 py-3 text-center text-sm text-black">
                              {formatScore(activity.score_diversity)}
                            </td>
                            <td className="px-3 py-3 text-sm text-black whitespace-nowrap">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-3">
                              <ActivityNoteCell text={activity.private_notes} />
                            </td>
                            <td className="px-3 py-3">
                              <ActivityNoteCell text={activity.feedback_to_speaker} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      pageSize={ITEMS_PER_PAGE}
                      totalItems={activities.length}
                      variant="light"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
