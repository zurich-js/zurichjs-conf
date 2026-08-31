import React, { useState } from 'react';
import { Check, Info, Minus } from 'lucide-react';
import {
  DOOR_ABILITIES,
  DOOR_ABILITY_GUIDE,
  DOOR_ROLES,
  DOOR_ROLE_DESCRIPTIONS,
  DOOR_ROLE_LABELS,
  DOOR_ROLE_LANE,
  roleCan,
  type DoorRole,
} from '@/lib/types/checkin';
import { useInviteDoorStaff } from '@/hooks/checkin/useDoorStaff';

export interface InviteDoorStaffFormProps {
  onInvited?: () => void;
  /** Lets the surrounding page highlight the same role in the comparison table. */
  onRoleChange?: (role: DoorRole) => void;
  className?: string;
}

/**
 * Invite a volunteer to the door crew.
 *
 * Mirrors InviteReviewerForm so the two invite flows stay recognisable to
 * whoever maintains them: same field order, same live role description, same
 * inline error handling.
 *
 * Defaults to `scanner`, the least privileged role. A lead has to be chosen
 * deliberately, because that role can admit people without a code and see
 * attendee contact details.
 */
export const InviteDoorStaffForm: React.FC<InviteDoorStaffFormProps> = ({
  onInvited,
  onRoleChange,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<DoorRole>('scanner');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const invite = useInviteDoorStaff();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setError('');
    setWarning('');

    invite.mutate(
      { email, name: name || undefined, role },
      {
        onSuccess: (data) => {
          setEmail('');
          setName('');
          setRole('scanner');
          onRoleChange?.('scanner');
          // The row is the access grant; a failed email is recoverable by
          // resending, so it is a warning rather than an error.
          if (data.warning) setWarning(data.warning);
          onInvited?.();
        },
        onError: (err: Error) => setError(err.message),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="door-staff-email" className="mb-1 block text-sm font-medium text-black">
            Email
          </label>
          <input
            id="door-staff-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="volunteer@example.com"
            required
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div>
          <label htmlFor="door-staff-name" className="mb-1 block text-sm font-medium text-black">
            Name (optional)
          </label>
          <input
            id="door-staff-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div>
          <label htmlFor="door-staff-role" className="mb-1 block text-sm font-medium text-black">
            Role
          </label>
          <select
            id="door-staff-role"
            value={role}
            onChange={(e) => {
              const next = e.target.value as DoorRole;
              setRole(next);
              onRoleChange?.(next);
            }}
            className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {DOOR_ROLES.map((value) => (
              <option key={value} value={value}>
                {DOOR_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* The permissions are the consequential part of this form, so the chosen
          role's actual experience is spelled out here rather than left to the
          role name. Derived from DOOR_ROLE_ABILITIES, so it cannot claim
          something the guard does not enforce. */}
      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-black">{DOOR_ROLE_LABELS[role]}</p>
            <p className="text-sm text-black">{DOOR_ROLE_DESCRIPTIONS[role]}</p>
            <p className="mt-1 text-xs font-medium text-gray-700">{DOOR_ROLE_LANE[role]}</p>

            <dl className="mt-2 space-y-1">
              {DOOR_ABILITIES.map((ability) => {
                const guide = DOOR_ABILITY_GUIDE[ability];
                const allowed = roleCan(role, ability);
                return (
                  <div key={ability} className="flex items-start gap-2 text-xs">
                    {allowed ? (
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-700"
                        aria-hidden="true"
                      />
                    ) : (
                      <Minus
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400"
                        aria-hidden="true"
                      />
                    )}
                    <dt className="sr-only">{allowed ? 'Can' : 'Cannot'}</dt>
                    <dd className={allowed ? 'text-gray-800' : 'text-gray-600'}>
                      <span className="font-medium">{guide.label}. </span>
                      {allowed ? guide.withIt : guide.withoutIt}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {warning ? (
        <p role="status" className="text-sm font-medium text-orange-600">
          {warning}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={invite.isPending}
          className="cursor-pointer rounded-lg bg-brand-primary px-4 py-2 font-medium text-black transition-all hover:bg-[#e8d95e] disabled:opacity-50"
        >
          {invite.isPending ? 'Sending invite…' : 'Send invite'}
        </button>
        <p className="text-xs text-gray-600">
          Ask them to sign in the evening before, not at the door.
        </p>
      </div>
    </form>
  );
};
