/**
 * Reviewer Detail Page
 * Shows individual reviewer's activity and metrics
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Calendar, Star, FileText } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { Pagination } from '@/components/atoms';
import { CfpLoginForm } from '@/components/admin/cfp/CfpLoginForm';
import { fetchReviewerActivity } from '@/lib/cfp/api';
import { formatScore } from '@/lib/cfp/scoring';
import { cfpQueryKeys, type CfpReviewerActivity } from '@/lib/types/cfp-admin';

type DateRange = '7d' | '30d' | 'all';

interface ReviewerInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
  total_reviews: number;
  reviews_last_7_days: number;
  last_activity_at: string | null;
  avg_score_given: number | null;
}

export default function ReviewerDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Check auth status
  const { data: isAuthenticated, isLoading: isAuthLoading } = useQuery({
    queryKey: ['admin', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/verify');
      return res.ok;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Fetch reviewer info
  const { data: reviewerInfo, isLoading: isLoadingReviewer } = useQuery<ReviewerInfo>({
    queryKey: ['cfp', 'reviewer', id, 'info'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}`);
      if (!res.ok) throw new Error('Failed to fetch reviewer');
      const data = await res.json();
      return data.reviewer;
    },
    enabled: isAuthenticated === true && typeof id === 'string',
  });

  // Fetch activity
  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: cfpQueryKeys.reviewerActivity(id as string, dateRange),
    queryFn: () => fetchReviewerActivity(id as string, dateRange),
    enabled: isAuthenticated === true && typeof id === 'string',
  });

  const activities = activityData?.activities || [];
  const totalPages = Math.ceil(activities.length / ITEMS_PER_PAGE);
  const paginatedActivities = activities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
    return <CfpLoginForm />;
  }

  // Loading reviewer data
  if (isLoadingReviewer || !reviewerInfo) {
    return (
      <>
        <Head>
          <title>Reviewer Activity | ZurichJS</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <AdminHeader title="Reviewer Activity" subtitle="ZurichJS Conference 2026" onLogout={handleLogout} />
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
        <AdminHeader title="Reviewer Activity" subtitle="ZurichJS Conference 2026" onLogout={handleLogout} />

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
                        <div className="font-medium text-black text-sm mb-2 line-clamp-2">
                          {activity.submission_title}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                          <div>
                            <span className="text-gray-500">Score:</span>{' '}
                            <span className="font-medium text-black">{formatScore(activity.score_overall)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>{' '}
                            <span className="font-medium text-black">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {activity.private_notes && (
                          <div className="text-xs text-gray-600 line-clamp-2 bg-white rounded p-2">
                            {activity.private_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                        <tr>
                          <th className="px-4 py-3">Submission</th>
                          <th className="px-4 py-3 text-center">Score</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedActivities.map((activity: CfpReviewerActivity) => (
                          <tr key={activity.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-black text-sm max-w-md truncate">
                                {activity.submission_title}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-medium text-black">
                                {formatScore(activity.score_overall)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-black">
                              {new Date(activity.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              {activity.private_notes ? (
                                <div className="text-sm text-gray-600 max-w-xs truncate" title={activity.private_notes}>
                                  {activity.private_notes}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
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
