/**
 * OSS Maintainer Apply Form
 *
 * Self-contained client-side form for the /tickets/oss-maintainer page.
 * Submits to POST /api/verify-oss-maintainer and renders all three outcomes:
 *   - qualified (200 success=true)        → success card with computed tier
 *   - not qualified (200 success=false)   → polite reason + contact prompt
 *   - error (4xx/5xx)                     → inline error
 */

import React, { useState } from 'react';
import { OctagonAlertIcon, CheckCircle2, Github, Package, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/atoms';

export interface OssMaintainerApplyFormProps {
  defaultTicketTier?: 'standard' | 'vip';
}

interface FormState {
  name: string;
  email: string;
  githubUsername: string;
  repos: string[];
  npmPackages: string[];
  ticketTier: 'standard' | 'vip';
  additionalInfo: string;
  website: string; // honeypot
}

interface ApiResult {
  success: boolean;
  qualified: boolean;
  verificationId?: string;
  qualifyingTier?: 1 | 2 | 3 | 4;
  discountPercent?: number;
  message: string;
  hardRejectReason?: string;
  reason?: string;
}

const initialState: FormState = {
  name: '',
  email: '',
  githubUsername: '',
  repos: [''],
  npmPackages: [],
  ticketTier: 'standard',
  additionalInfo: '',
  website: '',
};

export const OssMaintainerApplyForm: React.FC<OssMaintainerApplyFormProps> = ({
  defaultTicketTier = 'standard',
}) => {
  const [form, setForm] = useState<FormState>({ ...initialState, ticketTier: defaultTicketTier });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const updateRepoAt = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.repos];
      next[index] = value;
      return { ...prev, repos: next };
    });
  };

  const addRepo = () => {
    if (form.repos.length >= 3) return;
    setForm((prev) => ({ ...prev, repos: [...prev.repos, ''] }));
  };

  const removeRepoAt = (index: number) => {
    setForm((prev) => ({ ...prev, repos: prev.repos.filter((_, i) => i !== index) }));
  };

  const updateNpmAt = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.npmPackages];
      next[index] = value;
      return { ...prev, npmPackages: next };
    });
  };

  const addNpm = () => {
    if (form.npmPackages.length >= 3) return;
    setForm((prev) => ({ ...prev, npmPackages: [...prev.npmPackages, ''] }));
  };

  const removeNpmAt = (index: number) => {
    setForm((prev) => ({ ...prev, npmPackages: prev.npmPackages.filter((_, i) => i !== index) }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.githubUsername.trim()) errs.githubUsername = 'GitHub username is required';
    const repos = form.repos.map((r) => r.trim()).filter(Boolean);
    if (repos.length === 0) errs.repos = 'Submit at least one repository';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        githubUsername: form.githubUsername.trim().replace(/^@/, ''),
        repos: form.repos.map((r) => r.trim()).filter(Boolean),
        npmPackages: form.npmPackages.map((p) => p.trim()).filter(Boolean),
        ticketTier: form.ticketTier,
        additionalInfo: form.additionalInfo.trim() || undefined,
        website: form.website,
      };
      const res = await fetch('/api/verify-oss-maintainer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ApiResult & { error?: string };
      if (!res.ok && res.status !== 200) {
        throw new Error(data.error || data.message || `Request failed (${res.status})`);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success && result.qualified) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-brand-white">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" aria-hidden="true" />
          <h3 className="text-xl font-bold">Application received</h3>
        </div>
        <p className="text-sm leading-relaxed text-brand-gray-light mb-4">
          {result.message}
        </p>
        <div className="rounded-lg bg-brand-black/40 p-4 text-sm">
          <p className="mb-2"><span className="text-brand-gray-light">Verification ID:</span> <code className="text-brand-primary font-mono">{result.verificationId}</code></p>
          {typeof result.qualifyingTier === 'number' && (
            <p>
              <span className="text-brand-gray-light">Qualifying tier:</span>{' '}
              <span className="text-brand-primary font-semibold">
                T{result.qualifyingTier} — {result.discountPercent}% off
              </span>
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-brand-gray-light">
          Keep your verification ID handy. The payment link will be emailed to {form.email}.
        </p>
      </div>
    );
  }

  if (result && !result.qualified) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-brand-white">
        <div className="flex items-center gap-3 mb-3">
          <OctagonAlertIcon className="w-6 h-6 text-amber-400" aria-hidden="true" />
          <h3 className="text-xl font-bold">We need a closer look</h3>
        </div>
        <p className="text-sm leading-relaxed text-brand-gray-light mb-4">
          {result.message}
        </p>
        {result.hardRejectReason && (
          <p className="text-xs text-brand-gray-light mb-4">
            <strong>Reason:</strong> {result.hardRejectReason}
          </p>
        )}
        <p className="text-xs text-brand-gray-light">
          If you think this is a mistake, reply to this thread or email{' '}
          <a className="text-brand-primary underline" href="mailto:hello@zurichjs.com">hello@zurichjs.com</a>{' '}
          with links to your work — we review every edge case manually.
        </p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => {
            setResult(null);
            setForm({ ...initialState, ticketTier: form.ticketTier });
          }}
        >
          Edit and try again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="border border-brand-red/50 rounded-lg p-3 text-sm text-brand-red">
          <OctagonAlertIcon size={16} className="inline-block mr-1 mb-[0.1em]" />
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="oss-name" className="block text-sm font-semibold text-brand-white mb-2">
            Full Name <span className="text-brand-red">*</span>
          </label>
          <Input
            id="oss-name"
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Jane Maintainer"
            required
            aria-invalid={!!fieldErrors.name}
            className="w-full"
          />
          {fieldErrors.name && <p className="text-brand-red text-xs mt-1">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="oss-email" className="block text-sm font-semibold text-brand-white mb-2">
            Email <span className="text-brand-red">*</span>
          </label>
          <Input
            id="oss-email"
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="jane@example.com"
            required
            aria-invalid={!!fieldErrors.email}
            className="w-full"
          />
          {fieldErrors.email && <p className="text-brand-red text-xs mt-1">{fieldErrors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="oss-github" className="block text-sm font-semibold text-brand-white mb-2">
          GitHub username <span className="text-brand-red">*</span>
        </label>
        <div className="relative">
          <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-light" aria-hidden="true" />
          <Input
            id="oss-github"
            type="text"
            value={form.githubUsername}
            onChange={(e) => updateField('githubUsername', e.target.value)}
            placeholder="janemaintainer"
            required
            aria-invalid={!!fieldErrors.githubUsername}
            className="w-full pl-9"
          />
        </div>
        <p className="text-xs text-brand-gray-light mt-1">
          Your conference badge will be locked to this handle.
        </p>
        {fieldErrors.githubUsername && <p className="text-brand-red text-xs mt-1">{fieldErrors.githubUsername}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-brand-white">
            Repositories you maintain <span className="text-brand-red">*</span>
          </label>
          <button
            type="button"
            onClick={addRepo}
            disabled={form.repos.length >= 3}
            className="inline-flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Add another (max 3)
          </button>
        </div>
        <div className="space-y-2">
          {form.repos.map((repo, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                type="text"
                value={repo}
                onChange={(e) => updateRepoAt(idx, e.target.value)}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="w-full"
              />
              {form.repos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRepoAt(idx)}
                  aria-label="Remove repository"
                  className="shrink-0 p-2 rounded-lg text-brand-gray-light hover:text-brand-red cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {fieldErrors.repos && <p className="text-brand-red text-xs mt-1">{fieldErrors.repos}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-brand-white">
            npm packages you maintain <span className="text-brand-gray-light font-normal">(optional)</span>
          </label>
          {form.npmPackages.length < 3 && (
            <button
              type="button"
              onClick={addNpm}
              className="inline-flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add package
            </button>
          )}
        </div>
        {form.npmPackages.length === 0 ? (
          <p className="text-xs text-brand-gray-light">
            Skip if you don&apos;t publish to npm — repos alone are enough.
          </p>
        ) : (
          <div className="space-y-2">
            {form.npmPackages.map((pkg, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="relative w-full">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray-light" aria-hidden="true" />
                  <Input
                    type="text"
                    value={pkg}
                    onChange={(e) => updateNpmAt(idx, e.target.value)}
                    placeholder="@scope/package or package-name"
                    className="w-full pl-9"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeNpmAt(idx)}
                  aria-label="Remove package"
                  className="shrink-0 p-2 rounded-lg text-brand-gray-light hover:text-brand-red cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-brand-white mb-2">
          Which ticket do you want? <span className="text-brand-red">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['standard', 'vip'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => updateField('ticketTier', tier)}
              aria-pressed={form.ticketTier === tier}
              className={`rounded-lg border px-3 py-2.5 text-sm font-semibold cursor-pointer transition-colors ${
                form.ticketTier === tier
                  ? 'border-brand-primary bg-brand-primary/15 text-brand-primary'
                  : 'border-brand-gray-medium text-brand-white hover:border-brand-gray-light'
              }`}
            >
              {tier === 'standard' ? 'Standard ticket' : 'VIP ticket'}
            </button>
          ))}
        </div>
        <p className="text-xs text-brand-gray-light mt-1">
          Your tier % is applied to whichever you pick.
        </p>
      </div>

      <div>
        <label htmlFor="oss-info" className="block text-sm font-semibold text-brand-white mb-2">
          Anything else? <span className="text-brand-gray-light font-normal">(optional)</span>
        </label>
        <Textarea
          id="oss-info"
          value={form.additionalInfo}
          onChange={(e) => updateField('additionalInfo', e.target.value)}
          placeholder="If your project is widely used but doesn't hit the star/download thresholds (e.g. enterprise-internal-but-public), let us know here."
          rows={3}
          className="w-full"
        />
      </div>

      {/* Honeypot field — hidden from users, bots that fill every field get a 400 */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="oss-website">Website</label>
        <input
          id="oss-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => updateField('website', e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 p-4 text-xs text-brand-gray-light">
        <p>
          <strong className="text-brand-white">What happens next:</strong> We check your GitHub
          and npm signals automatically. If the auto-check passes, your application goes to a
          human reviewer who&apos;ll email you a Stripe payment link with the discount pre-applied
          within 48 hours. Seats are limited (30 across all tiers).
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={submitting}
        disabled={submitting}
        className="w-full"
      >
        Submit OSS maintainer application
      </Button>
    </form>
  );
};
