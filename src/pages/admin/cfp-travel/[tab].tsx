import type { TabType } from '@/components/admin/cfp-travel';

const LEGACY_TAB_MAP = {
  flights: 'transportation',
  overview: 'overview',
  speakers: 'speakers',
  transportation: 'transportation',
  reimbursements: 'reimbursements',
} as const;

type LegacyTab = keyof typeof LEGACY_TAB_MAP;

export const getServerSideProps = async ({
  params,
  query,
}: {
  params?: { tab?: string };
  query?: Record<string, string | string[] | undefined>;
}) => {
  const tab = params?.tab;
  const mappedTab = tab ? LEGACY_TAB_MAP[tab as LegacyTab] : null;

  if (!mappedTab) {
    return {
      redirect: {
        destination: '/admin/travel/overview',
        permanent: false,
      },
    };
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (key === 'tab' || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }
    } else {
      searchParams.set(key, value);
    }
  }

  const search = searchParams.toString();

  return {
    redirect: {
      destination: `/admin/travel/${mappedTab as TabType}${search ? `?${search}` : ''}`,
      permanent: false,
    },
  };
};

export default function LegacyTravelAdminTabRedirect() {
  return null;
}
