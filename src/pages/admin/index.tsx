/**
 * Admin Dashboard
 * Password-protected admin panel for managing tickets and viewing financials
 */

import { useState } from 'react';
import Head from 'next/head';
import { Ticket, PlusCircle, DollarSign, Building2, GraduationCap } from 'lucide-react';
import { B2BOrdersTab } from '@/components/admin/B2BOrdersTab';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { TicketsTab, IssueTicketTab, FinancialsTab, type Tab } from '@/components/admin/dashboard';
import { WorkshopsRegistrantsTab } from '@/components/admin/workshops-registrants';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const TABS: AdminTab<Tab>[] = [
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'workshops', label: 'Workshops', icon: GraduationCap },
  { id: 'issue', label: 'Issue', icon: PlusCircle },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'b2b', label: 'B2B Orders', icon: Building2 },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const { isAuthenticated, isLoading, logout } = useAdminAuth();

  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <>
      <Head><title>Admin Dashboard - ZurichJS Conference</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Admin Dashboard" subtitle="ZurichJS Conference 2026" onLogout={logout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="pb-12">
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'workshops' && <WorkshopsRegistrantsTab />}
            {activeTab === 'issue' && <IssueTicketTab />}
            {activeTab === 'financials' && <FinancialsTab />}
            {activeTab === 'b2b' && <B2BOrdersTab />}
          </div>
        </div>
      </div>
    </>
  );
}
