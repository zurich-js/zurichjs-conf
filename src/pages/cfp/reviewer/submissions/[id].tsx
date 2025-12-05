/**
 * CFP Reviewer Submission Detail Page
 * View submission and submit/edit review
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SEO } from '@/components/SEO';
import { Button, Heading } from '@/components/atoms';
import { supabase } from '@/lib/supabase/client';
import type {
  CfpReviewer,
  CfpSubmission,
  CfpSpeaker,
  CfpTag,
  CfpReview,
  CfpSubmissionStats,
} from '@/lib/types/cfp';

interface SubmissionWithDetails extends Omit<CfpSubmission, 'speaker'> {
  speaker?: CfpSpeaker | null;
  tags?: CfpTag[];
  my_review?: CfpReview | null;
  all_reviews?: CfpReview[];
  stats: CfpSubmissionStats;
}

const TYPE_LABELS: Record<string, string> = {
  lightning: 'Lightning Talk (10 min)',
  standard: 'Standard Talk (30 min)',
  workshop: 'Workshop',
};

const SCORE_LABELS = {
  score_overall: 'Overall',
  score_relevance: 'Relevance',
  score_technical_depth: 'Technical Depth',
  score_clarity: 'Clarity',
  score_diversity: 'Diversity',
};

export default function ReviewerSubmission() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<CfpReviewer | null>(null);
  const [submission, setSubmission] = useState<SubmissionWithDetails | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [scores, setScores] = useState({
    score_overall: 0,
    score_relevance: 0,
    score_technical_depth: 0,
    score_clarity: 0,
    score_diversity: 0,
  });
  const [privateNotes, setPrivateNotes] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        // Check authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log('[Reviewer Submission] No authenticated user');
          router.replace('/cfp/reviewer/login');
          return;
        }

        setUserId(user.id);

        // Fetch submission data
        const response = await fetch(`/api/cfp/reviewer/submissions/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/cfp/reviewer/login');
            return;
          }
          if (response.status === 404) {
            setError('Submission not found');
            return;
          }
          const data = await response.json();
          throw new Error(data.error || 'Failed to load submission');
        }

        const data = await response.json();
        setReviewer(data.reviewer);
        setSubmission(data.submission);

        // Initialize form with existing review
        if (data.submission.my_review) {
          setScores({
            score_overall: data.submission.my_review.score_overall || 0,
            score_relevance: data.submission.my_review.score_relevance || 0,
            score_technical_depth: data.submission.my_review.score_technical_depth || 0,
            score_clarity: data.submission.my_review.score_clarity || 0,
            score_diversity: data.submission.my_review.score_diversity || 0,
          });
          setPrivateNotes(data.submission.my_review.private_notes || '');
          setFeedback(data.submission.my_review.feedback_to_speaker || '');
        }
      } catch (err) {
        console.error('[Reviewer Submission] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  const hasExistingReview = !!submission?.my_review;

  const handleScoreChange = (field: keyof typeof scores, value: number) => {
    setScores((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (scores.score_overall < 1 || scores.score_overall > 5) {
      setFormError('Overall score is required (1-5)');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const method = hasExistingReview ? 'PUT' : 'POST';
      const response = await fetch(`/api/cfp/reviewer/submissions/${submission!.id}/review`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          score_overall: scores.score_overall,
          score_relevance: scores.score_relevance || undefined,
          score_technical_depth: scores.score_technical_depth || undefined,
          score_clarity: scores.score_clarity || undefined,
          score_diversity: scores.score_diversity || undefined,
          private_notes: privateNotes || undefined,
          feedback_to_speaker: feedback || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/cfp/reviewer/dashboard');
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-brand-gray-light">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error || !submission || !reviewer) {
    return (
      <div className="min-h-screen bg-brand-gray-darkest flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Submission not found'}</p>
          <Link
            href="/cfp/reviewer/dashboard"
            className="px-4 py-2 bg-brand-primary text-black rounded-lg font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`Review: ${submission.title} | CFP`}
        description="Review CFP submission"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp/reviewer/dashboard" className="flex items-center gap-3">
              <img src="/images/logo/zurichjs-square.png" alt="ZurichJS" className="h-10 w-10" />
              <span className="text-white font-semibold">Review Submission</span>
            </Link>
            <Link
              href="/cfp/reviewer/dashboard"
              className="text-brand-gray-light hover:text-white text-sm transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Submission Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium">
                    {TYPE_LABELS[submission.submission_type]}
                  </span>
                  <span className="text-brand-gray-light text-sm capitalize">
                    {submission.talk_level}
                  </span>
                </div>
                <Heading level="h1" className="text-2xl font-bold text-white mb-4">
                  {submission.title}
                </Heading>
              </div>

              {/* Speaker Info (super_admin only) */}
              {submission.speaker && reviewer.role === 'super_admin' && (
                <section className="bg-brand-gray-dark rounded-xl p-6">
                  <h2 className="text-sm font-semibold text-brand-gray-medium mb-3">Speaker</h2>
                  <div className="flex items-start gap-4">
                    {submission.speaker.profile_image_url && (
                      <img
                        src={submission.speaker.profile_image_url}
                        alt=""
                        className="w-16 h-16 rounded-full flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-lg">
                        {submission.speaker.first_name} {submission.speaker.last_name}
                      </div>
                      {(submission.speaker.job_title || submission.speaker.company) && (
                        <div className="text-sm text-brand-gray-light mt-0.5">
                          {submission.speaker.job_title && submission.speaker.job_title}
                          {submission.speaker.job_title && submission.speaker.company && ' at '}
                          {submission.speaker.company && submission.speaker.company}
                        </div>
                      )}
                      <div className="text-sm text-brand-gray-medium mt-1">
                        {submission.speaker.email}
                      </div>

                      {/* Social Links */}
                      <div className="flex flex-wrap gap-3 mt-3">
                        {submission.speaker.linkedin_url && (
                          <a
                            href={submission.speaker.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-brand-gray-light hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            LinkedIn
                          </a>
                        )}
                        {submission.speaker.github_url && (
                          <a
                            href={submission.speaker.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-brand-gray-light hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                          </a>
                        )}
                        {submission.speaker.twitter_handle && (
                          <a
                            href={`https://twitter.com/${submission.speaker.twitter_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-brand-gray-light hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            @{submission.speaker.twitter_handle}
                          </a>
                        )}
                        {submission.speaker.bluesky_handle && (
                          <a
                            href={`https://bsky.app/profile/${submission.speaker.bluesky_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-brand-gray-light hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/>
                            </svg>
                            {submission.speaker.bluesky_handle}
                          </a>
                        )}
                        {submission.speaker.mastodon_handle && (
                          <span className="inline-flex items-center gap-1.5 text-sm text-brand-gray-light">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.668 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/>
                            </svg>
                            {submission.speaker.mastodon_handle}
                          </span>
                        )}
                      </div>

                      {/* Bio */}
                      {submission.speaker.bio && (
                        <p className="text-sm text-brand-gray-light mt-3 whitespace-pre-wrap">
                          {submission.speaker.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Anonymous Notice (for reviewer and readonly) */}
              {reviewer.role !== 'super_admin' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-medium">Anonymous Review Mode</span>
                  </div>
                </div>
              )}

              {/* Abstract */}
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Abstract</h2>
                <p className="text-brand-gray-light whitespace-pre-wrap">{submission.abstract}</p>
              </section>

              {/* Tags */}
              {submission.tags && submission.tags.length > 0 && (
                <section className="bg-brand-gray-dark rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {submission.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Outline */}
              {submission.outline && (
                <section className="bg-brand-gray-dark rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Outline</h2>
                  <p className="text-brand-gray-light whitespace-pre-wrap">{submission.outline}</p>
                </section>
              )}

              {/* Additional Notes */}
              {submission.additional_notes && (
                <section className="bg-brand-gray-dark rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Notes from Speaker</h2>
                  <p className="text-brand-gray-light whitespace-pre-wrap">{submission.additional_notes}</p>
                </section>
              )}

              {/* Workshop Details */}
              {submission.submission_type === 'workshop' && (
                <section className="bg-brand-gray-dark rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Workshop Details</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Duration</h3>
                      <p className="text-white">{submission.workshop_duration_hours} hours</p>
                    </div>
                    {submission.workshop_max_participants && (
                      <div>
                        <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Max Participants</h3>
                        <p className="text-white">{submission.workshop_max_participants}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Travel Info */}
              <section className="bg-brand-gray-dark rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Travel</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Travel Assistance</h3>
                    <p className="text-white">
                      {submission.travel_assistance_required ? 'Requested' : 'Not needed'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Company Covers Travel</h3>
                    <p className="text-white">
                      {submission.company_can_cover_travel ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {submission.travel_origin && (
                    <div className="sm:col-span-2">
                      <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Traveling From</h3>
                      <p className="text-white">{submission.travel_origin}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Other Reviews (super_admin only) */}
              {reviewer.role === 'super_admin' && submission.all_reviews && submission.all_reviews.length > 0 && (
                <section className="bg-brand-gray-dark rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">
                    All Reviews ({submission.all_reviews.length})
                  </h2>
                  <div className="space-y-4">
                    {submission.all_reviews.map((review) => (
                      <div key={review.id} className="bg-brand-gray-darkest rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">
                            Overall: {review.score_overall}/5
                          </span>
                          <span className="text-xs text-brand-gray-medium">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {review.private_notes && (
                          <p className="text-sm text-brand-gray-light">{review.private_notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Review Form Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                {/* Readonly Notice */}
                {reviewer.role === 'readonly' && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-6 text-center mb-4">
                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">Read Only Access</h2>
                    <p className="text-brand-gray-light text-sm">You can view submissions but cannot submit reviews.</p>
                  </div>
                )}

                {success ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">Review Submitted!</h2>
                    <p className="text-brand-gray-light">Redirecting to dashboard...</p>
                  </div>
                ) : reviewer.role !== 'readonly' ? (
                  <form onSubmit={handleSubmit} className="bg-brand-gray-dark rounded-2xl p-6 space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-white mb-2">
                        {hasExistingReview ? 'Update Your Review' : 'Submit Your Review'}
                      </h2>
                      <p className="text-sm text-brand-gray-light">
                        Rate this submission on a scale of 1-5
                      </p>
                    </div>

                    {formError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-400 text-sm">{formError}</p>
                      </div>
                    )}

                    {/* Score Fields */}
                    {Object.entries(SCORE_LABELS).map(([field, label]) => (
                      <div key={field}>
                        <label className="block text-sm font-semibold text-white mb-2">
                          {label} {field === 'score_overall' && <span className="text-red-400">*</span>}
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => handleScoreChange(field as keyof typeof scores, n)}
                              className={`w-10 h-10 rounded-lg font-semibold transition-colors ${
                                scores[field as keyof typeof scores] === n
                                  ? 'bg-brand-primary text-black'
                                  : 'bg-brand-gray-darkest text-brand-gray-light hover:bg-brand-gray-medium'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Private Notes */}
                    <div>
                      <label htmlFor="private_notes" className="block text-sm font-semibold text-white mb-2">
                        Private Notes
                        <span className="font-normal text-brand-gray-medium ml-2">(committee only)</span>
                      </label>
                      <textarea
                        id="private_notes"
                        value={privateNotes}
                        onChange={(e) => setPrivateNotes(e.target.value)}
                        placeholder="Notes visible only to reviewers..."
                        rows={3}
                        className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm"
                      />
                    </div>

                    {/* Feedback to Speaker */}
                    <div>
                      <label htmlFor="feedback" className="block text-sm font-semibold text-white mb-2">
                        Feedback to Speaker
                        <span className="font-normal text-brand-gray-medium ml-2">(optional)</span>
                      </label>
                      <textarea
                        id="feedback"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Constructive feedback for the speaker..."
                        rows={3}
                        className="w-full bg-brand-gray-darkest text-white placeholder:text-brand-gray-medium rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all text-sm"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      loading={isSubmitting}
                      disabled={isSubmitting || scores.score_overall === 0}
                      className="w-full"
                    >
                      {hasExistingReview ? 'Update Review' : 'Submit Review'}
                    </Button>
                  </form>
                ) : null}

                {/* Stats Card */}
                <div className="bg-brand-gray-dark rounded-xl p-4 mt-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Review Stats</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-brand-gray-medium">Reviews:</span>
                      <span className="text-white ml-1">{submission.stats.review_count}</span>
                    </div>
                    {submission.stats.avg_overall && (
                      <div>
                        <span className="text-brand-gray-medium">Avg:</span>
                        <span className="text-white ml-1">{submission.stats.avg_overall.toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
