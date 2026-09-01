import React from 'react';
import { Check, Minus } from 'lucide-react';
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

export interface DoorRoleGuideProps {
  /** Highlighted column, e.g. the role currently selected in the invite form. */
  highlight?: DoorRole | null;
  className?: string;
}

/**
 * What actually changes for a volunteer, per role.
 *
 * DRIVEN BY `DOOR_ROLE_ABILITIES`, not written out by hand. That table is the
 * same one the door UI reads to decide which controls to render and the same one
 * the API guard reads to decide what to refuse, so this cannot describe a
 * permission the system does not enforce — the usual failure of a documented
 * matrix.
 *
 * Phrased as experience rather than permission. "Cannot manually admit" tells an
 * organiser nothing; "the reason box and the Admit button are absent, so they
 * have to fetch a lead" tells them whether this volunteer can work alone.
 */
export const DoorRoleGuide: React.FC<DoorRoleGuideProps> = ({
  highlight = null,
  className = '',
}) => (
  <div className={`space-y-4 ${className}`}>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {DOOR_ROLES.map((role) => (
        <div
          key={role}
          className={`rounded-xl border p-4 ${
            highlight === role
              ? 'border-brand-primary bg-yellow-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <p className="text-sm font-semibold text-black">{DOOR_ROLE_LABELS[role]}</p>
          <p className="mt-1 text-xs font-medium text-gray-700">{DOOR_ROLE_LANE[role]}</p>
          <p className="mt-2 text-sm text-gray-800">{DOOR_ROLE_DESCRIPTIONS[role]}</p>
        </div>
      ))}
    </div>

    {/* Mobile Card View - stacked abilities with inline role permissions */}
    <div className="space-y-3 md:hidden">
      {DOOR_ABILITIES.map((ability) => {
        const guide = DOOR_ABILITY_GUIDE[ability];
        return (
          <div
            key={ability}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="mb-2 text-sm font-medium text-black">{guide.label}</p>
            <p className="mb-1 text-xs text-gray-700">
              <span className="font-medium">With it:</span> {guide.withIt}
            </p>
            <p className="mb-3 text-xs text-gray-600">
              <span className="font-medium">Without it:</span> {guide.withoutIt}
            </p>
            <div className="flex gap-2">
              {DOOR_ROLES.map((role) => {
                const allowed = roleCan(role, ability);
                return (
                  <div
                    key={role}
                    className={`flex flex-1 flex-col items-center rounded-lg px-2 py-2 ${
                      highlight === role
                        ? 'border border-brand-primary bg-yellow-50'
                        : 'border border-gray-100 bg-gray-50'
                    }`}
                  >
                    <span className="mb-1 text-[10px] font-medium text-gray-600">
                      {DOOR_ROLE_LABELS[role]}
                    </span>
                    {allowed ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-medium">Yes</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Minus className="h-4 w-4" aria-hidden="true" />
                        <span className="text-xs font-medium">No</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>

    {/* Desktop Table View */}
    <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
      <table className="min-w-full divide-y divide-gray-200">
        <caption className="sr-only">
          What each door role can do, and what the volunteer sees either way
        </caption>
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              On their screen
            </th>
            {DOOR_ROLES.map((role) => (
              <th
                key={role}
                scope="col"
                className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                  highlight === role ? 'bg-yellow-50 text-black' : 'text-gray-600'
                }`}
              >
                {DOOR_ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {DOOR_ABILITIES.map((ability) => {
            const guide = DOOR_ABILITY_GUIDE[ability];
            return (
              <tr key={ability}>
                <th scope="row" className="px-4 py-3 text-left align-top">
                  <span className="block text-sm font-medium text-black">{guide.label}</span>
                  <span className="mt-1 block text-xs text-gray-700">
                    <span className="font-medium">With it:</span> {guide.withIt}
                  </span>
                  <span className="mt-1 block text-xs text-gray-600">
                    <span className="font-medium">Without it:</span> {guide.withoutIt}
                  </span>
                </th>
                {DOOR_ROLES.map((role) => {
                  const allowed = roleCan(role, ability);
                  return (
                    <td
                      key={role}
                      className={`px-3 py-3 text-center align-top ${
                        highlight === role ? 'bg-yellow-50' : ''
                      }`}
                    >
                      {allowed ? (
                        <span className="inline-flex flex-col items-center gap-0.5 text-green-700">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span className="text-[11px] font-medium">Yes</span>
                        </span>
                      ) : (
                        <span className="inline-flex flex-col items-center gap-0.5 text-gray-400">
                          <Minus className="h-4 w-4" aria-hidden="true" />
                          <span className="text-[11px] font-medium">No</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <p className="text-xs text-gray-600">
      {/* Says out loud that the UI is not the security boundary, so nobody reads
          this table as the only thing standing between a role and an action. */}
      Enforced in the database, not just hidden on screen — a volunteer who
      reaches an action their role does not have is refused server-side. Roles can
      be changed at any time, including mid-event, and take effect on the
      volunteer&rsquo;s next action.
    </p>
  </div>
);
