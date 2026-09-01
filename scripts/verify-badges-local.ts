#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { BADGE_LOGO_BUCKET, badgeLogoDirectory } from '@/lib/badges/logo-storage';
import { filterBadgeSources, loadBadgeReviewRows, loadBadgeSources } from '@/lib/badges/data';
import { buildBadgeExportFiles } from '@/lib/badges/files';

function localSupabaseEnvironment(): Record<string, string> {
  const output = execFileSync('supabase', ['status', '-o', 'env'], { encoding: 'utf8' });
  return Object.fromEntries(output.split('\n').flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
    return match ? [[match[1], match[2].replace(/"$/, '')]] : [];
  }));
}

async function main(): Promise<void> {
  const environment = localSupabaseEnvironment();
  const apiUrl = environment.API_URL;
  const serviceKey = environment.SECRET_KEY || environment.SERVICE_ROLE_KEY;
  if (!apiUrl || !serviceKey || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(apiUrl)) {
    throw new Error('Local Supabase is not running; refusing to use non-local credentials');
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = environment.PUBLISHABLE_KEY || environment.ANON_KEY;
  process.env.SUPABASE_SECRET_KEY = serviceKey;
  process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||= 'pk_test_badge_verifier';

  const client = createClient(apiUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let manualId: string | null = null;
  let subjectKey: string | null = null;
  let sponsorId: string | null = null;
  let sponsorSubjectKey: string | null = null;
  let sponsorLogoPath: string | null = null;

  try {
    const { data: manual, error: manualError } = await client.from('manual_badge_entries').insert({
      category: 'organizer',
      first_name: 'Integration',
      last_name: 'Organizer',
      role: 'Badge verifier',
      company: 'ZurichJS',
      networking_enabled: true,
      networking_profile: {
        linkedinUrl: 'https://linkedin.com/in/integration-organizer',
        githubUrl: null,
        xHandle: null,
        blueskyHandle: null,
        mastodonHandle: null,
        websiteUrl: 'https://zurichjs.com',
      },
    }).select('id, share_id').single();
    if (manualError || !manual) throw manualError ?? new Error('Manual row insert failed');
    manualId = manual.id;
    subjectKey = `manual:${manual.id}`;

    const { data: code, error: codeError } = await client.from('badge_qr_codes').insert({
      subject_key: subjectKey,
      target_public_id: `badge-${manual.share_id}`,
    }).select('code').single();
    if (codeError || !code) throw codeError ?? new Error('Badge code insert failed');

    const { data: sponsor, error: sponsorError } = await client.from('manual_badge_entries').insert({
      category: 'sponsor',
      first_name: 'Integration',
      last_name: 'Sponsor',
      role: 'On-site representative',
      company: 'Local Sponsor GmbH',
      networking_enabled: true,
      networking_profile: {
        linkedinUrl: 'https://linkedin.com/company/local-sponsor',
        githubUrl: null,
        xHandle: null,
        blueskyHandle: null,
        mastodonHandle: null,
        websiteUrl: 'https://example.test',
      },
    }).select('id, share_id').single();
    if (sponsorError || !sponsor) throw sponsorError ?? new Error('Manual sponsor insert failed');
    sponsorId = sponsor.id;
    sponsorSubjectKey = `manual:${sponsor.id}`;
    sponsorLogoPath = `${badgeLogoDirectory(sponsor.id)}/default_integration.png`;

    const sponsorLogo = await sharp(Buffer.from(
      '<svg width="900" height="180" xmlns="http://www.w3.org/2000/svg">' +
      '<text x="450" y="125" text-anchor="middle" font-family="sans-serif" font-size="110" font-weight="700" fill="white">LOCAL SPONSOR</text>' +
      '</svg>'
    )).png().toBuffer();
    const { error: logoUploadError } = await client.storage.from(BADGE_LOGO_BUCKET)
      .upload(sponsorLogoPath, sponsorLogo, { contentType: 'image/png', upsert: false });
    if (logoUploadError) throw logoUploadError;
    const { data: logoPublicData } = client.storage.from(BADGE_LOGO_BUCKET)
      .getPublicUrl(sponsorLogoPath);
    const { error: logoUrlError } = await client.from('manual_badge_entries')
      .update({ logo_url: logoPublicData.publicUrl })
      .eq('id', sponsor.id);
    if (logoUrlError) throw logoUrlError;

    const { error: sponsorCodeError } = await client.from('badge_qr_codes').insert({
      subject_key: sponsorSubjectKey,
      target_public_id: `badge-${sponsor.share_id}`,
    });
    if (sponsorCodeError) throw sponsorCodeError;

    const { error: staleTargetError } = await client.from('badge_qr_codes')
      .update({ target_public_id: 'badge-00000000-0000-4000-8000-000000000000' })
      .eq('subject_key', subjectKey);
    if (staleTargetError) throw staleTargetError;
    await loadBadgeSources(client, [], true);
    const { data: repairedCode, error: repairedCodeError } = await client.from('badge_qr_codes')
      .select('code, target_public_id')
      .eq('subject_key', subjectKey)
      .single();
    if (repairedCodeError || repairedCode?.code !== code.code || repairedCode.target_public_id !== `badge-${manual.share_id}`) {
      throw repairedCodeError ?? new Error('Provisioning changed a badge code while repairing its stable target');
    }

    const replacementCode = randomUUID();
    const { error: rotateError } = await client.from('badge_qr_codes')
      .update({ code: replacementCode })
      .eq('subject_key', subjectKey);
    if (rotateError) throw rotateError;
    const { data: oldCode } = await client.from('badge_qr_codes').select('code').eq('code', code.code).maybeSingle();
    const { data: newCode } = await client.from('badge_qr_codes').select('target_public_id').eq('code', replacementCode).single();
    if (oldCode || newCode?.target_public_id !== `badge-${manual.share_id}`) {
      throw new Error('Badge QR rotation did not invalidate only the old token');
    }

    const reviewRows = await loadBadgeReviewRows(client, [], 'http://localhost:3000');
    const review = reviewRows.find((row) => row.selectionId === subjectKey);
    if (!review || review.category !== 'organizer' || review.badgeCode !== replacementCode) {
      throw new Error('Manual organizer was not returned by badge review');
    }
    const sponsorReview = reviewRows.find((row) => row.selectionId === sponsorSubjectKey);
    if (!sponsorReview || sponsorReview.category !== 'sponsor' || sponsorReview.source !== 'manual' || !sponsorReview.logoUrl) {
      throw new Error('Manual sponsor and its persistent default logo were not returned by badge review');
    }

    const sources = filterBadgeSources(
      await loadBadgeSources(client, [], true, [subjectKey, sponsorSubjectKey]),
      [subjectKey, sponsorSubjectKey]
    );
    const files = await buildBadgeExportFiles(sources, 'http://localhost:3000', {
      csvPath: (name) => name,
    });
    const organizerPdf = files.find((file) => file.name.startsWith('pdf/organizer/'));
    if (!organizerPdf) throw new Error('Organizer PDF was not generated');
    const pdf = await PDFDocument.load(organizerPdf.data);
    if (pdf.getPageCount() !== 2 || Math.abs(pdf.getPage(0).getWidth() - 266.457) > 0.01) {
      throw new Error('Organizer PDF geometry is invalid');
    }
    const sponsorPdf = files.find((file) => file.name.startsWith('pdf/sponsor/'));
    if (!sponsorPdf || (await PDFDocument.load(sponsorPdf.data)).getPageCount() !== 2) {
      throw new Error('Per-person sponsor PDF was not generated');
    }

    const { resolvePublicNetworkingProfile } = await import('@/lib/networking/profiles');
    const publicProfile = await resolvePublicNetworkingProfile(`badge-${manual.share_id}`);
    if (publicProfile?.kind !== 'organizer' || publicProfile.name !== 'Integration Organizer') {
      throw new Error('Organizer share page did not resolve');
    }
    const sponsorProfile = await resolvePublicNetworkingProfile(`badge-${sponsor.share_id}`);
    if (sponsorProfile?.kind !== 'sponsor' || sponsorProfile.name !== 'Integration Sponsor' || !sponsorProfile.imageUrl) {
      throw new Error('Manual sponsor share page did not resolve with its logo');
    }

    process.stdout.write('Local badge integration verified: attendee-independent manual sponsor, persistent logo, create, review, rotate, share, render, cleanup.\n');
  } finally {
    if (sponsorLogoPath) await client.storage.from(BADGE_LOGO_BUCKET).remove([sponsorLogoPath]);
    if (sponsorSubjectKey) await client.from('badge_qr_codes').delete().eq('subject_key', sponsorSubjectKey);
    if (subjectKey) await client.from('badge_qr_codes').delete().eq('subject_key', subjectKey);
    if (sponsorId) await client.from('manual_badge_entries').delete().eq('id', sponsorId);
    if (manualId) await client.from('manual_badge_entries').delete().eq('id', manualId);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
