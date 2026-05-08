/**
 * B2B Admin Page
 * Top-level admin page for B2B invoicing and quote generation
 */

import { useState } from 'react';
import Head from 'next/head';
import { FileText, Calculator } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { B2BOrdersTab } from '@/components/admin/b2b';
import { QuoteBuilder } from '@/components/admin/b2b/quote';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type B2BTab = 'invoices' | 'quotes';

const TABS: AdminTab<B2BTab>[] = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'quotes', label: 'Quotes', icon: Calculator },
];

export default function B2BAdminPage() {
  const [activeTab, setActiveTab] = useState<B2BTab>('invoices');
  const { isAuthenticated, isLoading, logout } = useAdminAuth();

  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <>
      <Head><title>B2B — ZurichJS Admin</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="B2B" subtitle="Invoices & Quotes" onLogout={logout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="pb-12">
            {activeTab === 'invoices' && <B2BOrdersTab />}
            {activeTab === 'quotes' && <QuoteBuilder />}
          </div>
        </div>
      </div>
    </>
  );
}
