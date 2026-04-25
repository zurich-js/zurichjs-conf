import { TravelAdminController } from '@/components/admin/controllers/TravelAdminController';
import type { TabType } from '@/components/admin/cfp-travel';

const VALID_TABS = ['overview', 'speakers', 'transportation', 'reimbursements'] as const;

export const getServerSideProps = async ({ params }: { params?: { tab?: string } }) => {
  const tab = params?.tab;

  if (!tab || !VALID_TABS.includes(tab as TabType)) {
    return {
      redirect: {
        destination: '/admin/travel/overview',
        permanent: false,
      },
    };
  }

  return { props: { tab } };
};

export default function TravelAdminTabPage({ tab }: { tab: TabType }) {
  return <TravelAdminController activeTab={tab} />;
}
