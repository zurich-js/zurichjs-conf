/**
 * CFP Speaker Dashboard
 * Protected page showing speaker's submissions and profile status
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { createClient } from '@supabase/supabase-js';
import { AlertCircle } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading } from '@/components/atoms';
import { createSupabaseServerClient, getOrCreateSpeaker, getSpeakerByUserId } from '@/lib/cfp/auth';
import { isSpeakerProfileCompleteForRequirements, getMissingProfileFields } from '@/lib/cfp/auth-constants';
import type { CfpSpeaker, CfpSubmission } from '@/lib/types/cfp';
import { getSpeakerVisibleStatus, type SpeakerVisibleStatus } from '@/lib/cfp/submissions';
import { SUBMISSION_LIMITS, getActiveSubmissions, canCreateSubmission } from '@/lib/cfp/config';
import { supabase } from '@/lib/supabase/client';
import { env } from '@/config/env';
import { CFP_MEETUP_CFP_URL, isCfpClosed } from '@/lib/cfp/closure';
import { useToast } from '@/contexts/ToastContext';

interface DashboardProps {
  speaker: CfpSpeaker;
  submissions: CfpSubmission[];
  isProfileComplete: boolean;
  missingFields: string[];
}

const StatusBadge = ({ status, cfpClosed }: { status: SpeakerVisibleStatus; cfpClosed: boolean }) => {
  const styles: Record<SpeakerVisibleStatus, string> = {
    draft: cfpClosed ? 'bg-orange-500/20 text-orange-300' : 'bg-gray-500/20 text-gray-300',
    submitted: 'bg-blue-500/20 text-blue-300',
    under_review: 'bg-purple-500/20 text-purple-300',
    accepted: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
    withdrawn: 'bg-gray-500/20 text-gray-400',
  };

  const labels: Record<SpeakerVisibleStatus, string> = {
    draft: cfpClosed ? 'Not Submitted' : 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Not Selected',
    withdrawn: 'Withdrawn',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const SubmissionCard = ({ submission, cfpClosed }: { submission: CfpSubmission; cfpClosed: boolean }) => {
  const typeLabels: Record<string, string> = {
    lightning: 'Lightning Talk',
    standard: 'Talk',
    workshop: 'Workshop',
  };

  const visibleStatus = getSpeakerVisibleStatus(submission);

  return (
    <Link href={`/cfp/submissions/${submission.id}`}>
      <div className="bg-brand-gray-dark rounded-xl p-5 hover:bg-brand-gray-dark/80 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-lg font-semibold text-white line-clamp-2">
            {submission.title}
          </h3>
          <StatusBadge status={visibleStatus} cfpClosed={cfpClosed} />
        </div>
        <div className="flex items-center gap-3 text-sm text-brand-gray-light">
          <span className="px-2 py-0.5 bg-brand-gray-darkest rounded text-xs">
            {typeLabels[submission.submission_type]}
          </span>
          <span className="capitalize">{submission.talk_level}</span>
          <span>&bull;</span>
          <span>
            {new Date(submission.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default function CfpDashboard({ speaker, submissions, isProfileComplete, missingFields }: DashboardProps) {
  const router = useRouter();
  const toast = useToast();
  const cfpClosed = isCfpClosed();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/cfp/login');
  };

  const draftSubmissions = submissions.filter((s) => s.status === 'draft');
  const submittedSubmissions = submissions.filter((s) => s.status !== 'draft');
  const activeSubmissions = getActiveSubmissions(submissions);

  useEffect(() => {
    if (router.query.cfp_closed !== '1') return;

    toast.warning(
      'CFP is closed',
      'New submissions are closed. You can still update your profile and track existing proposals.'
    );
    router.replace('/cfp/dashboard', undefined, { shallow: true });
  }, [router, toast]);

  return (
    <>
      <SEO
        title="Speaker Dashboard | CFP"
        description="Manage your CFP submissions for ZurichJS Conf 2026"
        noindex
      />

      <div className="min-h-screen bg-brand-gray-darkest">
        {/* Header */}
        <header className="border-b border-brand-gray-dark">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/cfp" className="flex items-center gap-3">
              <img
                src="/images/logo/zurichjs-square.png"
                alt="ZurichJS"
                className="h-10 w-10"
              />
              <span className="text-white font-semibold">CFP Dashboard</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/cfp/profile"
                className="text-brand-gray-light hover:text-white text-sm transition-colors"
              >
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="text-brand-gray-light hover:text-white text-sm transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <Heading level="h1" className="text-2xl font-bold text-white mb-2">
              Welcome{speaker.first_name ? `, ${speaker.first_name}` : ''}!
            </Heading>
            <p className="text-brand-gray-light">
              Manage your talk and workshop proposals for ZurichJS Conf 2026
            </p>
          </div>

          {/* Profile Incomplete Warning */}
          {!isProfileComplete && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 mb-1">
                    Profile Incomplete
                  </h3>
                  {missingFields && missingFields.length > 0 ? (
                    <>
                      <p className="text-sm text-amber-200/80 mb-2">
                        Please complete the following required profile fields:
                      </p>
                      <ul className="text-sm text-amber-200/80 list-disc list-inside mb-3">
                        {missingFields.map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-amber-200/80 mb-3">
                      Please fill in your details before submitting proposals.
                    </p>
                  )}
                  <Link href="/cfp/profile">
                    <Button variant="outline" size="sm">
                      Complete Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-brand-gray-dark rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white mb-1">{activeSubmissions.length}</div>
              <div className="text-brand-gray-light text-sm">Active Proposals</div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{submittedSubmissions.length}</div>
              <div className="text-brand-gray-light text-sm">Submitted</div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-gray-400 mb-1">{draftSubmissions.length}</div>
              <div className="text-brand-gray-light text-sm">Drafts</div>
            </div>
            <div className="bg-brand-gray-dark rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-brand-primary mb-1">{SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS}</div>
              <div className="text-brand-gray-light text-sm">Max Allowed</div>
            </div>
          </div>

          {/* New Submission CTA */}
          {!cfpClosed && canCreateSubmission(submissions) && isProfileComplete && (
            <div className="bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 rounded-xl p-6 mb-8 border border-brand-primary/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Have another talk idea?
                  </h2>
                  <p className="text-brand-gray-light text-sm">
                    You can submit up to {SUBMISSION_LIMITS.MAX_ACTIVE_SUBMISSIONS} proposals. Make the most of it!
                  </p>
                </div>
                <Link href="/cfp/submit">
                  <Button variant="primary">
                    New Proposal
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {cfpClosed && (
            <div className="bg-brand-gray-dark rounded-xl p-6 mb-8 border border-brand-gray-medium">
              <h2 className="text-lg font-semibold text-white mb-1">CFP is closed.</h2>
              <p className="text-brand-gray-light text-sm">
                But we&apos;d be happy to host you at one of our meetups. CFP for meetup is here:{' '}
                <a
                  href={CFP_MEETUP_CFP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-primary underline"
                >
                  www.zurichjs.com/cfp
                </a>
                .
              </p>
            </div>
          )}

          {/* Submissions List */}
          <div className="space-y-8">
            {/* Drafts Section */}
            {draftSubmissions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>Drafts</span>
                  <span className="text-sm text-brand-gray-medium font-normal">
                    ({draftSubmissions.length})
                  </span>
                </h2>
                <div className="flex flex-col gap-4">
                  {draftSubmissions.map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} cfpClosed={cfpClosed} />
                  ))}
                </div>
              </section>
            )}

            {/* Submitted Section */}
            {submittedSubmissions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>Submitted Proposals</span>
                  <span className="text-sm text-brand-gray-medium font-normal">
                    ({submittedSubmissions.length})
                  </span>
                </h2>
                <div className="flex flex-col gap-4">
                  {submittedSubmissions.map((submission) => (
                    <SubmissionCard key={submission.id} submission={submission} cfpClosed={cfpClosed} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {submissions.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-brand-gray-dark rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-gray-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No proposals yet</h3>
                <p className="text-brand-gray-light mb-6 max-w-md mx-auto">
                  {isProfileComplete
                    ? "Ready to share your knowledge? Start by creating your first proposal."
                    : "Complete your profile first, then you can start submitting proposals."}
                </p>
                {isProfileComplete && !cfpClosed ? (
                  <Link href="/cfp/submit">
                    <Button variant="primary">Create Your First Proposal</Button>
                  </Link>
                ) : (
                  <Link href="/cfp/profile">
                    <Button variant="primary">Complete Your Profile</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (ctx) => {
  const supabaseServer = createSupabaseServerClient(ctx);

  // Get session
  const {
    data: { session },
    error: sessionError,
  } = await supabaseServer.auth.getSession();

  if (sessionError || !session) {
    return {
      redirect: {
        destination: '/cfp/login',
        permanent: false,
      },
    };
  }

  // Get speaker profile
  let speaker = await getSpeakerByUserId(session.user.id);

  // Heal missing speaker records for authenticated users to avoid login/dashboard redirect loops.
  if (!speaker && session.user.email) {
    const createResult = await getOrCreateSpeaker(session.user.id, session.user.email);
    speaker = createResult.speaker;
  }

  if (!speaker) {
    // If we still can't resolve a speaker profile, return to login.
    return {
      redirect: {
        destination: '/cfp/login',
        permanent: false,
      },
    };
  }

  // Fetch speaker's submissions using untyped client for CFP tables
  const cfpClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: submissions, error: submissionsError } = await cfpClient
    .from('cfp_submissions')
    .select('*')
    .eq('speaker_id', speaker.id)
    .order('created_at', { ascending: false });

  if (submissionsError) {
    console.error('[CFP Dashboard] Error fetching submissions:', submissionsError);
  }

  return {
    props: {
      speaker,
      submissions: (submissions || []) as CfpSubmission[],
      isProfileComplete: isSpeakerProfileCompleteForRequirements(
        speaker,
        { requiresHeaderImage: (submissions || []).some((submission) => ['shortlisted', 'accepted'].includes(submission.status)) }
      ),
      missingFields: getMissingProfileFields(
        speaker,
        { requiresHeaderImage: (submissions || []).some((submission) => ['shortlisted', 'accepted'].includes(submission.status)) }
      ),
    },
  };
};
