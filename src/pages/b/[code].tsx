import type { GetServerSideProps } from 'next';
import { logger } from '@/lib/logger';
import { createServiceRoleClient } from '@/lib/supabase';

const log = logger.scope('Badge QR Redirect');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default function BadgeQrRedirectPage(): null {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  context.res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  const code = typeof context.params?.code === 'string' ? context.params.code : null;
  if (!code || !UUID_PATTERN.test(code)) return { notFound: true };

  const { data, error } = await createServiceRoleClient()
    .from('badge_qr_codes')
    .select('target_public_id')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    log.error('Failed to resolve badge QR code', error, { code });
    return { notFound: true };
  }
  if (!data) return { notFound: true };

  const params = new URLSearchParams({
    utm_source: 'offline',
    utm_medium: 'qr_code',
    utm_campaign: 'zurichjs_networking',
  });
  return {
    redirect: {
      destination: `/share/${encodeURIComponent(data.target_public_id)}?${params.toString()}`,
      permanent: false,
    },
  };
};
