import { useState, type FormEvent } from 'react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { BadgeReviewRow } from '@/components/admin/badges/types';
import type { BadgeEntryOverride } from '@/lib/badges/overrides';

interface BadgeExportEditModalProps {
  entry: BadgeReviewRow;
  override?: BadgeEntryOverride;
  onClose: () => void;
  onReset: () => void;
  onSave: (value: BadgeEntryOverride) => void;
}

const INPUT_CLASS = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30';

export function BadgeExportEditModal({
  entry,
  override,
  onClose,
  onReset,
  onSave,
}: BadgeExportEditModalProps) {
  const [form, setForm] = useState<BadgeEntryOverride>(() => override ?? {
    firstName: entry.firstName,
    lastName: entry.lastName,
    role: entry.role,
    company: entry.company,
  });

  const update = <K extends keyof BadgeEntryOverride>(key: K, value: BadgeEntryOverride[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role.trim(),
      company: form.company.trim(),
    };
    if (!value.firstName) return;
    onSave(value);
  };

  return (
    <AdminModal
      title="Edit badge export"
      subtitle="Changes are saved only in this browser tab and applied to badge exports. The source database record is never updated."
      onClose={onClose}
      size="2xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Export-only edit for <span className="font-semibold">{entry.source === 'speaker' ? 'public speaker' : 'attendee'}</span>. QR and share-page identifiers stay unchanged.
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" required maxLength={120} value={form.firstName} onChange={(value) => update('firstName', value)} />
          <TextField label="Last name" maxLength={120} value={form.lastName} onChange={(value) => update('lastName', value)} />
          <TextField label="Role" maxLength={200} value={form.role} onChange={(value) => update('role', value)} />
          <TextField label="Company" maxLength={200} value={form.company} onChange={(value) => update('company', value)} />
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-gray-200 pt-4">
          <div>
            {override ? (
              <button type="button" onClick={onReset} className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">
                Discard temporary edit
              </button>
            ) : null}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-black hover:brightness-95">
              Save for export
            </button>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  required?: boolean;
}

function TextField({ label, value, onChange, maxLength, required = false }: TextFieldProps) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="text"
        maxLength={maxLength}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
    </label>
  );
}
