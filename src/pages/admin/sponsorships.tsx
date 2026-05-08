/**
 * Sponsorships Admin Dashboard
 * Manage sponsors, sponsorship deals, invoices, and sponsor quotes
 */

import { useState } from 'react';
import Head from 'next/head';
import { Building2, Calculator } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { SponsorshipsTab } from '@/components/admin/sponsorships';
import { SponsorQuoteBuilder } from '@/components/admin/sponsorships/quote';

type SponsorshipTab = 'sponsorships' | 'quotes';

const TABS: AdminTab<SponsorshipTab>[] = [
  { id: 'sponsorships', label: 'Sponsorships', icon: Building2 },
  { id: 'quotes', label: 'Quotes', icon: Calculator },
];

export default function SponsorshipsDashboard() {
  const [activeTab, setActiveTab] = useState<SponsorshipTab>('sponsorships');
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title="Sponsorships" />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black">
      <Head>
        <title>Sponsorships | ZurichJS Admin</title>
      </Head>

      <AdminHeader
        title="Sponsorships"
        subtitle="Manage sponsors, deals, and quotes"
        onLogout={logout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="pb-12">
          {activeTab === 'sponsorships' && <SponsorshipsTab />}
          {activeTab === 'quotes' && <SponsorQuoteBuilder />}
        </div>
      </div>
    </div>
  );
}
