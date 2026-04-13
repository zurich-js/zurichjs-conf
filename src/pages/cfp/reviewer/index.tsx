import type { GetServerSideProps } from 'next';
import { createSupabaseServerClient } from '@/lib/cfp/auth';

export default function ReviewerIndexPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabaseServer = createSupabaseServerClient(ctx);
  const { data: { user }, error } = await supabaseServer.auth.getUser();

  return {
    redirect: {
      destination: error || !user ? '/cfp/reviewer/login' : '/cfp/reviewer/dashboard',
      permanent: false,
    },
  };
};
