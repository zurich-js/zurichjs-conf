/**
 * Sponsorships Admin Dashboard
 * Manage sponsors, sponsorship deals, and invoices
 */

import { AdminLayout } from '@/components/admin/AdminLayout';
import { SponsorshipsTab } from '@/components/admin/sponsorships';

export default function SponsorshipsDashboard() {
  return (
    <AdminLayout title="Sponsorships" headTitle="Sponsorships | ZurichJS Admin" contentClassName="py-4 sm:py-6">
      <SponsorshipsTab />
    </AdminLayout>
  );
}
