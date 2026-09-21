import { useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';
import {
  ADMIN_PRIVACY_BODY_CLASS,
  ADMIN_PRIVACY_STORAGE_KEY,
  observeAdminPii,
} from '@/lib/admin/privacy';

interface AdminPrivacyToggleProps {
  privacyEnabled: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

export function useAdminPrivacyMode(): { privacyEnabled: boolean; togglePrivacy: () => void } {
  const [privacyEnabled, setPrivacyEnabled] = useState(false);

  useEffect(() => {
    setPrivacyEnabled(window.localStorage.getItem(ADMIN_PRIVACY_STORAGE_KEY) === 'true');
  }, []);

  useEffect(() => {
    document.body.classList.toggle(ADMIN_PRIVACY_BODY_CLASS, privacyEnabled);
    if (!privacyEnabled) return;

    return observeAdminPii();
  }, [privacyEnabled]);

  useEffect(() => () => {
    document.body.classList.remove(ADMIN_PRIVACY_BODY_CLASS);
  }, []);

  const togglePrivacy = () => {
    const next = !privacyEnabled;
    window.localStorage.setItem(ADMIN_PRIVACY_STORAGE_KEY, String(next));
    setPrivacyEnabled(next);
  };

  return { privacyEnabled, togglePrivacy };
}

export default function AdminPrivacyToggle({
  privacyEnabled,
  onToggle,
  mobile = false,
}: AdminPrivacyToggleProps) {

  const label = privacyEnabled ? 'Show personal data' : 'Hide personal data';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={privacyEnabled}
      title={label}
      data-admin-privacy-control
      className={mobile
        ? `flex items-center justify-center p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all cursor-pointer ${privacyEnabled ? 'bg-brand-primary' : 'bg-gray-50 hover:bg-gray-100'}`
        : `inline-flex items-center justify-center p-2 border rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary ${privacyEnabled ? 'border-brand-primary bg-brand-primary text-black' : 'border-gray-300 text-black bg-white hover:bg-gray-50'}`}
    >
      <EyeOff className="w-5 h-5" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export type { AdminPrivacyToggleProps };
