import Head from 'next/head';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { BadgeManagementPanel } from '@/components/admin/badges';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function BadgeAdminPage() {
  const { isAuthenticated, isLoading, logout } = useAdminAuth();
  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Badge Admin" />;

  return (
    <>
      <Head><title>Badge Admin - ZurichJS</title></Head>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader
          title="Badge Admin"
          onLogout={logout}
        />
        <main className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8">
          <BadgeManagementPanel />
        </main>
      </div>
    </>
  );
}
