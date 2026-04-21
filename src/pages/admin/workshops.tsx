/**
 * Workshops Admin Dashboard
 * Thin page shell — all logic lives in src/components/admin/workshops/.
 */

import Head from 'next/head';

import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { WorkshopsDashboard } from '@/components/admin/workshops/WorkshopsDashboard';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function AdminWorkshopsPage() {
  const { isAuthenticated, isLoading, logout } = useAdminAuth();
  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Workshops" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black">
      <Head>
        <title>Workshops | ZurichJS Admin</title>
      </Head>
      <AdminHeader
        title="Workshops"
        subtitle="Manage sellable workshop offerings"
        onLogout={logout}
      />
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <WorkshopsDashboard />
      </main>
    </div>
  );
}
