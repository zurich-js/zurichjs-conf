/**
 * CFP Admin Dashboard
 * Manage submissions, reviewers, and speakers
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type CfpTab = 'submissions' | 'speakers' | 'reviewers' | 'tags';

interface CfpStats {
  total_submissions: number;
  submissions_by_status: Record<string, number>;
  total_speakers: number;
  total_reviews: number;
}

interface Speaker {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  created_at: string;
}

interface Submission {
  id: string;
  title: string;
  abstract: string;
  submission_type: string;
  talk_level: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  speaker: {
    first_name: string;
    last_name: string;
    email: string;
  };
  tags: Array<{ id: string; name: string }>;
  stats: {
    review_count: number;
    avg_overall: number | null;
  };
}

interface Reviewer {
  id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  can_see_speaker_identity: boolean;
  accepted_at: string | null;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  is_suggested: boolean;
  created_at: string;
}

// Query keys
const cfpQueryKeys = {
  stats: ['cfp', 'stats'] as const,
  submissions: (status?: string) => ['cfp', 'submissions', status] as const,
  speakers: ['cfp', 'speakers'] as const,
  reviewers: ['cfp', 'reviewers'] as const,
  tags: ['cfp', 'tags'] as const,
};

// API fetch functions
async function fetchStats(): Promise<CfpStats> {
  const res = await fetch('/api/admin/cfp/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchSubmissions(status?: string): Promise<{ submissions: Submission[] }> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  const res = await fetch(`/api/admin/cfp/submissions?${params}`);
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return res.json();
}

async function fetchSpeakers(): Promise<{ speakers: Speaker[] }> {
  const res = await fetch('/api/admin/cfp/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return res.json();
}

async function fetchReviewers(): Promise<{ reviewers: Reviewer[] }> {
  const res = await fetch('/api/admin/cfp/reviewers');
  if (!res.ok) throw new Error('Failed to fetch reviewers');
  return res.json();
}

async function fetchTags(): Promise<{ tags: Tag[] }> {
  const res = await fetch('/api/admin/cfp/tags');
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

async function updateSubmissionStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/api/admin/cfp/submissions/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

export default function CfpAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<CfpTab>('submissions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Check auth status
  const { isLoading: isAuthLoading } = useQuery({
    queryKey: ['cfp', 'auth'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cfp/stats');
      if (res.ok) {
        setIsAuthenticated(true);
        return true;
      }
      setIsAuthenticated(false);
      return false;
    },
    retry: false,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: cfpQueryKeys.stats,
    queryFn: fetchStats,
    enabled: isAuthenticated === true,
  });

  // Fetch submissions
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: cfpQueryKeys.submissions(statusFilter),
    queryFn: () => fetchSubmissions(statusFilter),
    enabled: isAuthenticated === true && activeTab === 'submissions',
  });

  // Fetch speakers
  const { data: speakersData, isLoading: isLoadingSpeakers } = useQuery({
    queryKey: cfpQueryKeys.speakers,
    queryFn: fetchSpeakers,
    enabled: isAuthenticated === true && activeTab === 'speakers',
  });

  // Fetch reviewers
  const { data: reviewersData, isLoading: isLoadingReviewers } = useQuery({
    queryKey: cfpQueryKeys.reviewers,
    queryFn: fetchReviewers,
    enabled: isAuthenticated === true && activeTab === 'reviewers',
  });

  // Fetch tags
  const { data: tagsData, isLoading: isLoadingTags } = useQuery({
    queryKey: cfpQueryKeys.tags,
    queryFn: fetchTags,
    enabled: isAuthenticated === true && activeTab === 'tags',
  });

  // Update submission status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateSubmissionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedSubmission(null);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setPassword('');
        queryClient.invalidateQueries();
      } else {
        setLoginError('Invalid password');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const submissions = submissionsData?.submissions || [];
  const speakers = speakersData?.speakers || [];
  const reviewers = reviewersData?.reviewers || [];
  const tags = tagsData?.tags || [];

  if (isAuthLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="text-lg font-medium text-black">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>CFP Admin Login | ZurichJS</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F1E271] rounded-full mb-4">
                  <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-black">CFP Admin</h2>
                <p className="mt-2 text-sm text-black">ZurichJS Conference 2026</p>
              </div>
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F1E271] focus:border-transparent transition-all"
                  />
                </div>
                {loginError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800 font-medium">{loginError}</p>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-black bg-[#F1E271] hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all shadow-sm hover:shadow-md cursor-pointer"
                >
                  Sign in
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>CFP Admin | ZurichJS</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-black">CFP Management</h1>
                  <p className="text-xs sm:text-sm text-black hidden sm:block">ZurichJS Conference 2026</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <Link
                  href="/admin/cfp-travel"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden sm:inline">Travel</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F1E271] transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 sm:mb-8">
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-black">{stats.total_submissions}</div>
                <div className="text-xs sm:text-sm text-black">Total Submissions</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.submissions_by_status?.submitted || 0}</div>
                <div className="text-xs sm:text-sm text-black">Pending Review</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.submissions_by_status?.accepted || 0}</div>
                <div className="text-xs sm:text-sm text-black">Accepted</div>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                <div className="text-2xl sm:text-3xl font-bold text-black">{stats.total_reviews}</div>
                <div className="text-xs sm:text-sm text-black">Total Reviews</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            {/* Mobile dropdown */}
            <div className="sm:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as CfpTab)}
                className="block w-full rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-3 text-sm font-medium text-black shadow-sm focus:border-[#F1E271] focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
              >
                <option value="submissions">Submissions</option>
                <option value="speakers">Speakers</option>
                <option value="reviewers">Reviewers</option>
                <option value="tags">Tags</option>
              </select>
            </div>

            {/* Desktop tabs */}
            <div className="hidden sm:block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
                {(['submissions', 'speakers', 'reviewers', 'tags'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`${
                      activeTab === tab
                        ? 'bg-[#F1E271] text-black shadow-sm'
                        : 'text-black hover:bg-gray-50'
                    } px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {/* Submissions Tab */}
              {activeTab === 'submissions' && (
                <div>
                  {/* Filters */}
                  <div className="flex gap-4 mb-6">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="waitlisted">Waitlisted</option>
                    </select>
                  </div>

                  {/* Submissions Table */}
                  {isLoadingSubmissions ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                          <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Speaker</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Reviews</th>
                            <th className="px-4 py-3">Score</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {submissions.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4">
                                <div className="font-medium text-black">{s.title}</div>
                                <div className="text-sm text-black truncate max-w-xs">{s.abstract}</div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="text-sm text-black">{s.speaker?.first_name} {s.speaker?.last_name}</div>
                                <div className="text-xs text-black">{s.speaker?.email}</div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="px-2 py-1 bg-gray-100 rounded text-xs text-black capitalize font-medium">
                                  {s.submission_type}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <StatusBadge status={s.status} />
                              </td>
                              <td className="px-4 py-4 text-sm text-black font-medium">{s.stats?.review_count || 0}</td>
                              <td className="px-4 py-4 text-sm text-black font-medium">
                                {s.stats?.avg_overall ? s.stats.avg_overall.toFixed(1) : '-'}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={() => setSelectedSubmission(s)}
                                  className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-sm rounded-lg transition-all cursor-pointer"
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          ))}
                          {submissions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-black">
                                No submissions found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Speakers Tab */}
              {activeTab === 'speakers' && (
                <div>
                  {isLoadingSpeakers ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {speakers.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 font-medium text-black">{s.first_name} {s.last_name}</td>
                              <td className="px-4 py-4 text-sm text-black">{s.email}</td>
                              <td className="px-4 py-4 text-sm text-black">{s.company || '-'}</td>
                              <td className="px-4 py-4 text-sm text-black">
                                {new Date(s.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {speakers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-black">
                                No speakers found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Reviewers Tab */}
              {activeTab === 'reviewers' && (
                <ReviewersTab
                  reviewers={reviewers}
                  isLoading={isLoadingReviewers}
                />
              )}

              {/* Tags Tab */}
              {activeTab === 'tags' && (
                <div>
                  <div className="mb-6">
                    <AddTagForm />
                  </div>
                  {isLoadingTags ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                            tag.is_suggested
                              ? 'bg-[#F1E271] text-black'
                              : 'bg-gray-100 text-black'
                          }`}
                        >
                          {tag.name}
                          {tag.is_suggested && (
                            <span className="ml-1 text-xs opacity-75">suggested</span>
                          )}
                        </span>
                      ))}
                      {tags.length === 0 && (
                        <p className="text-black">No tags found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Submission Action Modal */}
        {selectedSubmission && (
          <SubmissionModal
            submission={selectedSubmission}
            onClose={() => setSelectedSubmission(null)}
            onUpdateStatus={(status) => {
              updateStatusMutation.mutate({ id: selectedSubmission.id, status });
            }}
            isUpdating={updateStatusMutation.isPending}
          />
        )}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-black',
    submitted: 'bg-blue-100 text-blue-800',
    under_review: 'bg-purple-100 text-purple-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    waitlisted: 'bg-orange-100 text-orange-800',
    withdrawn: 'bg-gray-100 text-black',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function SubmissionModal({
  submission,
  onClose,
  onUpdateStatus,
  isUpdating,
}: {
  submission: Submission;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(submission.speaker?.email || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-black">Submission Details</h3>
                <p className="text-sm text-black mt-0.5">
                  {submission.speaker?.first_name} {submission.speaker?.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Status and Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} />
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-black font-medium capitalize">
                {submission.submission_type}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-black font-medium capitalize">
                {submission.talk_level}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyEmail}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copied ? 'Copied!' : 'Copy Email'}
              </button>
              <a
                href={`mailto:${submission.speaker?.email}?subject=Re: ${encodeURIComponent(submission.title)}`}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Speaker
              </a>
            </div>
          </div>

          {/* Submission Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Talk Information</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-black font-semibold mb-1">Title</p>
                <p className="text-base text-black font-medium">{submission.title}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Abstract</p>
                <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{submission.abstract}</p>
              </div>
              {submission.tags && submission.tags.length > 0 && (
                <div>
                  <p className="text-xs text-black font-semibold mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {submission.tags.map((tag) => (
                      <span key={tag.id} className="px-2 py-0.5 bg-[#F1E271] rounded text-xs text-black font-medium">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Speaker Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Speaker Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-black font-semibold mb-1">Name</p>
                <p className="text-sm text-black">{submission.speaker?.first_name} {submission.speaker?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Email</p>
                <p className="text-sm text-black break-all">{submission.speaker?.email}</p>
              </div>
            </div>
          </div>

          {/* Review Stats */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Review Statistics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-black font-semibold mb-1">Reviews</p>
                <p className="text-2xl font-bold text-black">{submission.stats?.review_count || 0}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Average Score</p>
                <p className="text-2xl font-bold text-black">
                  {submission.stats?.avg_overall ? submission.stats.avg_overall.toFixed(1) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Submitted</p>
                <p className="text-sm text-black">
                  {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'Draft'}
                </p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Created</p>
                <p className="text-sm text-black">
                  {new Date(submission.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Status Update Actions */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-4">Update Status</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onUpdateStatus('accepted')}
                disabled={isUpdating || submission.status === 'accepted'}
                className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center cursor-pointer ${
                  submission.status === 'accepted'
                    ? 'bg-green-100 text-green-800 border-2 border-green-500'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Accept
              </button>
              <button
                onClick={() => onUpdateStatus('waitlisted')}
                disabled={isUpdating || submission.status === 'waitlisted'}
                className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center cursor-pointer ${
                  submission.status === 'waitlisted'
                    ? 'bg-orange-100 text-orange-800 border-2 border-orange-500'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Waitlist
              </button>
              <button
                onClick={() => onUpdateStatus('rejected')}
                disabled={isUpdating || submission.status === 'rejected'}
                className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center cursor-pointer ${
                  submission.status === 'rejected'
                    ? 'bg-red-100 text-red-800 border-2 border-red-500'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject
              </button>
              <button
                onClick={() => onUpdateStatus('under_review')}
                disabled={isUpdating || submission.status === 'under_review'}
                className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center cursor-pointer ${
                  submission.status === 'under_review'
                    ? 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                    : 'border border-gray-300 hover:bg-gray-50 text-black'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Under Review
              </button>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-4">Other Actions</h4>
            <div className="flex flex-wrap gap-2">
              {submission.status !== 'draft' && (
                <button
                  onClick={() => onUpdateStatus('draft')}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Revert to Draft
                </button>
              )}
              {submission.status !== 'withdrawn' && (
                <button
                  onClick={() => onUpdateStatus('withdrawn')}
                  disabled={isUpdating}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Mark as Withdrawn
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ReviewerRole = 'full_access' | 'anonymous' | 'readonly';

const REVIEWER_ROLES: { value: ReviewerRole; label: string; description: string }[] = [
  {
    value: 'full_access',
    label: 'Full Access',
    description: 'Can see speaker names, emails, and all details. Can score and leave feedback.',
  },
  {
    value: 'anonymous',
    label: 'Anonymous Review',
    description: 'Cannot see speaker names or personal details. Can score submissions blindly.',
  },
  {
    value: 'readonly',
    label: 'Read Only',
    description: 'Can view submissions but cannot score or leave feedback. Observer access.',
  },
];

function InviteReviewerForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<ReviewerRole>('anonymous');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; role: string; can_see_speaker_identity: boolean }) => {
      const res = await fetch('/api/admin/cfp/reviewers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to invite');
      }
      return res.json();
    },
    onSuccess: () => {
      setEmail('');
      setName('');
      setRole('anonymous');
      setError('');
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Map the new roles to the API format
    const apiRole = role === 'readonly' ? 'readonly' : 'reviewer';
    const canSeeSpeakerIdentity = role === 'full_access';

    inviteMutation.mutate({
      email,
      name,
      role: apiRole,
      can_see_speaker_identity: canSeeSpeakerIdentity,
    });
  };

  const selectedRole = REVIEWER_ROLES.find(r => r.value === role);

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-sm font-bold text-black mb-4">Invite New Reviewer</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="reviewer@example.com"
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Access Level</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ReviewerRole)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none cursor-pointer"
            >
              {REVIEWER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedRole && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-black">{selectedRole.label}</p>
                <p className="text-sm text-black">{selectedRole.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 transition-all cursor-pointer"
          >
            {inviteMutation.isPending ? 'Sending Invite...' : 'Send Invite'}
          </button>
          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        </div>
      </form>
    </div>
  );
}

function AddTagForm() {
  const [name, setName] = useState('');
  const [isSuggested, setIsSuggested] = useState(true);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const addTagMutation = useMutation({
    mutationFn: async (data: { name: string; is_suggested: boolean }) => {
      const res = await fetch('/api/admin/cfp/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create');
      }
      return res.json();
    },
    onSuccess: () => {
      setName('');
      setError('');
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.tags });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    addTagMutation.mutate({ name, is_suggested: isSuggested });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-sm font-medium text-black mb-1">Tag Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Tag"
          required
          className="px-3 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isSuggested}
          onChange={(e) => setIsSuggested(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-black font-medium">Suggested Tag</span>
      </label>
      <button
        type="submit"
        disabled={addTagMutation.isPending}
        className="px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {addTagMutation.isPending ? 'Adding...' : 'Add Tag'}
      </button>
      {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
    </form>
  );
}

function ReviewersTab({ reviewers, isLoading }: { reviewers: Reviewer[]; isLoading: boolean }) {
  const [selectedReviewer, setSelectedReviewer] = useState<Reviewer | null>(null);
  const queryClient = useQueryClient();

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}/resend`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to resend');
      }
      return res.json();
    },
    onSuccess: () => {
      alert('Invitation resent successfully');
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  // Update reviewer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { role?: string; can_see_speaker_identity?: boolean } }) => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
      setSelectedReviewer(null);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/reviewers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.reviewers });
      setSelectedReviewer(null);
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-black';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <InviteReviewerForm />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Access Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invited</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reviewers.filter(r => r.is_active).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-black">{r.name || '-'}</td>
                  <td className="px-4 py-4 text-sm text-black">{r.email}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                      {r.role === 'super_admin' ? 'Super Admin' : r.role === 'reviewer' ? 'Reviewer' : 'Read Only'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {r.accepted_at ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-black">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {!r.accepted_at && (
                        <button
                          onClick={() => resendMutation.mutate(r.id)}
                          disabled={resendMutation.isPending}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer disabled:opacity-50"
                          title="Resend Invitation"
                        >
                          Resend
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedReviewer(r)}
                        className="px-2 py-1 text-xs font-medium text-black bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                        title="Manage Reviewer"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reviewers.filter(r => r.is_active).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-black">
                    No reviewers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Reviewer Management Modal */}
      {selectedReviewer && (
        <ReviewerModal
          reviewer={selectedReviewer}
          onClose={() => setSelectedReviewer(null)}
          onUpdate={(updates) => updateMutation.mutate({ id: selectedReviewer.id, updates })}
          onRevoke={() => {
            if (confirm(`Are you sure you want to revoke access for ${selectedReviewer.email}?`)) {
              revokeMutation.mutate(selectedReviewer.id);
            }
          }}
          isUpdating={updateMutation.isPending}
          isRevoking={revokeMutation.isPending}
        />
      )}
    </div>
  );
}

function ReviewerModal({
  reviewer,
  onClose,
  onUpdate,
  onRevoke,
  isUpdating,
  isRevoking,
}: {
  reviewer: Reviewer;
  onClose: () => void;
  onUpdate: (updates: { role?: string; can_see_speaker_identity?: boolean }) => void;
  onRevoke: () => void;
  isUpdating: boolean;
  isRevoking: boolean;
}) {
  const [selectedRole, setSelectedRole] = useState<ReviewerRole>(() => {
    // Map from API role to UI role
    if (reviewer.role === 'readonly') return 'readonly';
    // For 'reviewer' role, check can_see_speaker_identity
    if (reviewer.can_see_speaker_identity) return 'full_access';
    return 'anonymous';
  });

  const handleUpdateRole = () => {
    const apiRole = selectedRole === 'readonly' ? 'readonly' : 'reviewer';
    const canSeeSpeakerIdentity = selectedRole === 'full_access';
    onUpdate({ role: apiRole, can_see_speaker_identity: canSeeSpeakerIdentity });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#F1E271] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">Manage Reviewer</h3>
                <p className="text-sm text-black">{reviewer.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Reviewer Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-black font-semibold mb-1">Name</p>
                <p className="text-sm text-black">{reviewer.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Status</p>
                <p className="text-sm">
                  {reviewer.accepted_at ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Pending Invite</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Current Role</p>
                <p className="text-sm text-black capitalize">{reviewer.role.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-black font-semibold mb-1">Invited</p>
                <p className="text-sm text-black">{new Date(reviewer.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Change Access Level */}
          <div>
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Change Access Level</h4>
            <div className="space-y-3">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as ReviewerRole)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none cursor-pointer"
              >
                {REVIEWER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="text-sm text-black">
                  {REVIEWER_ROLES.find(r => r.value === selectedRole)?.description}
                </p>
              </div>
              <button
                onClick={handleUpdateRole}
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Access Level'}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-3">Danger Zone</h4>
            <button
              onClick={onRevoke}
              disabled={isRevoking}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Access'}
            </button>
            <p className="text-xs text-black mt-2">
              This will remove the reviewer&apos;s access to the CFP system. They will no longer be able to review submissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
