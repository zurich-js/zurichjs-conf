/**
 * CFP Reviewer Dashboard
 * List of submissions to review with filtering, sorting, and pagination
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSearchParams } from 'next/navigation';
import { Lock, AlertTriangle } from 'lucide-react';
import { useQueryState, parseAsString, parseAsInteger, parseAsStringLiteral } from 'nuqs';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { saveReviewerNavigationSnapshot } from '@/lib/cfp/reviewer-navigation';
import { getReviewerPermissions } from '@/lib/cfp/reviewer-permissions';
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
  const [showFilters, setShowFilters] = useState(true);

  // URL-driven filter state using nuqs
  const [reviewFilter, setReviewFilter] = useQueryState(
    'filter',
    parseAsStringLiteral(['all', 'pending', 'reviewed', 'bookmarked'] as const).withDefault('all')
  );
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    parseAsString.withDefault('')
  );
  const hasHydratedSearch = useRef(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useQueryState(
    'type',
    parseAsString.withDefault('')
  );
  const [levelFilter, setLevelFilter] = useQueryState(
    'level',
    parseAsString.withDefault('')
  );
  const [statusFilterParam, setStatusFilterParam] = useQueryState(
    'status',
    parseAsString.withDefault('')
  );
  const [coverageMinFilter, setCoverageMinFilter] = useQueryState(
    'coverage_min',
    parseAsInteger.withDefault(0)
  );
  const [tagFilterParam, setTagFilterParam] = useQueryState(
    'tags',
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

  useEffect(() => {
    if (!router.isReady || hasHydratedSearch.current) return;
    hasHydratedSearch.current = true;
    const initialSearchQuery = typeof router.query.q === 'string'
      ? router.query.q
      : Array.isArray(router.query.q)
        ? router.query.q[0] || ''
        : searchQuery;
    setSearchInput(initialSearchQuery);
    setDebouncedSearch(initialSearchQuery);
  }, [router.isReady, router.query.q, searchQuery]);

  useEffect(() => {
    if (!hasHydratedSearch.current) return;

    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!hasHydratedSearch.current) return;
    if (debouncedSearch === searchQuery) return;
    void setSearchQuery(debouncedSearch || null);
    void setCurrentPage(1);
  }, [debouncedSearch, searchQuery, setSearchQuery, setCurrentPage]);

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
  const { reviewer, submissions, stats, isLoading, error } = useCfpReviewerDashboard(debouncedSearch);

  // Bookmarks
  const { isBookmarked } = useBookmarks(reviewer?.email);

  const reviewerPermissions = reviewer ? getReviewerPermissions(reviewer.role) : null;
  const isAnonymous = !reviewerPermissions?.canUseReviewBasedFilters;
  const tagFilters = useMemo(
    () => tagFilterParam.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tagFilterParam]
  );
  const statusFilters = useMemo(
    () => statusFilterParam.split(',').map((status) => status.trim()).filter(Boolean),
    [statusFilterParam]
  );
  const availableTags = useMemo(
    () => Array.from(new Set(
      submissions.flatMap((submission) => submission.tags?.map((tag) => tag.name) || [])
    )).sort((a, b) => a.localeCompare(b)),
    [submissions]
  );

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

    if (typeFilter) {
      result = result.filter((s) => s.submission_type === typeFilter);
    }

    if (levelFilter) {
      result = result.filter((s) => s.talk_level === levelFilter);
    }

    if (statusFilters.length > 0) {
      result = result.filter((s) => statusFilters.includes(s.status));
    }

    if (tagFilters.length > 0) {
      result = result.filter((submission) => {
        const submissionTags = submission.tags?.map((tag) => tag.name) || [];
        return tagFilters.some((selectedTag) => submissionTags.includes(selectedTag));
      });
    }

    if (coverageMinFilter > 0) {
      result = result.filter((submission) => (submission.stats.coverage_percent || 0) >= coverageMinFilter);
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
  }, [submissions, reviewFilter, typeFilter, levelFilter, statusFilters, coverageMinFilter, tagFilters, sortBy, isBookmarked]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  // Wrapper functions to reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

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

  const handleStatusFiltersChange = useCallback((value: string[]) => {
    setStatusFilterParam(value.length > 0 ? value.join(',') : null);
    setCurrentPage(1);
  }, [setStatusFilterParam, setCurrentPage]);

  const handleCoverageMinFilterChange = useCallback((value: number | null) => {
    const nextValue = value && value > 0 ? Math.min(Math.max(value, 0), 100) : null;
    setCoverageMinFilter(nextValue);
    setCurrentPage(1);
  }, [setCoverageMinFilter, setCurrentPage]);

  const handleTagFiltersChange = useCallback((value: string[]) => {
    const nextValue = value.length > 0 ? value.join(',') : null;
    setTagFilterParam(nextValue);
    setCurrentPage(1);
  }, [setTagFilterParam, setCurrentPage]);

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

  useEffect(() => {
    saveReviewerNavigationSnapshot({
      dashboardParams,
      submissionIds: filteredSubmissions.map((submission) => submission.id),
    });
  }, [dashboardParams, filteredSubmissions]);

  const hasActiveFilters = searchInput || typeFilter || levelFilter || statusFilters.length > 0 || tagFilters.length > 0;
  const hasCoverageFilter = coverageMinFilter > 0;
  const hasAnyActiveFilters = !!(hasActiveFilters || hasCoverageFilter);

  const clearAllFilters = async () => {
    setSearchInput('');
    setDebouncedSearch('');
    await Promise.all([
      setSearchQuery(null),
      setTypeFilter(null),
      setLevelFilter(null),
      setStatusFilterParam(null),
      setCoverageMinFilter(null),
      setTagFilterParam(null),
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
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2">
            <Link href="/cfp/reviewer/dashboard" className="flex items-center gap-3">
              <Image src="/images/logo/zurichjs-square.png" alt="ZurichJS" width={40} height={40} className="h-10 w-10" />
              <span className="text-white font-semibold">CFP Review</span>
            </Link>
            <div className="flex items-center gap-4">
              <ReviewGuideButton onClick={() => setShowGuide(true)} />
              <span className="text-brand-gray-light text-sm truncate max-w-[120px] sm:max-w-none">
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
          <StatsCards total={stats.total} reviewed={stats.reviewed} pending={stats.pending} />

        <FilterBar
          searchQuery={searchInput}
          reviewFilter={reviewFilter}
          typeFilter={typeFilter}
          levelFilter={levelFilter}
          statusFilters={statusFilters}
          coverageMinFilter={coverageMinFilter}
          tagFilters={tagFilters}
          availableTags={availableTags}
          sortBy={sortBy}
          showFilters={showFilters}
          hasActiveFilters={hasAnyActiveFilters}
          isAnonymous={isAnonymous}
          canSeeDecisionStatuses={!!reviewerPermissions?.canSeeDecisionStatuses}
          onSearchChange={handleSearchChange}
          onReviewFilterChange={handleReviewFilterChange}
          onTypeFilterChange={handleTypeFilterChange}
          onLevelFilterChange={handleLevelFilterChange}
          onStatusFiltersChange={handleStatusFiltersChange}
          onCoverageMinFilterChange={handleCoverageMinFilterChange}
          onTagFiltersChange={handleTagFiltersChange}
          onSortChange={handleSortChange}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onClearFilters={clearAllFilters}
        />

          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-baseline flex-wrap gap-4">
              <Heading level="h1" className="text-xl sm:text-2xl font-bold text-white">
                Submissions
              </Heading>
              <span className="text-brand-gray-light text-sm">
                {filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? 's' : ''}
                {hasAnyActiveFilters && ` (filtered from ${stats.total})`}
              </span>
            </div>
          </div>

          {/* Submissions List */}
          {paginatedSubmissions.length === 0 ? (
            <EmptyState
              reviewFilter={reviewFilter}
              hasActiveFilters={hasAnyActiveFilters}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <div className="space-y-4">
              {paginatedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  isAnonymous={isAnonymous}
                  activeTagFilters={tagFilters}
                  dashboardParams={dashboardParams}
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
