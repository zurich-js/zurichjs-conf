import { B2BOrdersTab } from '@/components/admin/B2BOrdersTab';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTabLayout } from '@/components/admin/AdminTabLayout';
import type { AdminTab } from '@/components/admin/AdminTabBar';
import { TicketsTab, FinancialsTab, type Tab } from '@/components/admin/dashboard';

const TABS: AdminTab<Tab>[] = [
  { id: 'tickets', label: 'Tickets', href: '/admin/dashboard/tickets' },
  { id: 'financials', label: 'Financials', href: '/admin/dashboard/financials' },
  { id: 'b2b', label: 'B2B Orders', href: '/admin/dashboard/b2b' },
];

export function AdminDashboardController({ activeTab }: { activeTab: Tab }) {
  return (
    <AdminLayout title="Admin Dashboard" headTitle="Admin Dashboard - ZurichJS Conference" contentClassName="mt-4 sm:mt-6">
      <AdminTabLayout tabs={TABS} activeTab={activeTab}>
        {activeTab === 'tickets' && <TicketsTab />}
        {activeTab === 'financials' && <FinancialsTab />}
        {activeTab === 'b2b' && <B2BOrdersTab />}
      </AdminTabLayout>
    </AdminLayout>
  );
}
