import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import { SEO } from '@/components/SEO';
import { Button, Heading } from '@/components/atoms';
import { createSupabaseServerClient } from '@/lib/cfp/auth';
import {
  isNamespaceStudentSponsorshipReviewer,
  listNamespaceStudentSponsorshipApplications,
} from '@/lib/namespace/student-sponsorship-persistence';
import type { NamespaceStudentSponsorshipApplication } from '@/lib/types/namespace';

interface NamespaceStudentSponsorshipApplicationRow
  extends NamespaceStudentSponsorshipApplication {
  updated_at_label: string;
}

interface NamespaceReviewPageProps {
  applications: NamespaceStudentSponsorshipApplicationRow[];
  email: string | null;
  authorized: boolean;
}

type LoginState = 'idle' | 'loading' | 'success' | 'error';

export default function NamespaceReviewPage({
  applications,
  email,
  authorized,
}: NamespaceReviewPageProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [state, setState] = useState<LoginState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setState('loading');
    setError(null);

    try {
      const response = await fetch('/api/namespace/review/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link');
      }

      setState('success');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    }
  };

  if (!email) {
    return (
      <>
        <SEO
          title="Namespace Review"
          description="Review Namespace Student Sponsorship applications"
          noindex
        />
        <main className="flex min-h-screen items-center justify-center bg-brand-gray-lightest px-4">
          <div className="w-full max-w-md">
            <Heading level="h1" variant="light" className="mb-3 text-xl font-bold">
              Namespace review
            </Heading>
            <p className="mb-6 text-sm text-brand-gray-dark">
              Enter an approved reviewer email. We will send a magic link.
            </p>
            {state === 'success' ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                Check your email for the sign-in link.
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary/30"
                />
                {error && <p className="text-sm text-error">{error}</p>}
                <Button
                  type="submit"
                  variant="blue"
                  loading={state === 'loading'}
                  disabled={state === 'loading'}
                >
                  Send magic link
                </Button>
              </form>
            )}
          </div>
        </main>
      </>
    );
  }

  if (!authorized) {
    return (
      <>
        <SEO title="Unauthorized | Namespace Review" description="Unauthorized" noindex />
        <main className="flex min-h-screen items-center justify-center bg-brand-gray-lightest px-4">
          <div className="max-w-md text-center">
            <Heading level="h1" variant="light" className="mb-3 text-xl font-bold">
              Not authorized
            </Heading>
            <p className="text-sm text-brand-gray-dark">
              {email} is signed in, but is not on the Namespace reviewer list.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Namespace Applications"
        description="Namespace Student Sponsorship applications"
        noindex
      />
      <main className="min-h-screen bg-brand-gray-lightest px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Heading level="h1" variant="light" className="text-xl font-bold">
                Namespace applications
              </Heading>
              <p className="mt-2 text-sm text-brand-gray-dark">
                Signed in as {email}. {applications.length} total.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-gray-50 text-xs uppercase tracking-wide text-brand-gray-dark">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-black/5 align-top">
                    <td className="px-4 py-3 font-semibold">{application.status}</td>
                    <td className="px-4 py-3">{application.full_name || '-'}</td>
                    <td className="px-4 py-3">{application.email}</td>
                    <td className="px-4 py-3">{application.university_name || '-'}</td>
                    <td className="px-4 py-3">
                      {application.code_url ? (
                        <a
                          href={application.code_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-primary underline"
                        >
                          Open
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">{application.updated_at_label}</td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-brand-gray-dark" colSpan={6}>
                      No applications yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<NamespaceReviewPageProps> = async (ctx) => {
  const supabase = createSupabaseServerClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user.email ?? null;

  if (!email) {
    return {
      props: {
        applications: [],
        email: null,
        authorized: false,
      },
    };
  }

  const authorized = await isNamespaceStudentSponsorshipReviewer(email);

  if (!authorized) {
    return {
      props: {
        applications: [],
        email,
        authorized: false,
      },
    };
  }

  const { applications } = await listNamespaceStudentSponsorshipApplications();

  return {
    props: {
      applications: applications.map((application) => ({
        ...application,
        updated_at_label: new Date(application.updated_at).toLocaleString('en-CH', {
          dateStyle: 'short',
          timeStyle: 'short',
          timeZone: 'Europe/Zurich',
        }),
      })),
      email,
      authorized: true,
    },
  };
};
