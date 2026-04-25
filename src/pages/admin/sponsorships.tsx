/**
 * Sponsorships Admin Dashboard
 * Manage sponsors, sponsorship deals, and invoices
 */

import Head from 'next/head';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SponsorshipsTab } from '@/components/admin/sponsorships';

export default function SponsorshipsDashboard() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAdminAuth();

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Sponsorships" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-text-brand-gray-lightest text-black">
      <Head>
        <title>Sponsorships | ZurichJS Admin</title>
      </Head>

      <AdminHeader
        title="Sponsorships"
        subtitle="Manage sponsors, deals, and invoices"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <SponsorshipsTab />
      </main>
    </div>
  );
}
