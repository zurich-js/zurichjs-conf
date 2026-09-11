import Head from 'next/head';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { NetworkingDirectoryPanel } from '@/components/admin/networking';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function NetworkingAdminPage() {
  const { isAuthenticated, isLoading, logout } = useAdminAuth();
  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Networking Admin" />;

  return (
    <>
      <Head><title>Networking - ZurichJS Admin</title></Head>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader
          title="Networking"
          subtitle="Who has enabled conference networking"
          onLogout={logout}
        />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <NetworkingDirectoryPanel />
        </main>
      </div>
    </>
  );
}
