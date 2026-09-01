import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';

const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn(() => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: mockMaybeSingle,
  };
  return builder;
});

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({ from: mockFrom }),
}));
vi.mock('@/lib/logger', () => ({
  logger: { scope: () => ({ error: vi.fn() }) },
}));

import { getServerSideProps } from '../../../pages/b/[code]';

function context(code: string): GetServerSidePropsContext {
  return {
    params: { code },
    query: {},
    req: {} as GetServerSidePropsContext['req'],
    res: { setHeader: vi.fn() } as unknown as GetServerSidePropsContext['res'],
    resolvedUrl: `/b/${code}`,
    locale: undefined,
    locales: undefined,
    defaultLocale: undefined,
  };
}

async function invoke(code: string): Promise<GetServerSidePropsResult<Record<string, never>>> {
  return getServerSideProps(context(code)) as Promise<GetServerSidePropsResult<Record<string, never>>>;
}

describe('badge QR redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({
      data: { target_public_id: 'attendee-11111111-2222-4333-8444-555555555555' },
      error: null,
    });
  });

  it('rejects malformed and rotated-away codes', async () => {
    expect(await invoke('not-a-code')).toEqual({ notFound: true });
    expect(mockFrom).not.toHaveBeenCalled();

    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await invoke('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toEqual({ notFound: true });
  });

  it('redirects a managed badge token to the stable share page', async () => {
    const result = await invoke('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(result).toEqual({
      redirect: {
        destination: '/share/attendee-11111111-2222-4333-8444-555555555555?utm_source=offline&utm_medium=qr_code&utm_campaign=zurichjs_networking',
        permanent: false,
      },
    });
    expect(mockFrom).toHaveBeenCalledWith('badge_qr_codes');
  });
});
