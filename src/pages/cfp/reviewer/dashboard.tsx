/**
 * CFP Reviewer Dashboard
 * List of submissions to review with filtering, sorting, and pagination
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import { Lock, AlertTriangle } from 'lucide-react';
import { useQueryState, parseAsString, parseAsInteger, parseAsStringLiteral } from 'nuqs';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import { useCfpReviewerDashboard } from '@/hooks/useCfp';
import { useBookmarks } from '@/hooks/cfp';
import { ReviewGuide, ReviewGuideButton } from '@/components/cfp/ReviewGuide';
import {
  ReviewFilterType,
  StatsCards,
  FilterBar,
  SubmissionCard,
  EmptyState,
  Pagination,
} from '@/components/cfp/reviewer';

export default function ReviewerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // URL-driven filter state using nuqs
  const [reviewFilter, setReviewFilter] = useQueryState(
    'filter',
    parseAsStringLiteral(['all', 'pending', 'reviewed', 'bookmarked'] as const).withDefault('all')
  );
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('')
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    'type',
    parseAsString.withDefault('')
  );
  const [levelFilter, setLevelFilter] = useQueryState(
    'level',
    parseAsString.withDefault('')
  );
  const [sortBy, setSortBy] = useQueryState(
    'sort',
    parseAsString.withDefault('least_reviews')
  );

  // URL-driven pagination state
  const [currentPage, setCurrentPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1)
  );
  const [pageSize, setPageSize] = useQueryState(
    'size',
    parseAsInteger.withDefault(10)
  );

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user || !user.email) {
        router.replace('/cfp/reviewer/login');
        return;
      }

      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  // Fetch dashboard data
  const { reviewer, submissions, isLoading, error } = useCfpReviewerDashboard();

  const reviewedCount = submissions.filter((s) => s.my_review).length;
  const pendingCount = submissions.filter((s) => !s.my_review).length;

  // Bookmarks
  const { isBookmarked, toggleBookmark } = useBookmarks(reviewer?.email);

  // Determine if reviewer is anonymous (cannot see speaker identity or review stats)
  const isAnonymous = reviewer ? reviewer.role !== 'super_admin' && !reviewer.can_see_speaker_identity : true;

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    if (reviewFilter === 'reviewed') {
      result = result.filter((s) => s.my_review);
    } else if (reviewFilter === 'pending') {
      result = result.filter((s) => !s.my_review);
    } else if (reviewFilter === 'bookmarked') {
      result = result.filter((s) => isBookmarked(s.id));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.title.toLowerCase().includes(query) ||
        s.abstract.toLowerCase().includes(query) ||
        s.tags?.some((t) => t.name.toLowerCase().includes(query))
      );
    }

    if (typeFilter) {
      result = result.filter((s) => s.submission_type === typeFilter);
    }

    if (levelFilter) {
      result = result.filter((s) => s.talk_level === levelFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'most_reviews':
          return (b.stats.review_count || 0) - (a.stats.review_count || 0);
        case 'least_reviews':
          return (a.stats.review_count || 0) - (b.stats.review_count || 0);
        case 'highest_avg':
          return (b.stats.avg_overall || 0) - (a.stats.avg_overall || 0);
        case 'lowest_avg':
          return (a.stats.avg_overall || 0) - (b.stats.avg_overall || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [submissions, reviewFilter, searchQuery, typeFilter, levelFilter, sortBy, isBookmarked]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  // Wrapper functions to reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value || null);
    setCurrentPage(1);
  }, [setSearchQuery, setCurrentPage]);

  const handleReviewFilterChange = useCallback((value: ReviewFilterType) => {
    setReviewFilter(value);
    setCurrentPage(1);
  }, [setReviewFilter, setCurrentPage]);

  const handleTypeFilterChange = useCallback((value: string) => {
    setTypeFilter(value || null);
    setCurrentPage(1);
  }, [setTypeFilter, setCurrentPage]);

  const handleLevelFilterChange = useCallback((value: string) => {
    setLevelFilter(value || null);
    setCurrentPage(1);
  }, [setLevelFilter, setCurrentPage]);

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value || null);
    setCurrentPage(1);
  }, [setSortBy, setCurrentPage]);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  }, [setPageSize, setCurrentPage]);

  // Get current search params string to pass to submission links for return navigation
  const dashboardParams = useMemo(() => {
    return searchParams?.toString() || '';
  }, [searchParams]);

  const hasActiveFilters = searchQuery || typeFilter || levelFilter;

  const clearAllFilters = async () => {
    await Promise.all([
      setSearchQuery(null),
      setTypeFilter(null),
      setLevelFilter(null),
      setReviewFilter('all'),
      setCurrentPage(1),
    ]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/cfp/reviewer/login');
  };

  // Loading state
  if (!authChecked || isLoading) {
    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-gray-light">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !reviewer) {
    const isAuthError = error?.toLowerCase().includes('unauthorized') || error?.toLowerCase().includes('log in');

    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-brand-gray-dark rounded-2xl p-8 text-center">
            <div className={`w-16 h-16 ${isAuthError ? 'bg-orange-500/20' : 'bg-red-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isAuthError ? (
                <Lock className="w-8 h-8 text-orange-400" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <Heading level="h1" className="text-xl font-bold text-white mb-3">
              {isAuthError ? 'Session Expired' : 'Something Went Wrong'}
            </Heading>
            <p className="text-brand-gray-light mb-6">
              {isAuthError
                ? 'Your session has expired or you need to log in again.'
                : error || 'Failed to load reviewer data. Please try again.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/cfp/reviewer/login')}
                className="px-6 py-3 bg-brand-primary text-black font-semibold rounded-xl hover:bg-brand-primary-dark transition-colors cursor-pointer"
              >
                {isAuthError ? 'Log In Again' : 'Back to Login'}
              </button>
              {!isAuthError && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-brand-gray-medium text-white font-medium rounded-xl hover:bg-brand-gray-light/20 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Review Dashboard | CFP"
        description="Review CFP submissions for ZurichJS Conf 2026"
        noindex
      />

      <ReviewGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/reviewer/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">CFP Review</span>
            </Link>
            <div className="flex items-center gap-4">
              <ReviewGuideButton onClick={() => setShowGuide(true)} />
              <span className="text-brand-gray-light text-sm">
                {reviewer.name || reviewer.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-brand-gray-light hover:text-white text-sm transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <StatsCards total={submissions.length} reviewed={reviewedCount} pending={pendingCount} />

          <FilterBar
            searchQuery={searchQuery}
            reviewFilter={reviewFilter}
            typeFilter={typeFilter}
            levelFilter={levelFilter}
            sortBy={sortBy}
            showFilters={showFilters}
            hasActiveFilters={!!hasActiveFilters}
            isAnonymous={isAnonymous}
            onSearchChange={handleSearchChange}
            onReviewFilterChange={handleReviewFilterChange}
            onTypeFilterChange={handleTypeFilterChange}
            onLevelFilterChange={handleLevelFilterChange}
            onSortChange={handleSortChange}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onClearFilters={clearAllFilters}
          />

          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Heading level="h1" className="text-2xl font-bold text-white">
                Submissions
              </Heading>
              <span className="text-brand-gray-light text-sm">
                {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? 's' : ''}
                {hasActiveFilters && ` (filtered from ${submissions.length})`}
              </span>
            </div>
          </div>

          {/* Submissions List */}
          {paginatedSubmissions.length === 0 ? (
            <EmptyState
              reviewFilter={reviewFilter}
              hasActiveFilters={!!hasActiveFilters}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <div className="space-y-4">
              {paginatedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  isAnonymous={isAnonymous}
                  dashboardParams={dashboardParams}
                  isBookmarked={isBookmarked(submission.id)}
                  onToggleBookmark={toggleBookmark}
                />
              ))}
            </div>
          )}

          {filteredSubmissions.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredSubmissions.length}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={handlePageSizeChange}
              showPageSizeSelector={true}
              pageSizeOptions={[10, 25, 50, 100]}
              variant="dark"
            />
          )}
        </main>
      </div>
    </>
  );
}
