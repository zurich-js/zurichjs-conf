/**
 * Admin Volunteers Dashboard
 * Manage volunteer roles, applications, and team profiles
 */

import { useState } from 'react';
import Head from 'next/head';
import { BarChart3, Briefcase, FileText, Users } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import {
  VolunteerOverviewStats,
  VolunteerRolesTab,
  VolunteerApplicationsTab,
  VolunteerTeamTab,
} from '@/components/admin/volunteers';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type VolunteerTab = 'overview' | 'roles' | 'applications' | 'team';

const TABS: AdminTab<VolunteerTab>[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'roles', label: 'Roles', icon: Briefcase },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'team', label: 'Team', icon: Users },
];

export default function VolunteersDashboard() {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<VolunteerTab>('overview');

  if (isAuthLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black">
      <Head>
        <title>Volunteers | ZurichJS Admin</title>
      </Head>

      <AdminHeader
        title="Volunteers"
        subtitle="Manage volunteer roles and applications"
        onLogout={logout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
        <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="pb-12">
          {activeTab === 'overview' && <VolunteerOverviewStats />}
          {activeTab === 'roles' && <VolunteerRolesTab />}
          {activeTab === 'applications' && <VolunteerApplicationsTab />}
          {activeTab === 'team' && <VolunteerTeamTab />}
        </div>
      </div>
    </div>
  );
}
