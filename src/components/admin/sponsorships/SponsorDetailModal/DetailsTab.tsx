/**
 * Sponsor Detail Modal - Details Tab
 */

import { useState, useEffect } from 'react';
import { Building2, User, MapPin, ChevronRight, Edit2, Check, Globe } from 'lucide-react';
import type { SponsorshipDealWithRelations, SponsorshipDealStatus } from '../types';
import { VALID_DEAL_STATUS_TRANSITIONS } from '@/lib/types/sponsorship';
import { LogoUpload } from '../LogoUpload';
import { formatAmount, getInitialEditForm, apiCall, type EditFormData } from './types';

interface DetailsTabProps {
  deal: SponsorshipDealWithRelations;
  onUpdate: () => void;
  isUpdating: boolean;
  setIsUpdating: (b: boolean) => void;
  setError: (e: string | null) => void;
}

export function DetailsTab({ deal, onUpdate, isUpdating, setIsUpdating, setError }: DetailsTabProps) {
  const { sponsor, tier, line_items } = deal;
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>(getInitialEditForm(sponsor));

  useEffect(() => {
    if (isEditing) setEditForm(getInitialEditForm(sponsor));
  }, [isEditing, sponsor]);

  const allowedTransitions = VALID_DEAL_STATUS_TRANSITIONS[deal.status as SponsorshipDealStatus] || [];

  // Calculate totals
  const tierBase = line_items.filter(li => li.type === 'tier_base').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const addons = line_items.filter(li => li.type === 'addon').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const adjustments = line_items.filter(li => li.type === 'adjustment').reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const creditAvailable = deal.currency === 'CHF' ? tier.addon_credit_chf : tier.addon_credit_eur;
  const creditableAddons = line_items.filter(li => li.type === 'addon' && li.uses_credit).reduce((sum, li) => sum + li.unit_price * li.quantity, 0);
  const creditApplied = Math.min(creditAvailable, creditableAddons);
  const subtotal = tierBase + addons;
  const total = Math.max(0, subtotal - creditApplied + adjustments);

  const handleStatusChange = async (newStatus: SponsorshipDealStatus) => {
    const paidBy = newStatus === 'paid' ? 'Admin' : undefined;
    await apiCall(`/api/admin/sponsorships/deals/${deal.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, paidBy }),
    }, setError, setIsUpdating, onUpdate);
  };

  const handleToggleLogoPublic = async () => {
    await apiCall(`/api/admin/sponsorships/${sponsor.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLogoPublic: !sponsor.is_logo_public }),
    }, setError, setIsUpdating, onUpdate);
  };

  const handleSaveSponsorDetails = async () => {
    await apiCall(`/api/admin/sponsorships/${sponsor.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: editForm.companyName,
        companyWebsite: editForm.companyWebsite || null,
        vatId: editForm.vatId || null,
        contactName: editForm.contactName,
        contactEmail: editForm.contactEmail,
        contactPhone: editForm.contactPhone || null,
        billingAddress: {
          street: editForm.billingAddressStreet,
          city: editForm.billingAddressCity,
          postalCode: editForm.billingAddressPostalCode,
          country: editForm.billingAddressCountry,
        },
        internalNotes: editForm.internalNotes || null,
      }),
    }, setError, setIsUpdating, onUpdate);
    setIsEditing(false);
  };

  const updateEditForm = (field: keyof EditFormData, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Status Actions */}
      {allowedTransitions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Next Steps</h3>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdating}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  status === 'cancelled'
                    ? 'bg-white border border-red-300 text-red-700 hover:bg-red-50'
                    : 'bg-[#F1E271] text-black hover:bg-[#e6d766]'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
                Move to {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sponsor Info */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Sponsor Information</h3>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
              <Edit2 className="h-4 w-4" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(false)} disabled={isUpdating} className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded">Cancel</button>
              <button onClick={handleSaveSponsorDetails} disabled={isUpdating} className="text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e6d766] px-3 py-1 rounded flex items-center gap-1 disabled:opacity-50">
                <Check className="h-4 w-4" /> Save
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <EditForm form={editForm} onChange={updateEditForm} />
        ) : (
          <ReadOnlyView sponsor={sponsor} />
        )}
      </div>

      {/* Deal Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Sponsorship Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-2xl font-bold capitalize">{tier.name}</span>
              <span className="ml-2 text-gray-500">Tier</span>
            </div>
            <span className="text-sm text-gray-500">{deal.currency}</span>
          </div>

          <div className="space-y-2 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm"><span>Base Price</span><span>{formatAmount(tierBase, deal.currency)}</span></div>
            {addons > 0 && <div className="flex justify-between text-sm"><span>Add-ons</span><span>{formatAmount(addons, deal.currency)}</span></div>}
            {creditApplied > 0 && <div className="flex justify-between text-sm text-green-600"><span>Credit Applied</span><span>-{formatAmount(creditApplied, deal.currency)}</span></div>}
            {adjustments !== 0 && <div className="flex justify-between text-sm"><span>Adjustments</span><span>{formatAmount(adjustments, deal.currency)}</span></div>}
            <div className="flex justify-between font-bold pt-2 border-t border-gray-200"><span>Total</span><span>{formatAmount(total, deal.currency)}</span></div>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <LogoUpload sponsorId={sponsor.id} currentLogoUrl={sponsor.logo_url} onUpdate={onUpdate} />

      {/* Logo Visibility */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Public Visibility</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Show logo on website</p>
              <p className="text-xs text-gray-500">Display sponsor logo on the public homepage</p>
            </div>
            <button
              onClick={handleToggleLogoPublic}
              disabled={!sponsor.logo_url || isUpdating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                sponsor.is_logo_public ? 'bg-[#F1E271]' : 'bg-gray-200'
              } ${!sponsor.logo_url || isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sponsor.is_logo_public ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </label>
          {!sponsor.logo_url && <p className="text-xs text-amber-600 mt-2">Upload a logo first to enable public display</p>}
        </div>
      </div>
    </div>
  );
}

function EditForm({ form, onChange }: { form: EditFormData; onChange: (field: keyof EditFormData, value: string) => void }) {
  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent";

  return (
    <div className="space-y-6">
      <FormSection title="Company" icon={Building2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input type="text" required value={form.companyName} onChange={(e) => onChange('companyName', e.target.value)} className={inputClass} />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input type="url" value={form.companyWebsite} onChange={(e) => onChange('companyWebsite', e.target.value)} className={inputClass} placeholder="https://example.com" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">VAT ID</label><input type="text" value={form.vatId} onChange={(e) => onChange('vatId', e.target.value)} className={inputClass} placeholder="CHE-123.456.789" /></div>
        </div>
      </FormSection>

      <FormSection title="Contact Person" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label><input type="text" required value={form.contactName} onChange={(e) => onChange('contactName', e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" required value={form.contactEmail} onChange={(e) => onChange('contactEmail', e.target.value)} className={inputClass} /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" value={form.contactPhone} onChange={(e) => onChange('contactPhone', e.target.value)} className={inputClass} placeholder="+41 44 123 45 67" /></div>
        </div>
      </FormSection>

      <FormSection title="Billing Address" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Street *</label><input type="text" required value={form.billingAddressStreet} onChange={(e) => onChange('billingAddressStreet', e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">City *</label><input type="text" required value={form.billingAddressCity} onChange={(e) => onChange('billingAddressCity', e.target.value)} className={inputClass} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label><input type="text" required value={form.billingAddressPostalCode} onChange={(e) => onChange('billingAddressPostalCode', e.target.value)} className={inputClass} /></div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Country *</label><input type="text" required value={form.billingAddressCountry} onChange={(e) => onChange('billingAddressCountry', e.target.value)} className={inputClass} /></div>
        </div>
      </FormSection>

      <div className="space-y-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase">Internal Notes</h4>
        <textarea value={form.internalNotes} onChange={(e) => onChange('internalNotes', e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="Add any internal notes (not visible on invoices)" />
      </div>
    </div>
  );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{title}</h4>
      {children}
    </div>
  );
}

function ReadOnlyView({ sponsor }: { sponsor: SponsorshipDealWithRelations['sponsor'] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />Company</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">{sponsor.company_name}</p>
          {sponsor.company_website && <a href={sponsor.company_website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{sponsor.company_website}</a>}
          {sponsor.vat_id && <p className="text-sm text-gray-600">VAT: {sponsor.vat_id}</p>}
        </div>
        <h4 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2 pt-2"><User className="h-3.5 w-3.5" />Contact</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">{sponsor.contact_name}</p>
          <p className="text-sm text-gray-600">{sponsor.contact_email}</p>
          {sponsor.contact_phone && <p className="text-sm text-gray-600">{sponsor.contact_phone}</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />Billing Address</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
          <p className="text-sm">{sponsor.billing_address_street}</p>
          <p className="text-sm">{sponsor.billing_address_postal_code} {sponsor.billing_address_city}</p>
          <p className="text-sm">{sponsor.billing_address_country}</p>
        </div>
        {sponsor.internal_notes && (
          <>
            <h4 className="text-xs font-medium text-gray-500 uppercase pt-2">Internal Notes</h4>
            <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-600 whitespace-pre-wrap">{sponsor.internal_notes}</p></div>
          </>
        )}
      </div>
    </div>
  );
}
