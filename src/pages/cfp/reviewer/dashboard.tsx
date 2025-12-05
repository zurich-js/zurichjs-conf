/**
 * CFP Reviewer Dashboard
 * List of submissions to review
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SEO } from '@/components/SEO';
import { Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import type {
  CfpReviewer,
  CfpSubmission,
  CfpTag,
  CfpReview,
  CfpSubmissionStats,
} from '@/lib/types/cfp';

interface SubmissionWithReview extends CfpSubmission {
  tags?: CfpTag[];
  my_review?: CfpReview | null;
  stats: CfpSubmissionStats;
}

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
    under_review: 'Under Review',
    waitlisted: 'Waitlisted',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-500/20 text-gray-300'}`}>
      {labels[status] || status}
    </span>
  );
};

const TYPE_LABELS: Record<string, string> = {
  lightning: 'Lightning',
  standard: 'Standard',
  workshop: 'Workshop',
};

export default function ReviewerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviewer, setReviewer] = useState<CfpReviewer | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithReview[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [filter, setFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log('[Reviewer Dashboard] No authenticated user');
          router.replace('/cfp/reviewer/login');
          return;
        }

        console.log('[Reviewer Dashboard] User authenticated:', user.email);

        // Fetch reviewer data and submissions from API
        const response = await fetch('/api/cfp/reviewer/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/cfp/reviewer/login');
            return;
          }
          const data = await response.json();
          throw new Error(data.error || 'Failed to load dashboard');
        }

        const data = await response.json();
        setReviewer(data.reviewer);
        setSubmissions(data.submissions);
        setTotalSubmissions(data.total);
      } catch (err) {
        console.error('[Reviewer Dashboard] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  const reviewedCount = submissions.filter((s) => s.my_review).length;
  const pendingCount = submissions.filter((s) => !s.my_review).length;

  const filteredSubmissions = submissions.filter((s) => {
    if (filter === 'reviewed') return s.my_review;
    if (filter === 'pending') return !s.my_review;
    return true;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/cfp/reviewer/login');
  };

  if (loading) {
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
    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Failed to load reviewer data'}</p>
          <button
            onClick={() => router.push('/cfp/reviewer/login')}
            className="px-4 py-2 bg-brand-primary text-black rounded-lg font-medium"
          >
            Back to Login
          </button>
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

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/reviewer/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">CFP Review</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-brand-gray-light text-sm">
                {reviewer.name || reviewer.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-brand-gray-light hover:text-white text-sm transition-colors"
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
              <div className="text-3xl font-bold text-white mb-1">{totalSubmissions}</div>
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

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Heading level="h1" className="text-2xl font-bold text-white">
              Submissions to Review
            </Heading>

            {/* Filter */}
            <div className="flex gap-2">
              {(['all', 'pending', 'reviewed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-brand-primary text-black'
                      : 'bg-brand-gray-dark text-brand-gray-light hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Reviewed'}
                </button>
              ))}
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-brand-gray-dark rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-brand-gray-medium rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-gray-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Heading level="h2" className="text-lg font-bold text-white mb-2">
                {filter === 'pending' ? 'All Caught Up!' : 'No Submissions'}
              </Heading>
              <p className="text-brand-gray-light">
                {filter === 'pending'
                  ? 'You have reviewed all available submissions.'
                  : 'No submissions match your filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/cfp/reviewer/submissions/${submission.id}`}
                  className="block bg-brand-gray-dark rounded-xl p-6 hover:bg-brand-gray-medium transition-colors"
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
        </main>
      </div>
    </>
  );
}

