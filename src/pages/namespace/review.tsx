import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Check, ChevronDown, ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button, Heading, Modal, ModalBody } from '@/components/atoms';
import { createSupabaseServerClient } from '@/lib/cfp/auth';
import type { NamespaceStudentSponsorshipApplication } from '@/lib/types/namespace';

interface NamespaceStudentSponsorshipApplicationRow
  extends NamespaceStudentSponsorshipApplication {
  created_at_label: string;
  submitted_at_label: string | null;
  updated_at_label: string;
}

interface NamespaceReviewPageProps {
  applications: NamespaceStudentSponsorshipApplicationRow[];
  email: string | null;
  authorized: boolean;
}

type LoginState = 'idle' | 'loading' | 'success' | 'error';
type StatusFilter = 'all' | 'email_sent' | 'submission_failed' | 'partial';
type CopyState = 'idle' | 'copied' | 'error';

const reviewPageTitle = 'Namespace Review Dashboard';
const reviewPageDescription = 'Review Namespace Student Sponsorship applications for ZurichJS Conf 2026.';

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'email_sent', label: 'Email sent' },
  { value: 'submission_failed', label: 'Submit failed' },
  { value: 'partial', label: 'Partial' },
];

function getStatusStyles(status: string): string {
  if (status === 'email_sent') {
    return 'border-green-200 bg-green-50 text-green-800';
  }

  if (status === 'submission_failed') {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  return 'border-amber-200 bg-amber-50 text-amber-800';
}

function getStatusTableStyles(status: string): string {
  if (status === 'email_sent') {
    return 'border-green-500 sm:border-green-200 sm:bg-green-50 sm:text-green-800';
  }

  if (status === 'submission_failed') {
    return 'border-red-500 sm:border-red-200 sm:bg-red-50 sm:text-red-800';
  }

  return 'border-amber-500 sm:border-amber-200 sm:bg-amber-50 sm:text-amber-800';
}

function getStatusLabel(status: string): string {
  if (status === 'email_sent') {
    return 'Sent';
  }

  if (status === 'submission_failed') {
    return 'Failed';
  }

  return 'Partial';
}

function getRepositoryLabel(githubUrl: string | null): string {
  if (!githubUrl) {
    return '-';
  }

  try {
    const url = new URL(githubUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length >= 2) {
      return `${pathParts[0]}/${pathParts[1]}`;
    }
  } catch {
    return githubUrl;
  }

  return githubUrl;
}

function escapeCsvValue(value: string | boolean | null): string {
  const stringValue = value === null ? '' : String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function buildApplicationsCsv(applications: NamespaceStudentSponsorshipApplicationRow[]): string {
  const headers = [
    'status',
    'status_label',
    'full_name',
    'email',
    'university_name',
    'degree_name',
    'github_url',
    'code_url',
    'setup_instructions',
    'pride_explanation',
    'anything_else',
    'processing_consent',
    'submitted_at',
    'created_at',
    'updated_at',
  ];
  const rows = applications.map((application) => [
    application.status,
    getStatusLabel(application.status),
    application.full_name,
    application.email,
    application.university_name,
    application.degree_name,
    application.github_url,
    application.code_url,
    application.setup_instructions,
    application.pride_explanation,
    application.anything_else,
    application.processing_consent,
    application.submitted_at,
    application.created_at,
    application.updated_at,
  ]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

function Value({
  label,
  value,
  multiline = false,
  className = '',
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-gray-dark">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${
          multiline
            ? 'whitespace-pre-wrap leading-relaxed text-brand-gray-dark'
            : 'text-gray-950'
        }`}
      >
        {value || '-'}
      </dd>
    </div>
  );
}

function ApplicationDetailsModal({
  application,
  onClose,
}: {
  application: NamespaceStudentSponsorshipApplicationRow | null;
  onClose: () => void;
}) {
  const [isEmailCopied, setIsEmailCopied] = useState(false);

  if (!application) {
    return null;
  }

  const displayName = application.full_name || application.email;
  const submittedMeta = [
    application.submitted_at_label ? `Submitted ${application.submitted_at_label}` : null,
    `Created ${application.created_at_label}`,
  ].filter(Boolean).join(' · ');
  const handleCopyEmail = async () => {
    try {
      await copyTextToClipboard(application.email);
      setIsEmailCopied(true);
      window.setTimeout(() => setIsEmailCopied(false), 1600);
    } catch {
      setIsEmailCopied(false);
    }
  };

  return (
    <Modal
      isOpen={!!application}
      onClose={onClose}
      size="lg"
      headerContent={(
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-black">{displayName}</h2>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyles(application.status)}`}
            >
              {getStatusLabel(application.status)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="group mt-1 inline-flex max-w-full items-center gap-2 rounded-md text-left text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-primary"
            aria-label={`Copy ${application.email}`}
            title="Copy email"
          >
            <span className="truncate decoration-dotted underline-offset-4 group-hover:underline">
              {application.email}
            </span>
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-brand-gray-dark opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
              {isEmailCopied ? (
                <Check className="size-4 text-green-700" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
            </span>
          </button>
          <p className="mt-1 text-xs text-gray-500">{submittedMeta}</p>
        </div>
      )}
    >
      <ModalBody className="space-y-6">
        {application.status === 'submission_failed' && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            Form was completed, but the email send failed.
          </p>
        )}

        <dl className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Value label="University" value={application.university_name} />
            <Value label="Degree" value={application.degree_name} />
          </div>

          <Value
            label="Why they are proud of it"
            value={application.pride_explanation}
            multiline
            className="border-t border-black/10 pt-5"
          />
          <Value
            label="Setup instructions"
            value={application.setup_instructions}
            multiline
            className="border-t border-black/10 pt-5"
          />

          {application.anything_else && (
            <Value
              label="Additional context"
              value={application.anything_else}
              multiline
              className="border-t border-black/10 pt-5"
            />
          )}

          <div className="border-t border-black/10 pt-5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-gray-dark">
              Links
            </dt>
            <dd className="mt-2 space-y-3">
            {application.code_url && (
              <p className="text-xs text-brand-gray-dark">
                <span className="font-bold text-gray-950">Code: </span>
                <a
                  href={application.code_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all font-bold text-blue-primary hover:underline"
                >
                  {application.code_url}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </p>
            )}
            {application.github_url && (
              <p className="text-xs text-brand-gray-dark">
                <span className="font-bold text-gray-950">GitHub profile: </span>
                <a
                  href={application.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all font-bold text-blue-primary hover:underline"
                >
                  {application.github_url}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              </p>
            )}
            {!application.code_url && !application.github_url && (
              <p className="text-sm text-brand-gray-dark">No links submitted.</p>
            )}
            </dd>
          </div>
        </dl>
      </ModalBody>
    </Modal>
  );
}

export default function NamespaceReviewPage({
  applications,
  email,
  authorized,
}: NamespaceReviewPageProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [state, setState] = useState<LoginState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<NamespaceStudentSponsorshipApplicationRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copyState, setCopyState] = useState<CopyState>('idle');

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

  const handleCopyCsv = async () => {
    try {
      await copyTextToClipboard(buildApplicationsCsv(filteredApplications));
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 3000);
    }
  };

  if (!email) {
    return (
      <>
        <SEO
          title="Namespace Review"
          description={reviewPageDescription}
          canonical="/namespace/review"
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
        <SEO
          title="Unauthorized | Namespace Review"
          description={reviewPageDescription}
          canonical="/namespace/review"
          noindex
        />
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

  const emailSentCount = applications.filter(
    (application) => application.status === 'email_sent'
  ).length;
  const failedCount = applications.filter(
    (application) => application.status === 'submission_failed'
  ).length;
  const partialCount = applications.filter(
    (application) => application.status === 'partial'
  ).length;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const statusFilteredApplications = statusFilter === 'all'
    ? applications
    : applications.filter((application) => application.status === statusFilter);
  const filteredApplications = normalizedSearchTerm
    ? statusFilteredApplications.filter((application) => {
      const fullName = application.full_name?.toLowerCase() ?? '';
      const applicationEmail = application.email.toLowerCase();

      return fullName.includes(normalizedSearchTerm)
        || applicationEmail.includes(normalizedSearchTerm);
    })
    : statusFilteredApplications;
  const selectedStatusFilter = statusFilterOptions.find(
    (option) => option.value === statusFilter
  ) || statusFilterOptions[0];

  return (
    <>
      <SEO
        title={reviewPageTitle}
        description={reviewPageDescription}
        canonical="/namespace/review"
        noindex
      />
      <main className="min-h-screen bg-brand-gray-lightest px-4 py-8">
        <div className="mx-auto max-w-7xl mt-10 md:mt-20">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Heading level="h1" variant="light" className="text-2xl font-bold">
                Student applications
              </Heading>
              <p className="mt-2 text-sm text-brand-gray-dark">
                Signed in as {email}.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-[28rem] lg:grid-cols-4">
              <div className="rounded-lg border border-black/10 bg-white px-4 py-3">
                <div className="text-xl font-bold text-gray-950">{applications.length}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-gray-dark">
                  Total
                </div>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div className="text-xl font-bold text-green-800">{emailSentCount}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-green-800">
                  Email sent
                </div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <div className="text-xl font-bold text-red-800">{failedCount}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-red-800">
                  Failed
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-xl font-bold text-amber-800">{partialCount}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Partial
                </div>
              </div>
            </div>
          </div>

          {applications.length > 0 ? (
            <div>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Listbox value={statusFilter} onChange={setStatusFilter}>
                    <div className="relative w-full sm:w-56">
                      <ListboxButton className="flex w-full items-center justify-between rounded-lg border border-black/10 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-950 shadow-sm">
                        <span>{selectedStatusFilter.label}</span>
                        <ChevronDown className="size-4 text-brand-gray-dark" aria-hidden="true" />
                      </ListboxButton>
                      <ListboxOptions className="absolute left-0 z-10 mt-2 w-full overflow-hidden rounded-lg border border-black/10 bg-white py-1 text-sm shadow-lg">
                        {statusFilterOptions.map((option) => (
                          <ListboxOption
                            key={option.value}
                            value={option.value}
                            className="cursor-pointer px-3 py-2 text-gray-950 data-[focus]:bg-gray-100 data-[selected]:font-bold"
                          >
                            {option.label}
                          </ListboxOption>
                        ))}
                      </ListboxOptions>
                    </div>
                  </Listbox>
                  <label className="sr-only" htmlFor="namespace-review-search">
                    Search by name or email
                  </label>
                  <input
                    id="namespace-review-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search name or email"
                    className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-gray-950 shadow-sm placeholder:text-brand-gray-dark focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary/30 sm:w-72"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-gray-950 shadow-sm transition-colors hover:bg-gray-50"
                >
                  {copyState === 'copied' ? (
                    <Check className="size-4 text-green-700" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4 text-brand-gray-dark" aria-hidden="true" />
                  )}
                  {copyState === 'copied'
                    ? 'CSV copied'
                    : copyState === 'error'
                      ? 'Copy failed'
                      : `Copy CSV (${filteredApplications.length})`}
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-black/10 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-brand-gray-dark">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Repository</th>
                      <th className="px-4 py-3 text-right">Submitted at</th>
                      <th className="sticky right-0 bg-gray-50 px-4 py-3">
                        <span className="sr-only">Open application</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredApplications.map((application) => (
                      <tr
                        key={application.id}
                        onClick={() => setSelectedApplication(application)}
                        className="group cursor-pointer align-middle transition-colors hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex size-3 rounded-full border-2 bg-white sm:hidden ${getStatusTableStyles(application.status)}`}
                            aria-label={getStatusLabel(application.status)}
                          />
                          <span
                            className={`hidden rounded-full border px-2.5 py-1 text-xs font-bold sm:inline-flex ${getStatusStyles(application.status)}`}
                          >
                            {getStatusLabel(application.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-950">
                          {application.full_name || '-'}
                        </td>
                        <td className="px-4 py-4 text-brand-gray-dark">
                          {application.email}
                        </td>
                        <td className="px-4 py-4">
                          {application.github_url ? (
                            <a
                              href={application.github_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="block max-w-56 truncate font-bold text-blue-primary hover:underline"
                            >
                              {getRepositoryLabel(application.github_url)}
                            </a>
                          ) : (
                            <span className="text-brand-gray-dark">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-brand-gray-dark">
                          {application.submitted_at_label || '-'}
                        </td>
                        <td className="sticky right-0 whitespace-nowrap bg-white px-4 py-4 text-right text-brand-gray-dark group-hover:bg-gray-50">
                          <ChevronRight className="ml-auto size-4" aria-hidden="true" />
                        </td>
                      </tr>
                    ))}
                    {filteredApplications.length === 0 && (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-brand-gray-dark"
                          colSpan={6}
                        >
                          No applications match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-black/10 bg-white px-6 py-10 text-center text-sm text-brand-gray-dark">
              No applications yet.
            </div>
          )}
        </div>
      </main>
      <ApplicationDetailsModal
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<NamespaceReviewPageProps> = async (ctx) => {
  const {
    isNamespaceStudentSponsorshipReviewer,
    listNamespaceStudentSponsorshipApplications,
  } = await import('@/lib/namespace/student-sponsorship-persistence');
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
  const formatZurichDate = (value: string | null) => value
    ? new Date(value).toLocaleString('en-CH', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Zurich',
    })
    : null;

  return {
    props: {
      applications: applications.map((application) => ({
        ...application,
        created_at_label: formatZurichDate(application.created_at) || '-',
        submitted_at_label: formatZurichDate(application.submitted_at),
        updated_at_label: formatZurichDate(application.updated_at) || '-',
      })),
      email,
      authorized: true,
    },
  };
};
