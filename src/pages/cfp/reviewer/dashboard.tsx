/**
 * CFP Reviewer Dashboard
 * List of submissions to review with filtering, sorting, and pagination
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import { useCfpReviewerDashboard } from '@/hooks/useCfp';
import { ReviewGuide, ReviewGuideButton } from '@/components/cfp/ReviewGuide';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    submitted: 'bg-blue-500/20 text-blue-300',
    under_review: 'bg-purple-500/20 text-purple-300',
    waitlisted: 'bg-orange-500/20 text-orange-300',
    accepted: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
  };

  const labels: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'In Review',
    waitlisted: 'Waitlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${styles[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {labels[status] || status}
    </span>
  );
};

const TYPE_LABELS: Record<string, string> = {
  lightning: 'Lightning',
  standard: 'Standard',
  workshop: 'Workshop',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'standard', label: 'Standard' },
  { value: 'workshop', label: 'Workshop' },
];

const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'most_reviews', label: 'Most Reviews' },
  { value: 'least_reviews', label: 'Least Reviews' },
  { value: 'highest_avg', label: 'Highest Avg Score' },
  { value: 'lowest_avg', label: 'Lowest Avg Score' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function ReviewerDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [reviewFilter, setReviewFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Fetch dashboard data using TanStack Query (with 10-min cache)
  const {
    reviewer,
    submissions,
    stats,
    isLoading,
    error,
  } = useCfpReviewerDashboard();

  const reviewedCount = submissions.filter((s) => s.my_review).length;
  const pendingCount = submissions.filter((s) => !s.my_review).length;

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    // Review status filter
    if (reviewFilter === 'reviewed') {
      result = result.filter((s) => s.my_review);
    } else if (reviewFilter === 'pending') {
      result = result.filter((s) => !s.my_review);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.title.toLowerCase().includes(query) ||
        s.abstract.toLowerCase().includes(query) ||
        s.tags?.some((t) => t.name.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((s) => s.submission_type === typeFilter);
    }

    // Level filter
    if (levelFilter) {
      result = result.filter((s) => s.talk_level === levelFilter);
    }

    // Sort
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
  }, [submissions, reviewFilter, searchQuery, statusFilter, typeFilter, levelFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [reviewFilter, searchQuery, statusFilter, typeFilter, levelFilter, pageSize]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter || typeFilter || levelFilter;

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
    setLevelFilter('');
    setReviewFilter('all');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/cfp/reviewer/login');
  };

  // Show loading while checking auth or loading data
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

  if (error || !reviewer) {
    const isAuthError = error?.toLowerCase().includes('unauthorized') || error?.toLowerCase().includes('log in');

    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-brand-gray-dark rounded-2xl p-8 text-center">
            <div className={`w-16 h-16 ${isAuthError ? 'bg-orange-500/20' : 'bg-red-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isAuthError ? (
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
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

      {/* Review Guide Modal */}
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
          {/* Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-brand-gray-dark rounded-xl p-6">
              <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
              <div className="text-brand-gray-light text-sm">Total Submissions</div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-1">{reviewedCount}</div>
              <div className="text-brand-gray-light text-sm">Reviewed by You</div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-6">
              <div className="text-3xl font-bold text-brand-primary mb-1">{pendingCount}</div>
              <div className="text-brand-gray-light text-sm">Pending Review</div>
            </div>
          </div>

          {/* Search and Quick Filters */}
          <div className="bg-brand-gray-dark rounded-xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gray-medium"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, abstract, or tags..."
                    className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-medium hover:text-white cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Review Filter */}
              <div className="flex gap-2">
                {(['all', 'pending', 'reviewed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      reviewFilter === f
                        ? 'bg-brand-primary text-black'
                        : 'bg-brand-gray-darkest text-brand-gray-light hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Reviewed'}
                  </button>
                ))}
              </div>

              {/* Toggle Advanced Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-2 ${
                  showFilters || hasActiveFilters
                    ? 'bg-brand-primary/20 text-brand-primary'
                    : 'bg-brand-gray-darkest text-brand-gray-light hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-brand-primary" />
                )}
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-brand-gray-medium">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-brand-gray-light mb-1.5">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-brand-gray-darkest text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-brand-gray-light mb-1.5">Type</label>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full bg-brand-gray-darkest text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level Filter */}
                  <div>
                    <label className="block text-xs font-medium text-brand-gray-light mb-1.5">Level</label>
                    <select
                      value={levelFilter}
                      onChange={(e) => setLevelFilter(e.target.value)}
                      className="w-full bg-brand-gray-darkest text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                    >
                      {LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-xs font-medium text-brand-gray-light mb-1.5">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-brand-gray-darkest text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-brand-gray-light hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

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

            {/* Page Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-brand-gray-light">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-brand-gray-dark text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions List */}
          {paginatedSubmissions.length === 0 ? (
            <div className="bg-brand-gray-dark rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-brand-gray-medium rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-gray-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Heading level="h2" className="text-lg font-bold text-white mb-2">
                {reviewFilter === 'pending' && !hasActiveFilters ? 'All Caught Up!' : 'No Submissions Found'}
              </Heading>
              <p className="text-brand-gray-light mb-4">
                {reviewFilter === 'pending' && !hasActiveFilters
                  ? 'You have reviewed all available submissions.'
                  : 'No submissions match your current filters.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-brand-primary hover:underline cursor-pointer"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/cfp/reviewer/submissions/${submission.id}`}
                  className="block bg-brand-gray-dark rounded-xl p-6 hover:bg-brand-gray-dark/70 border border-transparent hover:border-brand-gray-medium transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={submission.status} />
                        <span className="text-brand-gray-medium text-sm">
                          {TYPE_LABELS[submission.submission_type]}
                        </span>
                        <span className="text-brand-gray-medium text-sm capitalize">
                          {submission.talk_level}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {submission.title}
                      </h3>
                      <p className="text-brand-gray-light text-sm line-clamp-2 mb-3">
                        {submission.abstract}
                      </p>
                      {submission.tags && submission.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {submission.tags.slice(0, 5).map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 bg-brand-gray-darkest text-brand-gray-light rounded text-xs"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {/* Review Status */}
                      {submission.my_review ? (
                        <div className="mb-2">
                          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                            Reviewed
                          </span>
                          <div className="text-sm text-brand-gray-light mt-1">
                            Score: {submission.my_review.score_overall}/5
                          </div>
                        </div>
                      ) : (
                        <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium">
                          Needs Review
                        </span>
                      )}

                      {/* Stats */}
                      <div className="text-sm text-brand-gray-medium mt-2">
                        {submission.stats.review_count} review{submission.stats.review_count !== 1 ? 's' : ''}
                        {submission.stats.avg_overall && (
                          <span className="ml-2">
                            Avg: {submission.stats.avg_overall.toFixed(1)}/5
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Page Info */}
              <div className="text-sm text-brand-gray-light">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredSubmissions.length)} of {filteredSubmissions.length}
              </div>

              {/* Page Controls */}
              <div className="flex items-center gap-2">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="First page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Previous page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, current, and pages around current
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | 'ellipsis')[]>((acc, page, idx, arr) => {
                      // Add ellipsis where there are gaps
                      if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                        acc.push('ellipsis');
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-brand-gray-medium">...</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            currentPage === item
                              ? 'bg-brand-primary text-black'
                              : 'bg-brand-gray-dark text-brand-gray-light hover:text-white'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Next page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-brand-gray-dark text-brand-gray-light hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Last page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
