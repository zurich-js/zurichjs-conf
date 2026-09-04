/**
 * Admin Dashboard
 * Password-protected admin panel for managing tickets and viewing financials
 *
 * Uses AdminQueryProvider for offline caching with localforage
 */

import { useState } from 'react';
import Head from 'next/head';
import { Ticket, PlusCircle, DollarSign, GraduationCap, Package } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { AdminQueryProvider } from '@/components/admin/AdminQueryProvider';
import { TicketsTab, IssueTab, FinancialsTab } from '@/components/admin/dashboard';
import { WorkshopsRegistrantsTab } from '@/components/admin/workshops-registrants';
import { VipPerksTab } from '@/components/admin/vip-perks';
import { ApparelTab } from '@/components/admin/apparel';
import { DiscountConfigTab } from '@/components/admin/discount';
import { CartBuilderTab } from '@/components/admin/cart-builder';
import { TicketStockTab } from '@/components/admin/ticket-stock';
import { useAdminAuth } from '@/hooks/useAdminAuth';

type Tab = 'tickets' | 'workshops' | 'issue' | 'commerce' | 'fulfillment';
type CommerceSubTab = 'financials' | 'stock' | 'discount' | 'cart-builder';
type FulfillmentSubTab = 'vip-perks' | 'apparel';

const TABS: AdminTab<Tab>[] = [
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'workshops', label: 'Workshops', icon: GraduationCap },
  { id: 'issue', label: 'Issue', icon: PlusCircle },
  { id: 'commerce', label: 'Commerce', icon: DollarSign },
  { id: 'fulfillment', label: 'Fulfillment', icon: Package },
];

const COMMERCE_SUBTABS: { id: CommerceSubTab; label: string }[] = [
  { id: 'financials', label: 'Financials' },
  { id: 'stock', label: 'Ticket Stock' },
  { id: 'discount', label: 'Discounts' },
  { id: 'cart-builder', label: 'Cart Builder' },
];

const FULFILLMENT_SUBTABS: { id: FulfillmentSubTab; label: string }[] = [
  { id: 'vip-perks', label: 'VIP Perks' },
  { id: 'apparel', label: 'Apparel' },
];

function SubTabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: T; label: string }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}) {
  return (
    <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
            activeTab === tab.id
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-600 hover:text-black'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function CommerceSection() {
  const [subTab, setSubTab] = useState<CommerceSubTab>('financials');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Commerce
            </h2>
            <p className="text-sm text-gray-500">Revenue, ticket stock, discounts, and sales tools</p>
          </div>
          <SubTabBar tabs={COMMERCE_SUBTABS} activeTab={subTab} onTabChange={setSubTab} />
        </div>
      </div>
      {subTab === 'financials' && <FinancialsTab />}
      {subTab === 'stock' && <TicketStockTab />}
      {subTab === 'discount' && <DiscountConfigTab />}
      {subTab === 'cart-builder' && <CartBuilderTab />}
    </div>
  );
}

function FulfillmentSection() {
  const [subTab, setSubTab] = useState<FulfillmentSubTab>('vip-perks');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Package className="w-5 h-5" />
              Fulfillment
            </h2>
            <p className="text-sm text-gray-500">VIP perks and apparel management</p>
          </div>
          <SubTabBar tabs={FULFILLMENT_SUBTABS} activeTab={subTab} onTabChange={setSubTab} />
        </div>
      </div>
      {subTab === 'vip-perks' && <VipPerksTab />}
      {subTab === 'apparel' && <ApparelTab />}
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('tickets');
  const { isAuthenticated, isLoading, logout } = useAdminAuth();

  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <AdminQueryProvider>
      <Head><title>Admin Dashboard - ZurichJS Conference</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AdminHeader title="Admin Dashboard" subtitle="ZurichJS Conference 2026" onLogout={logout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
          <AdminTabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="pb-12">
            {activeTab === 'tickets' && <TicketsTab />}
            {activeTab === 'workshops' && <WorkshopsRegistrantsTab />}
            {activeTab === 'issue' && <IssueTab />}
            {activeTab === 'commerce' && <CommerceSection />}
            {activeTab === 'fulfillment' && <FulfillmentSection />}
          </div>
        </div>
      </div>
    </AdminQueryProvider>
  );
}
