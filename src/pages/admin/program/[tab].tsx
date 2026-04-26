import { ProgramAdminController } from '@/components/admin/controllers/ProgramAdminController';

type ProgramAdminTab = 'sessions' | 'schedule' | 'speakers';

const VALID_TABS = ['sessions', 'schedule', 'speakers'] as const;

export const getServerSideProps = async ({ params }: { params?: { tab?: string } }) => {
  const tab = params?.tab;

  if (!tab || !VALID_TABS.includes(tab as ProgramAdminTab)) {
    return {
      redirect: {
        destination: '/admin/program/sessions',
        permanent: false,
      },
    };
  }

  return { props: { tab } };
};

export default function ProgramAdminTabPage({ tab }: { tab: ProgramAdminTab }) {
  return <ProgramAdminController activeTab={tab} />;
}
