/**
 * CFP Admin Dashboard
 * Manage submissions, reviewers, and speakers
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';

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
  job_title: string | null;
  company: string | null;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
  bluesky_handle: string | null;
  mastodon_handle: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
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
    job_title?: string | null;
    company?: string | null;
    bio?: string | null;
    linkedin_url?: string | null;
    github_url?: string | null;
    twitter_handle?: string | null;
    bluesky_handle?: string | null;
    mastodon_handle?: string | null;
    profile_image_url?: string | null;
    tshirt_size?: string | null;
    company_interested_in_sponsoring?: boolean | null;
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

interface ReviewWithReviewer {
  id: string;
  submission_id: string;
  reviewer_id: string;
  score_overall: number | null;
  score_relevance: number | null;
  score_technical_depth: number | null;
  score_clarity: number | null;
  score_diversity: number | null;
  private_notes: string | null;
  feedback_to_speaker: string | null;
  created_at: string;
  updated_at: string;
  reviewer: {
    id: string;
    name: string | null;
    email: string;
  };
}

// Query keys
const cfpQueryKeys = {
  stats: ['cfp', 'stats'] as const,
  submissions: (status?: string) => ['cfp', 'submissions', status] as const,
  speakers: ['cfp', 'speakers'] as const,
  reviewers: ['cfp', 'reviewers'] as const,
  tags: ['cfp', 'tags'] as const,
};

// Status action descriptions for admin actions
const STATUS_ACTIONS: Record<string, { action: string; description: string }> = {
  shortlisted: { action: 'Shortlist', description: 'Mark as top candidate for final selection round.' },
  accepted: { action: 'Accept', description: 'Confirm this talk for the conference. Speaker will be notified.' },
  waitlisted: { action: 'Waitlist', description: 'Keep as backup. May be accepted if space opens up.' },
  rejected: { action: 'Reject', description: 'Decline this submission. Speaker will be notified of decision.' },
  under_review: { action: 'Mark for Review', description: 'Move back to review queue for committee evaluation.' },
  draft: { action: 'Revert to Draft', description: 'Allow speaker to continue editing before resubmitting.' },
  withdrawn: { action: 'Mark as Withdrawn', description: 'Speaker has withdrawn their submission.' },
};

// Confirmation Modal Component
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  confirmStyle = 'danger',
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmStyle?: 'danger' | 'warning';
  isLoading?: boolean;
}) {
  // Close on Escape key
  useEscapeKey(onClose, isOpen && !isLoading);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            confirmStyle === 'danger' ? 'bg-red-100' : 'bg-orange-100'
          }`}>
            <svg className={`w-5 h-5 ${confirmStyle === 'danger' ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-black mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 ${
              confirmStyle === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionStatus, setBulkActionStatus] = useState<string>('');
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();

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

  // Delete submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/submissions/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete submission');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
      setSelectedSubmission(null);
    },
  });

  // Bulk status update mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const promises = ids.map((id) =>
        fetch(`/api/admin/cfp/submissions/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} submission(s)`);
      }
    },
    onSuccess: (_data, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: ['cfp', 'submissions'] });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedIds(new Set());
      setBulkActionStatus('');
      toast.success('Bulk Update Complete', `${ids.length} submission(s) updated to ${status}`);
    },
    onError: (error: Error) => {
      toast.error('Bulk Update Failed', error.message);
    },
  });

  // Toggle selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map((s) => s.id)));
    }
  };

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
                  {/* Filters and Bulk Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6" role="toolbar" aria-label="Submission filters and bulk actions">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                      aria-label="Filter by status"
                    >
                      <option value="all">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="waitlisted">Waitlisted</option>
                    </select>

                    {/* Bulk Actions Bar */}
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-3 ml-auto bg-gray-100 rounded-lg px-4 py-2" role="group" aria-label="Bulk actions">
                        <span className="text-sm font-medium text-black" aria-live="polite">
                          {selectedIds.size} selected
                        </span>
                        <div className="h-4 w-px bg-gray-300" aria-hidden="true" />
                        <select
                          value={bulkActionStatus}
                          onChange={(e) => setBulkActionStatus(e.target.value)}
                          className="text-sm px-2 py-1 rounded border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                          aria-label="Select new status for selected submissions"
                        >
                          <option value="">Change status to...</option>
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="accepted">Accepted</option>
                          <option value="waitlisted">Waitlisted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <button
                          onClick={() => {
                            if (bulkActionStatus) {
                              bulkUpdateStatusMutation.mutate({
                                ids: Array.from(selectedIds),
                                status: bulkActionStatus,
                              });
                            }
                          }}
                          disabled={!bulkActionStatus || bulkUpdateStatusMutation.isPending}
                          className="px-3 py-1 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          aria-label={bulkUpdateStatusMutation.isPending ? 'Updating status' : 'Apply bulk status change'}
                        >
                          {bulkUpdateStatusMutation.isPending ? 'Updating...' : 'Apply'}
                        </button>
                        <button
                          onClick={() => setSelectedIds(new Set())}
                          className="text-sm text-gray-600 hover:text-black cursor-pointer"
                          aria-label="Clear selection"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submissions Table/Cards */}
                  {isLoadingSubmissions ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-4">
                        {/* Mobile Select All */}
                        {submissions.length > 0 && (
                          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                            <input
                              type="checkbox"
                              checked={selectedIds.size === submissions.length && submissions.length > 0}
                              onChange={toggleSelectAll}
                              className="w-4 h-4 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271] cursor-pointer"
                            />
                            <span className="text-sm text-gray-600">Select all</span>
                          </div>
                        )}
                        {submissions.map((s) => (
                          <div key={s.id} className={`bg-gray-50 rounded-xl p-4 border transition-all duration-200 ${selectedIds.has(s.id) ? 'border-[#F1E271] ring-1 ring-[#F1E271] scale-[1.01]' : 'border-gray-200'}`}>
                            <div className="flex items-start gap-3 mb-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(s.id)}
                                onChange={() => toggleSelection(s.id)}
                                className="w-4 h-4 mt-1 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271] cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-semibold text-black text-sm line-clamp-2">{s.title}</h3>
                                  <StatusBadge status={s.status} />
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {s.speaker?.first_name} {s.speaker?.last_name}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3 ml-7">{s.abstract}</p>
                            <div className="flex items-center justify-between ml-7">
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="px-2 py-0.5 bg-gray-200 rounded capitalize">{s.submission_type}</span>
                                <span>{s.stats?.review_count || 0} reviews</span>
                                {s.stats?.avg_overall && (
                                  <span>Avg: {s.stats.avg_overall.toFixed(1)}</span>
                                )}
                              </div>
                              <button
                                onClick={() => setSelectedSubmission(s)}
                                className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg transition-all cursor-pointer"
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ))}
                        {submissions.length === 0 && (
                          <div className="text-center py-8 text-gray-500">No submissions found</div>
                        )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full" role="grid" aria-label="Submissions list">
                          <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                            <tr>
                              <th className="px-4 py-3 w-10" scope="col">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.size === submissions.length && submissions.length > 0}
                                  onChange={toggleSelectAll}
                                  className="w-4 h-4 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271] cursor-pointer"
                                  aria-label={selectedIds.size === submissions.length ? 'Deselect all submissions' : 'Select all submissions'}
                                />
                              </th>
                              <th className="px-4 py-3" scope="col">Title</th>
                              <th className="px-4 py-3" scope="col">Speaker</th>
                              <th className="px-4 py-3" scope="col">Type</th>
                              <th className="px-4 py-3" scope="col">Status</th>
                              <th className="px-4 py-3" scope="col">Reviews</th>
                              <th className="px-4 py-3" scope="col">Score</th>
                              <th className="px-4 py-3" scope="col">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {submissions.map((s) => (
                              <tr key={s.id} className={`hover:bg-gray-50 transition-colors duration-150 ${selectedIds.has(s.id) ? 'bg-yellow-50' : ''}`}>
                                <td className="px-4 py-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(s.id)}
                                    onChange={() => toggleSelection(s.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271] cursor-pointer"
                                    aria-label={`Select submission: ${s.title}`}
                                  />
                                </td>
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
                                    aria-label={`Manage submission: ${s.title}`}
                                  >
                                    Manage
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {submissions.length === 0 && (
                              <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-black">
                                  No submissions found
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Speakers Tab */}
              {activeTab === 'speakers' && (
                <SpeakersTab
                  speakers={speakers}
                  isLoading={isLoadingSpeakers}
                />
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
            onDelete={() => {
              deleteSubmissionMutation.mutate(selectedSubmission.id);
            }}
            isDeleting={deleteSubmissionMutation.isPending}
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
    shortlisted: 'bg-indigo-100 text-indigo-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    waitlisted: 'bg-orange-100 text-orange-800',
    withdrawn: 'bg-gray-100 text-black',
  };

  const labels: Record<string, string> = {
    under_review: 'In Review',
    shortlisted: 'Shortlisted',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-all duration-200 ${styles[status] || styles.draft}`}
      role="status"
    >
      {labels[status] || status.replace('_', ' ')}
    </span>
  );
}

function SubmissionModal({
  submission,
  onClose,
  onUpdateStatus,
  isUpdating,
  onDelete,
  isDeleting,
}: {
  submission: Submission;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
  isUpdating: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch detailed reviews when modal opens
  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/admin/cfp/submissions/${submission.id}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setIsLoadingReviews(false);
      }
    }
    fetchReviews();
  }, [submission.id]);

  // Calculate aggregate scores
  const aggregateScores = React.useMemo(() => {
    if (reviews.length === 0) return null;

    const calcAvg = (getter: (r: ReviewWithReviewer) => number | null) => {
      const values = reviews.map(getter).filter((v): v is number => v !== null);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    return {
      overall: calcAvg((r) => r.score_overall),
      relevance: calcAvg((r) => r.score_relevance),
      technical_depth: calcAvg((r) => r.score_technical_depth),
      clarity: calcAvg((r) => r.score_clarity),
      diversity: calcAvg((r) => r.score_diversity),
    };
  }, [reviews]);

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
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Profile Image */}
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                {submission.speaker?.profile_image_url ? (
                  <img
                    src={submission.speaker.profile_image_url}
                    alt={`${submission.speaker.first_name} ${submission.speaker.last_name}`}
                    className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-[#F1E271] flex items-center justify-center border-2 border-gray-200">
                    <span className="text-3xl font-bold text-black">
                      {submission.speaker?.first_name?.[0]}{submission.speaker?.last_name?.[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-3">
                {/* Name & Title */}
                <div>
                  <p className="text-lg font-bold text-black">
                    {submission.speaker?.first_name} {submission.speaker?.last_name}
                  </p>
                  {(submission.speaker?.job_title || submission.speaker?.company) && (
                    <p className="text-sm text-gray-600">
                      {submission.speaker?.job_title}
                      {submission.speaker?.job_title && submission.speaker?.company && ' at '}
                      {submission.speaker?.company}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Email</p>
                  <a href={`mailto:${submission.speaker?.email}`} className="text-sm text-blue-600 hover:underline break-all">
                    {submission.speaker?.email}
                  </a>
                </div>

                {/* Bio */}
                {submission.speaker?.bio && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Bio</p>
                    <p className="text-sm text-black whitespace-pre-wrap">{submission.speaker.bio}</p>
                  </div>
                )}

                {/* Social Links */}
                {(submission.speaker?.linkedin_url || submission.speaker?.github_url || submission.speaker?.twitter_handle || submission.speaker?.bluesky_handle || submission.speaker?.mastodon_handle) && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-2">Social Links</p>
                    <div className="flex flex-wrap gap-2">
                      {submission.speaker?.linkedin_url && (
                        <a
                          href={submission.speaker.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                          LinkedIn
                        </a>
                      )}
                      {submission.speaker?.github_url && (
                        <a
                          href={submission.speaker.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-900 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                          GitHub
                        </a>
                      )}
                      {submission.speaker?.twitter_handle && (
                        <a
                          href={`https://twitter.com/${submission.speaker.twitter_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs hover:bg-sky-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          @{submission.speaker.twitter_handle}
                        </a>
                      )}
                      {submission.speaker?.bluesky_handle && (
                        <a
                          href={`https://bsky.app/profile/${submission.speaker.bluesky_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z"/></svg>
                          Bluesky
                        </a>
                      )}
                      {submission.speaker?.mastodon_handle && (
                        <a
                          href={submission.speaker.mastodon_handle}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/></svg>
                          Mastodon
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* T-Shirt Size & Sponsorship Interest */}
                <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-200">
                  {submission.speaker?.tshirt_size && (
                    <div>
                      <p className="text-xs text-gray-500">T-Shirt Size</p>
                      <p className="text-sm font-medium text-black">{submission.speaker.tshirt_size}</p>
                    </div>
                  )}
                  {submission.speaker?.company_interested_in_sponsoring && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Company interested in sponsoring
                    </div>
                  )}
                </div>
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

          {/* Committee Reviews */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Committee Reviews</h4>

            {isLoadingReviews ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {/* Aggregate Scores */}
                {aggregateScores && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200 mb-4">
                    <p className="text-xs text-black font-semibold mb-2">Aggregate Scores ({reviews.length} reviews)</p>
                    {/* Mobile: Overall prominent, others in 2x2 grid */}
                    <div className="sm:hidden">
                      <div className="bg-gray-100 rounded-lg p-3 mb-2 text-center">
                        <p className="text-xs text-gray-500">Overall</p>
                        <p className="text-2xl font-bold text-black">
                          {aggregateScores.overall?.toFixed(1) || '-'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-[10px] text-gray-500">Relevance</p>
                          <p className="text-base font-bold text-black">{aggregateScores.relevance?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-[10px] text-gray-500">Depth</p>
                          <p className="text-base font-bold text-black">{aggregateScores.technical_depth?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-[10px] text-gray-500">Clarity</p>
                          <p className="text-base font-bold text-black">{aggregateScores.clarity?.toFixed(1) || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-[10px] text-gray-500">Diversity</p>
                          <p className="text-base font-bold text-black">{aggregateScores.diversity?.toFixed(1) || '-'}</p>
                        </div>
                      </div>
                    </div>
                    {/* Desktop: 5 columns */}
                    <div className="hidden sm:grid grid-cols-5 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Overall</p>
                        <p className="text-lg font-bold text-black">
                          {aggregateScores.overall?.toFixed(1) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Relevance</p>
                        <p className="text-lg font-bold text-black">
                          {aggregateScores.relevance?.toFixed(1) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Depth</p>
                        <p className="text-lg font-bold text-black">
                          {aggregateScores.technical_depth?.toFixed(1) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Clarity</p>
                        <p className="text-lg font-bold text-black">
                          {aggregateScores.clarity?.toFixed(1) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Diversity</p>
                        <p className="text-lg font-bold text-black">
                          {aggregateScores.diversity?.toFixed(1) || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Reviews */}
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                    {/* Reviewer Header */}
                    <div className="flex items-start sm:items-center justify-between mb-3 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-black truncate">
                          {review.reviewer.name || review.reviewer.email}
                        </p>
                        {review.reviewer.name && (
                          <p className="text-xs text-gray-500 truncate">{review.reviewer.email}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Mobile Scores: Overall prominent + 2x2 grid */}
                    <div className="sm:hidden mb-3">
                      <div className={`bg-gray-100 rounded-lg p-2 mb-2 text-center ${
                        review.score_overall === null ? '' :
                        review.score_overall >= 4 ? 'bg-green-50 border border-green-200' :
                        review.score_overall >= 3 ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                      }`}>
                        <p className="text-[10px] text-gray-500 uppercase">Overall</p>
                        <p className={`text-xl font-bold ${
                          review.score_overall === null ? 'text-gray-400' :
                          review.score_overall >= 4 ? 'text-green-600' :
                          review.score_overall >= 3 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {review.score_overall !== null ? review.score_overall : '-'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-center">
                        {[
                          { label: 'Relevance', value: review.score_relevance },
                          { label: 'Depth', value: review.score_technical_depth },
                          { label: 'Clarity', value: review.score_clarity },
                          { label: 'Diversity', value: review.score_diversity },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-50 rounded p-1.5">
                            <p className="text-[9px] text-gray-500 uppercase">{label}</p>
                            <p className={`text-sm font-bold ${
                              value === null ? 'text-gray-400' :
                              value >= 4 ? 'text-green-600' :
                              value >= 3 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {value !== null ? value : '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Desktop Scores Grid */}
                    <div className="hidden sm:grid grid-cols-5 gap-2 text-center mb-3">
                      {[
                        { label: 'Overall', value: review.score_overall },
                        { label: 'Relevance', value: review.score_relevance },
                        { label: 'Depth', value: review.score_technical_depth },
                        { label: 'Clarity', value: review.score_clarity },
                        { label: 'Diversity', value: review.score_diversity },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-50 rounded p-2">
                          <p className="text-[10px] text-gray-500 uppercase">{label}</p>
                          <p className={`text-base font-bold ${
                            value === null ? 'text-gray-400' :
                            value >= 4 ? 'text-green-600' :
                            value >= 3 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {value !== null ? value : '-'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    {review.private_notes && (
                      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 mb-2">
                        <p className="text-xs font-semibold text-yellow-800 mb-1">Private Notes (Committee Only)</p>
                        <p className="text-sm text-yellow-900 whitespace-pre-wrap">{review.private_notes}</p>
                      </div>
                    )}

                    {review.feedback_to_speaker && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Feedback to Speaker</p>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{review.feedback_to_speaker}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status Update Actions */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-4">Update Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="flex flex-col">
                <button
                  onClick={() => onUpdateStatus('shortlisted')}
                  disabled={isUpdating || submission.status === 'shortlisted'}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center cursor-pointer ${
                    submission.status === 'shortlisted'
                      ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-500'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Shortlist
                </button>
                <p className="text-xs text-gray-500 mt-1.5 text-center">{STATUS_ACTIONS.shortlisted.description}</p>
              </div>
              <div className="flex flex-col">
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
                <p className="text-xs text-gray-500 mt-1.5 text-center">{STATUS_ACTIONS.accepted.description}</p>
              </div>
              <div className="flex flex-col">
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
                <p className="text-xs text-gray-500 mt-1.5 text-center">{STATUS_ACTIONS.waitlisted.description}</p>
              </div>
              <div className="flex flex-col">
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
                <p className="text-xs text-gray-500 mt-1.5 text-center">{STATUS_ACTIONS.rejected.description}</p>
              </div>
              <div className="flex flex-col">
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
                  In Review
                </button>
                <p className="text-xs text-gray-500 mt-1.5 text-center">{STATUS_ACTIONS.under_review.description}</p>
              </div>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-4">Other Actions</h4>
            <div className="flex flex-wrap gap-4">
              {submission.status !== 'draft' && (
                <div className="flex flex-col">
                  <button
                    onClick={() => onUpdateStatus('draft')}
                    disabled={isUpdating}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Revert to Draft
                  </button>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{STATUS_ACTIONS.draft.description}</p>
                </div>
              )}
              {submission.status !== 'withdrawn' && (
                <div className="flex flex-col">
                  <button
                    onClick={() => onUpdateStatus('withdrawn')}
                    disabled={isUpdating}
                    className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Mark as Withdrawn
                  </button>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">{STATUS_ACTIONS.withdrawn.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-red-200 pt-6 mt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-4">Danger Zone</h4>
            <div className="flex flex-col">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Submission
              </button>
              <p className="text-xs text-red-500 mt-1 max-w-[300px]">Permanently delete this submission and all associated reviews. This action cannot be undone.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        title="Delete Submission"
        message={`Are you sure you want to delete "${submission.title}"? This will also delete all associated reviews. This action cannot be undone.`}
        confirmText="Delete Submission"
        confirmStyle="danger"
        isLoading={isDeleting}
      />
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
  const toast = useToast();

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
      toast.success('Invitation Sent', 'The reviewer has been sent a new invitation email.');
    },
    onError: (err: Error) => {
      toast.error('Failed to Resend', err.message);
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
      toast.success('Reviewer Updated', 'Access level has been updated successfully.');
    },
    onError: (err: Error) => {
      toast.error('Update Failed', err.message);
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
      toast.success('Access Revoked', 'The reviewer no longer has access to the CFP system.');
    },
    onError: (err: Error) => {
      toast.error('Revoke Failed', err.message);
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
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {reviewers.filter(r => r.is_active).map((r) => (
              <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black text-sm">{r.name || 'No name'}</div>
                    <div className="text-xs text-gray-600 truncate">{r.email}</div>
                  </div>
                  {r.accepted_at ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium shrink-0">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium shrink-0">Pending</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeStyle(r.role)}`}>
                    {r.role === 'super_admin' ? 'Super Admin' : r.role === 'reviewer' ? 'Reviewer' : 'Read Only'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Invited {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!r.accepted_at && (
                    <button
                      onClick={() => resendMutation.mutate(r.id)}
                      disabled={resendMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Resend
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedReviewer(r)}
                    className="px-3 py-1.5 text-xs font-medium text-black bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
            {reviewers.filter(r => r.is_active).length === 0 && (
              <div className="text-center py-8 text-gray-500">No reviewers found</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
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
        </>
      )}

      {/* Reviewer Management Modal */}
      {selectedReviewer && (
        <ReviewerModal
          reviewer={selectedReviewer}
          onClose={() => setSelectedReviewer(null)}
          onUpdate={(updates) => updateMutation.mutate({ id: selectedReviewer.id, updates })}
          onRevoke={() => {
            revokeMutation.mutate(selectedReviewer.id);
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
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

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
              onClick={() => setShowRevokeConfirm(true)}
              disabled={isRevoking}
              className="w-full px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              {isRevoking ? 'Revoking...' : 'Revoke Access'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              This will remove the reviewer&apos;s access to the CFP system. They will no longer be able to review submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={() => {
          onRevoke();
          setShowRevokeConfirm(false);
        }}
        title="Revoke Reviewer Access"
        message={`Are you sure you want to revoke access for ${reviewer.name || reviewer.email}? They will no longer be able to review submissions.`}
        confirmText="Revoke Access"
        confirmStyle="danger"
        isLoading={isRevoking}
      />
    </div>
  );
}

// ============================================
// SPEAKERS TAB
// ============================================

function SpeakersTab({ speakers, isLoading }: { speakers: Speaker[]; isLoading: boolean }) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const filteredSpeakers = speakers.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.company?.toLowerCase().includes(query)
    );
  });

  const handleSpeakerUpdated = () => {
    queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
    setSelectedSpeaker(null);
  };

  // Delete speaker mutation
  const deleteSpeakerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/cfp/speakers/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete speaker');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.speakers });
      queryClient.invalidateQueries({ queryKey: cfpQueryKeys.stats });
      setSelectedSpeaker(null);
      setDeleteError(null);
    },
    onError: (error: Error) => {
      setDeleteError(error.message);
    },
  });

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search speakers by name, email, or company..."
          className="w-full max-w-md px-4 py-2 rounded-lg border border-gray-300 text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredSpeakers.map((s) => (
              <div key={s.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3 mb-3">
                  {s.profile_image_url ? (
                    <img
                      src={s.profile_image_url}
                      alt={`${s.first_name} ${s.last_name}`}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-black text-sm">
                      {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}` : 'No name'}
                    </div>
                    {s.job_title && (
                      <div className="text-xs text-gray-500">{s.job_title}</div>
                    )}
                    <div className="text-xs text-gray-600 truncate mt-0.5">{s.email}</div>
                  </div>
                  {s.bio ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium shrink-0">Complete</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium shrink-0">Incomplete</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {s.company && <span className="mr-2">{s.company}</span>}
                    <span>Joined {new Date(s.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => setSelectedSpeaker(s)}
                    className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-xs rounded-lg transition-all cursor-pointer"
                  >
                    View / Edit
                  </button>
                </div>
              </div>
            ))}
            {filteredSpeakers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No speakers match your search' : 'No speakers found'}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-black font-semibold">
                <tr>
                  <th className="px-4 py-3">Speaker</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSpeakers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {s.profile_image_url ? (
                          <img
                            src={s.profile_image_url}
                            alt={`${s.first_name} ${s.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-black">
                            {s.first_name || s.last_name ? `${s.first_name} ${s.last_name}` : 'No name'}
                          </div>
                          {s.job_title && (
                            <div className="text-xs text-gray-500">{s.job_title}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-black">{s.email}</td>
                    <td className="px-4 py-4 text-sm text-black">{s.company || '-'}</td>
                    <td className="px-4 py-4">
                      {s.bio ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Complete</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">Incomplete</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-black">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedSpeaker(s)}
                        className="px-3 py-1.5 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium text-sm rounded-lg transition-all cursor-pointer"
                      >
                        View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSpeakers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-black">
                      {searchQuery ? 'No speakers match your search' : 'No speakers found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete Error Alert */}
      {deleteError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError(null)}
              className="text-red-600 hover:text-red-800 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Speaker Modal */}
      {selectedSpeaker && (
        <SpeakerModal
          speaker={selectedSpeaker}
          onClose={() => setSelectedSpeaker(null)}
          onUpdated={handleSpeakerUpdated}
          onDeleted={() => {
            deleteSpeakerMutation.mutate(selectedSpeaker.id);
          }}
          isDeleting={deleteSpeakerMutation.isPending}
        />
      )}
    </div>
  );
}

function SpeakerModal({
  speaker,
  onClose,
  onUpdated,
  onDeleted,
  isDeleting,
}: {
  speaker: Speaker;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  isDeleting: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: speaker.first_name || '',
    last_name: speaker.last_name || '',
    job_title: speaker.job_title || '',
    company: speaker.company || '',
    bio: speaker.bio || '',
    linkedin_url: speaker.linkedin_url || '',
    github_url: speaker.github_url || '',
    twitter_handle: speaker.twitter_handle || '',
    bluesky_handle: speaker.bluesky_handle || '',
    mastodon_handle: speaker.mastodon_handle || '',
  });
  const [profileImageUrl, setProfileImageUrl] = useState(speaker.profile_image_url);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await fetch(`/api/admin/cfp/speakers/${speaker.id}/image`, {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setProfileImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/cfp/speakers/${speaker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profile_image_url: profileImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update speaker');
      }

      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update speaker');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(speaker.email);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={`${speaker.first_name} ${speaker.last_name}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-[#F1E271] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-black">
                  {speaker.first_name || speaker.last_name ? `${speaker.first_name} ${speaker.last_name}` : 'Speaker Profile'}
                </h3>
                <p className="text-sm text-black">{speaker.email}</p>
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
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all cursor-pointer"
              >
                Copy Email
              </button>
              <a
                href={`mailto:${speaker.email}`}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-all"
              >
                Email Speaker
              </a>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                isEditing
                  ? 'bg-gray-200 text-black'
                  : 'bg-[#F1E271] hover:bg-[#e8d95e] text-black'
              }`}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {/* Profile Image Section */}
          {isEditing && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Profile Photo</h4>
              <div className="flex items-center gap-4">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? 'Uploading...' : 'Upload New Photo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP or GIF. Max 5MB.</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Basic Information</h4>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => handleChange('job_title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Name</p>
                  <p className="text-sm text-black">{speaker.first_name} {speaker.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Email</p>
                  <p className="text-sm text-black">{speaker.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Job Title</p>
                  <p className="text-sm text-black">{speaker.job_title || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Company</p>
                  <p className="text-sm text-black">{speaker.company || '-'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Biography</h4>
            {isEditing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                placeholder="Speaker biography..."
              />
            ) : (
              <p className="text-sm text-black whitespace-pre-wrap">
                {speaker.bio || 'No biography provided'}
              </p>
            )}
          </div>

          {/* Social Links */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Social Links</h4>
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">GitHub URL</label>
                  <input
                    type="url"
                    value={formData.github_url}
                    onChange={(e) => handleChange('github_url', e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Twitter/X Handle</label>
                  <input
                    type="text"
                    value={formData.twitter_handle}
                    onChange={(e) => handleChange('twitter_handle', e.target.value)}
                    placeholder="@username"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Bluesky Handle</label>
                  <input
                    type="text"
                    value={formData.bluesky_handle}
                    onChange={(e) => handleChange('bluesky_handle', e.target.value)}
                    placeholder="@user.bsky.social"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Mastodon Handle</label>
                  <input
                    type="text"
                    value={formData.mastodon_handle}
                    onChange={(e) => handleChange('mastodon_handle', e.target.value)}
                    placeholder="@user@instance.social"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-black focus:ring-2 focus:ring-[#F1E271] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {speaker.linkedin_url && (
                  <a href={speaker.linkedin_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors">
                    LinkedIn
                  </a>
                )}
                {speaker.github_url && (
                  <a href={speaker.github_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
                    GitHub
                  </a>
                )}
                {speaker.twitter_handle && (
                  <a href={`https://twitter.com/${speaker.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-sky-100 text-sky-800 rounded-lg text-sm font-medium hover:bg-sky-200 transition-colors">
                    {speaker.twitter_handle}
                  </a>
                )}
                {speaker.bluesky_handle && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                    {speaker.bluesky_handle}
                  </span>
                )}
                {speaker.mastodon_handle && (
                  <span className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium">
                    {speaker.mastodon_handle}
                  </span>
                )}
                {!speaker.linkedin_url && !speaker.github_url && !speaker.twitter_handle && !speaker.bluesky_handle && !speaker.mastodon_handle && (
                  <p className="text-sm text-gray-500">No social links provided</p>
                )}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Account Info</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Joined</p>
                <p className="text-sm text-black">{new Date(speaker.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Last Updated</p>
                <p className="text-sm text-black">{new Date(speaker.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-[#F1E271] hover:bg-[#e8d95e] text-black font-medium rounded-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Danger Zone */}
          <div className="border-t border-red-200 pt-6 mt-6">
            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wide mb-4">Danger Zone</h4>
            <div className="flex flex-col">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-50 border border-red-300 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Speaker
              </button>
              <p className="text-xs text-red-500 mt-1 max-w-[300px]">Permanently delete this speaker account. Only possible if they have no submissions.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDeleted();
          setShowDeleteConfirm(false);
        }}
        title="Delete Speaker"
        message={`Are you sure you want to delete speaker "${speaker.first_name} ${speaker.last_name}" (${speaker.email})? This action cannot be undone.`}
        confirmText="Delete Speaker"
        confirmStyle="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
