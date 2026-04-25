import { CfpAdminController } from '@/components/admin/controllers/CfpAdminController';
import type { CfpTab } from '@/lib/types/cfp-admin';

const VALID_TABS = ['submissions', 'speakers', 'reviewers', 'tags', 'insights', 'analytics'] as const;

export const getServerSideProps = async ({ params }: { params?: { tab?: string } }) => {
  const tab = params?.tab;

  if (!tab || !VALID_TABS.includes(tab as CfpTab)) {
    return {
      redirect: {
        destination: '/admin/cfp/submissions',
        permanent: false,
      },
    };
  }

  return { props: { tab } };
};

export default function CfpAdminTabPage({ tab }: { tab: CfpTab }) {
  return <CfpAdminController activeTab={tab} />;
}
