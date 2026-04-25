import { AdminDashboardController } from '@/components/admin/controllers/AdminDashboardController';
import type { Tab } from '@/components/admin/dashboard';

const VALID_TABS = ['tickets', 'financials', 'b2b'] as const;

export const getServerSideProps = async ({ params }: { params?: { tab?: string } }) => {
  const tab = params?.tab;

  if (tab === 'issue') {
    return {
      redirect: {
        destination: '/admin/dashboard/tickets',
        permanent: false,
      },
    };
  }

  if (!tab || !VALID_TABS.includes(tab as Tab)) {
    return {
      redirect: {
        destination: '/admin/dashboard/tickets',
        permanent: false,
      },
    };
  }

  return { props: { tab } };
};

export default function AdminDashboardTabPage({ tab }: { tab: Tab }) {
  return <AdminDashboardController activeTab={tab} />;
}
