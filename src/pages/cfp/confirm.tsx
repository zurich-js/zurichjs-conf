/**
 * Speaker Attendance Confirmation Page
 * Allows accepted speakers to confirm or decline their attendance
 * Uses token-based authentication from the acceptance email
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Check, X, Calendar, MapPin, Clock, Loader2, AlertTriangle, PartyPopper } from 'lucide-react';
import { DECLINE_REASONS, type DeclineReason } from '@/lib/cfp/config';

interface AttendanceData {
  speaker_name: string;
  talk_title: string;
  submission_type: string;
  status: 'pending' | 'confirmed' | 'declined';
  token_valid: boolean;
  token_expired: boolean;
  already_responded: boolean;
  responded_at: string | null;
}

export default function ConfirmAttendancePage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<'confirmed' | 'declined' | null>(null);

  // Decline form state
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState<DeclineReason | ''>('');
  const [declineNotes, setDeclineNotes] = useState('');

  // Fetch attendance data on load
  useEffect(() => {
    async function fetchAttendance() {
      if (!token || typeof token !== 'string') {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/cfp/attendance?token=${token}`);
        const result = await res.json();

        if (!res.ok) {
          setError(result.error || 'Failed to load attendance data');
        } else {
          setData(result);
        }
      } catch {
        setError('Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    }

    if (router.isReady) {
      fetchAttendance();
    }
  }, [router.isReady, token]);

  const handleConfirm = async () => {
    if (!token) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/cfp/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          response: 'confirm',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Failed to confirm attendance');
      } else {
        setSuccess('confirmed');
      }
    } catch {
      setError('Failed to confirm attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token || !declineReason) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/cfp/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          response: 'decline',
          decline_reason: declineReason,
          decline_notes: declineNotes || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Failed to submit response');
      } else {
        setSuccess('declined');
      }
    } catch {
      setError('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  // No token provided
  if (!loading && !token) {
    return (
      <PageLayout>
        <ErrorCard
          title="Invalid Link"
          message="This confirmation link appears to be invalid. Please check your email for the correct link."
        />
      </PageLayout>
    );
  }

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <PageLayout>
        <ErrorCard title="Something went wrong" message={error} />
      </PageLayout>
    );
  }

  // Token expired or invalid
  if (data && (!data.token_valid || data.token_expired)) {
    return (
      <PageLayout>
        <ErrorCard
          title="Link Expired"
          message="This confirmation link has expired. Please contact us at hello@zurichjs.com if you need assistance."
        />
      </PageLayout>
    );
  }

  // Already responded
  if (data && data.already_responded) {
    return (
      <PageLayout>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Responded</h1>
          <p className="text-gray-600 mb-4">
            You have already {data.status === 'confirmed' ? 'confirmed' : 'declined'} your attendance
            {data.responded_at && ` on ${new Date(data.responded_at).toLocaleDateString()}`}.
          </p>
          <p className="text-sm text-gray-500">
            If you need to change your response, please contact us at{' '}
            <a href="mailto:hello@zurichjs.com" className="text-blue-600 hover:underline">
              hello@zurichjs.com
            </a>
          </p>
        </div>
      </PageLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <PageLayout>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-lg mx-auto text-center">
          {success === 'confirmed' ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h1>
              <p className="text-gray-600 mb-6">
                Thank you for confirming your attendance at ZurichJS Conference 2026.
                We can&apos;t wait to see you on stage!
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                <h3 className="font-medium text-green-800 mb-2">What&apos;s Next?</h3>
                <ul className="text-sm text-green-700 space-y-2">
                  <li>• We&apos;ll be in touch with more details soon</li>
                  <li>• Check your email for speaker resources</li>
                  <li>• Mark your calendar for September 27, 2026</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-gray-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You</h1>
              <p className="text-gray-600 mb-6">
                We understand and appreciate you letting us know. We hope to see you
                at a future ZurichJS event!
              </p>
            </>
          )}
        </div>
      </PageLayout>
    );
  }

  // Main confirmation form
  return (
    <PageLayout>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F1E271] to-[#FFE566] p-6">
          <h1 className="text-2xl font-bold text-gray-900">Confirm Your Attendance</h1>
          <p className="text-gray-700 mt-1">ZurichJS Conference 2026</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Speaker & Talk Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500 mb-1">Speaker</p>
            <p className="font-medium text-gray-900">{data?.speaker_name}</p>
            <p className="text-sm text-gray-500 mt-3 mb-1">Your Talk</p>
            <p className="font-medium text-gray-900">{data?.talk_title}</p>
            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
              {data?.submission_type}
            </span>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>September 27, 2026</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span>Zurich, Switzerland</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-5 h-5 text-gray-400" />
              <span>Full day event</span>
            </div>
          </div>

          {/* Decline Form */}
          {showDeclineForm ? (
            <div className="border-t pt-6 space-y-4">
              <h3 className="font-medium text-gray-900">We&apos;re sorry to hear that!</h3>
              <p className="text-sm text-gray-600">
                Please let us know why you can&apos;t make it so we can improve future events.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for declining
                </label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value as DeclineReason)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a reason</option>
                  {Object.entries(DECLINE_REASONS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional notes (optional)
                </label>
                <textarea
                  value={declineNotes}
                  onChange={(e) => setDeclineNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeclineForm(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleDecline}
                  disabled={submitting || !declineReason}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit
                </button>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div className="space-y-3 pt-4">
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full px-4 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Yes, I&apos;ll be there!
              </button>
              <button
                onClick={() => setShowDeclineForm(true)}
                disabled={submitting}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                I can&apos;t make it
              </button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        <title>Confirm Attendance | ZurichJS Conference 2026</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-lg mx-auto mb-8 text-center">
          <Link href="/cfp/dashboard" className="inline-block">
            <Image
              src="/logo.svg"
              alt="ZurichJS - Go to Dashboard"
              width={120}
              height={40}
              className="mx-auto hover:opacity-80 transition-opacity"
            />
          </Link>
        </div>
        {children}
      </div>
    </>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-lg mx-auto text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
