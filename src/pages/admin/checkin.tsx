/**
 * Door Check-In Admin
 *
 * Its own page rather than two more tabs on the dashboard index. The dashboard
 * is about tickets and money and is read all year; this is about the crew and the
 * queue and is read on two days. They have different audiences — a door lead
 * watching the live figures has no business scrolling past the financials — and
 * a separate route means it can be opened directly and left open on a laptop at
 * the door.
 */

import { useState } from 'react';
import Head from 'next/head';
import { Activity, ScanLine } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { DoorDashboardTab, DoorStaffTab } from '@/components/admin/checkin';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type DoorAdminTab = 'crew' | 'live';

const TABS: AdminTab<DoorAdminTab>[] = [
  { id: 'crew', label: 'Crew & roles', icon: ScanLine },
  { id: 'live', label: 'Live door', icon: Activity },
];

export default function DoorCheckInAdmin() {
  // Crew first: it is the only way anyone gains door access, and on the days
  // that matter it is what gets opened before the event rather than during it.
  const [activeTab, setActiveTab] = useState<DoorAdminTab>('crew');
  const { isAuthenticated, isLoading, logout } = useAdminAuth();

  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <>
      <Head>
        <title>Door Check-In - ZurichJS Conference</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader
          title="Door Check-In"
          subtitle="Crew, roles and the live queue"
          onLogout={logout}
        />
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:mt-6 sm:px-6 lg:px-8">
          <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="pb-12">
            {activeTab === 'crew' && <DoorStaffTab />}
            {activeTab === 'live' && <DoorDashboardTab />}
          </div>
        </div>
      </div>
    </>
  );
}
