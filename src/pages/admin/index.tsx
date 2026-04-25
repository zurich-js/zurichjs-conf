/**
 * Admin Dashboard
 * Password-protected admin panel for managing tickets and viewing financials
 */

import { useState } from 'react';
import Head from 'next/head';
import { B2BOrdersTab } from '@/components/admin/B2BOrdersTab';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { TicketsTab, IssueTicketTab, FinancialsTab, type Tab } from '@/components/admin/dashboard';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const TABS: AdminTab<Tab>[] = [
  { id: 'tickets', label: 'Tickets' },
  { id: 'issue', label: 'Issue' },
  { id: 'financials', label: 'Financials' },
  { id: 'b2b', label: 'B2B Orders' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <>
      <Head><title>Admin Dashboard - ZurichJS Conference</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-text-brand-gray-lightest">
        <AdminHeader title="Admin Dashboard" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="pb-12">
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'issue' && <IssueTicketTab />}
            {activeTab === 'financials' && <FinancialsTab />}
            {activeTab === 'b2b' && <B2BOrdersTab />}
          </div>
        </div>
      </div>
    </>
  );
}
