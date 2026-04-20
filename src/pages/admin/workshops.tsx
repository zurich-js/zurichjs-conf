/**
 * Admin Workshops Page
 * Manage workshops: CRUD, instructor linking, pricing, Stripe sync, bookings
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminHeader from '@/components/admin/AdminHeader';
import { WorkshopListTab, WorkshopFormModal, WorkshopBookingsTab } from '@/components/admin/workshops';
import type { WorkshopFormData } from '@/components/admin/workshops';
import type { WorkshopDetail, WorkshopBooking } from '@/lib/types/workshop';

type Tab = 'workshops' | 'bookings';

export default function AdminWorkshopsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('workshops');

  // Data
  const [workshops, setWorkshops] = useState<WorkshopDetail[]>([]);
  const [bookings, setBookings] = useState<WorkshopBooking[]>([]);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<WorkshopDetail | null>(null);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/verify');
      if (response.ok) {
        setIsAuthenticated(true);
        fetchData();
      }
    } catch (err) { console.error('Auth check failed:', err); }
    finally { setIsLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        setIsAuthenticated(true);
        setPassword('');
        fetchData();
      } else { setError('Invalid password'); }
    } catch { setError('Login failed.'); }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      router.reload();
    } catch (err) { console.error('Logout failed:', err); }
  };

  const fetchData = useCallback(async () => {
    try {
      const [workshopsRes, bookingsRes] = await Promise.all([
        fetch('/api/admin/workshops'),
        fetch('/api/admin/workshops/bookings'),
      ]);
      if (workshopsRes.ok) {
        const data = await workshopsRes.json();
        setWorkshops(data.workshops || []);
      }
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  const handleSaveWorkshop = async (formData: WorkshopFormData) => {
    const isEdit = !!editingWorkshop;
    const url = isEdit
      ? `/api/admin/workshops/${editingWorkshop.id}`
      : '/api/admin/workshops';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save workshop');
    }

    await fetchData();
  };

  const handleDeleteWorkshop = async (workshopId: string) => {
    if (!confirm('Are you sure you want to delete this workshop?')) return;
    try {
      const res = await fetch(`/api/admin/workshops/${workshopId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
        return;
      }
      await fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleTogglePublish = async (workshop: WorkshopDetail) => {
    const newStatus = workshop.status === 'published' ? 'draft' : 'published';
    try {
      await fetch(`/api/admin/workshops/${workshop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchData();
    } catch (err) {
      console.error('Toggle publish failed:', err);
    }
  };

  const handleStripeSync = async (workshopId: string) => {
    try {
      const res = await fetch('/api/admin/workshops/stripe-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshop_id: workshopId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Stripe sync failed');
        return;
      }
      alert('Stripe product and price created successfully!');
      await fetchData();
    } catch (err) {
      console.error('Stripe sync failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          <p className="text-lg font-medium text-gray-900">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Head><title>Admin Login - Workshops</title></Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-black">Admin Dashboard</h2>
                <p className="mt-2 text-sm text-gray-600">Workshops Management</p>
              </div>
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-black mb-2">Password</label>
                  <input id="password" type="password" required autoFocus
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#F1E271]"
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3"><p className="text-sm text-red-800">{error}</p></div>}
                <button type="submit" className="w-full py-3 px-4 rounded-lg text-black bg-[#F1E271] hover:bg-[#e8d95e] font-medium">Sign in</button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'workshops', label: 'Workshops' },
    { key: 'bookings', label: 'Bookings' },
  ];

  return (
    <>
      <Head><title>Workshops Admin - ZurichJS Conference</title></Head>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader title="Workshops" subtitle="Zurich Engineering Day Management" onLogout={handleLogout} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#F1E271] text-black'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'workshops' && (
            <WorkshopListTab
              workshops={workshops}
              onRefresh={fetchData}
              onCreateNew={() => { setEditingWorkshop(null); setShowForm(true); }}
              onEdit={w => { setEditingWorkshop(w); setShowForm(true); }}
              onDelete={handleDeleteWorkshop}
              onTogglePublish={handleTogglePublish}
              onStripeSync={handleStripeSync}
            />
          )}

          {activeTab === 'bookings' && (
            <WorkshopBookingsTab
              bookings={bookings}
              workshops={workshops.map(w => ({ id: w.id, title: w.title }))}
              onRefresh={fetchData}
            />
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <WorkshopFormModal
            workshop={editingWorkshop}
            onClose={() => { setShowForm(false); setEditingWorkshop(null); }}
            onSave={handleSaveWorkshop}
          />
        )}
      </div>
    </>
  );
}
