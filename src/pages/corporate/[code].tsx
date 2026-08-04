/**
 * Corporate Access Page — /corporate/<code>
 *
 * Opening an admin-issued link marks this browser as a corporate buyer, which
 * permanently stops the discount popup from offering money off. Teams buying on
 * a training budget aren't price sensitive, so the nudge does nothing for their
 * decision and only costs us margin.
 *
 * The code is a path segment rather than a query parameter so it doesn't end up
 * in analytics URLs, Referer headers or shared screenshots of the address bar
 * as an obvious `?discount=` style toggle.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BadgeCheck, CircleAlert, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Layout } from '@/components/Layout';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { markCorporateBuyer } from '@/lib/discount/corporate-buyer';

type ClaimState =
  | { status: 'verifying' }
  | { status: 'valid'; label: string }
  | { status: 'invalid'; reason?: string };

const REASON_COPY: Record<string, string> = {
  expired: 'This link has expired. Ask your ZurichJS contact for a fresh one.',
  bad_signature: "This link isn't valid. Check you copied the whole thing.",
  malformed: "This link isn't valid. Check you copied the whole thing.",
};

export default function CorporateAccessPage() {
  const router = useRouter();
  const { code } = router.query;
  const [state, setState] = useState<ClaimState>({ status: 'verifying' });

  useEffect(() => {
    if (typeof code !== 'string' || !code) return;
    let cancelled = false;

    const claim = async () => {
      try {
        const res = await fetch('/api/discount/corporate/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const body = await res.json();
        if (cancelled) return;

        if (body?.valid) {
          markCorporateBuyer(body.label);
          setState({ status: 'valid', label: body.label });
        } else {
          setState({ status: 'invalid', reason: body?.reason });
        }
      } catch {
        if (!cancelled) setState({ status: 'invalid' });
      }
    };

    void claim();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <Layout>
      <SEO
        title="Corporate access"
        description="Corporate ticket access for ZurichJS Conference 2026."
        noindex
      />
      <SectionContainer>
        <div className="max-w-screen-sm mx-auto flex flex-col items-center gap-5 text-center py-16">
          {state.status === 'verifying' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-brand-gray-medium" aria-hidden="true" />
              <p className="text-base text-brand-gray-medium" role="status">
                Setting up your corporate access…
              </p>
            </>
          )}

          {state.status === 'valid' && (
            <>
              <BadgeCheck className="w-10 h-10 text-brand-primary" aria-hidden="true" />
              <Kicker>CORPORATE ACCESS</Kicker>
              <Heading level="h1" className="text-2xl">
                You&apos;re all set, {state.label}
              </Heading>
              <p className="text-base text-brand-gray-medium text-balance">
                Your team books at the standard rate — we won&apos;t interrupt you with
                discount pop-ups on this browser. Invoicing and multi-seat orders are
                handled at checkout.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                <Button href="/#tickets">Browse tickets</Button>
                <Button href="/contact" variant="outline">
                  Talk to us about invoicing
                </Button>
              </div>
            </>
          )}

          {state.status === 'invalid' && (
            <>
              <CircleAlert className="w-10 h-10 text-brand-orange" aria-hidden="true" />
              <Heading level="h1" className="text-2xl">
                We couldn&apos;t use that link
              </Heading>
              <p className="text-base text-brand-gray-medium text-balance" role="status">
                {REASON_COPY[state.reason ?? ''] ??
                  'Something went wrong setting up your corporate access.'}
              </p>
              <p className="text-sm text-brand-gray-medium">
                You can still buy tickets as normal, or{' '}
                <Link href="/contact" className="underline">
                  get in touch
                </Link>{' '}
                and we&apos;ll sort it out.
              </p>
              <div className="mt-2">
                <Button href="/#tickets">Browse tickets</Button>
              </div>
            </>
          )}
        </div>
      </SectionContainer>
    </Layout>
  );
}
