import { useMemo, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Globe2,
  Search,
  Users,
} from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import type { Ticket } from '@/components/admin/dashboard/types';
import {
  buildAudienceInsights,
  getAudienceTickets,
  getTicketCompany,
  getTicketCountry,
  getTicketRole,
  getTicketType,
  personResearchUrl,
  rolesForClipboard,
  ticketsToCsv,
  type AudienceDimension,
  type AudienceScope,
} from './audience-insights';

interface AudienceInsightsModalProps {
  tickets: Ticket[];
  onClose: () => void;
}

interface MetricCardProps {
  label: string;
  value: number;
  detail: string;
  icon: typeof Users;
}

function MetricCard({ label, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-black">{value}</p>
          <p className="mt-1 text-xs text-gray-600">{detail}</p>
        </div>
        <div className="rounded-lg bg-brand-primary/30 p-2 text-black">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function DimensionList({ items, emptyText }: { items: AudienceDimension[]; emptyText: string }) {
  if (items.length === 0) return <p className="py-4 text-sm text-gray-500">{emptyText}</p>;

  return (
    <div className="max-h-80 space-y-3 overflow-y-auto overscroll-contain pr-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-4 text-sm">
            <span className="truncate font-medium text-black" title={item.label}>{item.label}</span>
            <span className="shrink-0 text-gray-600">{item.count} · {item.percentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${item.percentage}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AudienceInsightsModal({ tickets, onClose }: AudienceInsightsModalProps) {
  const [scope, setScope] = useState<AudienceScope>('confirmed');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const audienceTickets = useMemo(() => getAudienceTickets(tickets, scope), [tickets, scope]);
  const insights = useMemo(() => buildAudienceInsights(audienceTickets), [audienceTickets]);
  const excludedCount = tickets.length - getAudienceTickets(tickets, 'confirmed').length;

  const visiblePeople = useMemo(() => {
    const query = peopleSearch.trim().toLocaleLowerCase();
    if (!query) return audienceTickets;
    return audienceTickets.filter((ticket) => [
      ticket.first_name,
      ticket.last_name,
      ticket.email,
      getTicketCompany(ticket),
      getTicketRole(ticket),
      getTicketCountry(ticket),
      getTicketType(ticket),
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  }, [audienceTickets, peopleSearch]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const copyText = async (text: string, successMessage: string) => {
    let copied = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      // Fall through to the selection-based fallback used by restricted browsers.
    }

    if (!copied) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      copied = document.execCommand('copy');
      textArea.remove();
    }

    showFeedback(copied ? successMessage : 'Copy failed. Your browser may be blocking clipboard access.');
  };

  const downloadCsv = () => {
    const blob = new Blob([ticketsToCsv(audienceTickets)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zurichjs-audience-${scope}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showFeedback('CSV downloaded.');
  };

  const roleList = rolesForClipboard(audienceTickets);

  return (
    <AdminModal
      title="Audience insights"
      description="Sponsor-ready overview of ticket holders"
      size="screen-xl"
      onClose={onClose}
      headerActions={feedback ? (
        <span role="status" className="hidden rounded-md bg-white/70 px-2 py-1 text-xs font-medium sm:inline">
          {feedback}
        </span>
      ) : null}
    >
      <div className="space-y-6">
        {feedback ? <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800 sm:hidden">{feedback}</p> : null}

        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-black">Audience scope</p>
            <p className="text-sm text-gray-600">
              Confirmed tickets best represent the expected audience. All records also includes cancelled and refunded tickets.
            </p>
          </div>
          <div className="flex shrink-0 rounded-lg border border-gray-300 bg-white p-1" aria-label="Audience scope">
            <button
              type="button"
              onClick={() => setScope('confirmed')}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium ${scope === 'confirmed' ? 'bg-brand-primary text-black' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Confirmed ({tickets.length - excludedCount})
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium ${scope === 'all' ? 'bg-brand-primary text-black' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              All records ({tickets.length})
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Audience" value={insights.attendeeCount} detail={scope === 'confirmed' ? 'Confirmed attendees' : 'Ticket records'} icon={Users} />
          <MetricCard label="Countries" value={insights.countryCount} detail="Reported locations" icon={Globe2} />
          <MetricCard label="Companies" value={insights.companyCount} detail="Unique employers" icon={BriefcaseBusiness} />
          <MetricCard label="Roles" value={insights.roleCount} detail="Unique raw titles" icon={BarChart3} />
          <MetricCard label="VIP access" value={insights.vipCount} detail="Includes after party" icon={Crown} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-black">Countries</h4>
                <p className="text-xs text-gray-500">Reported billing or checkout country</p>
              </div>
              <Globe2 className="size-5 text-gray-400" aria-hidden="true" />
            </div>
            <DimensionList items={insights.countries} emptyText="No country data is available." />
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-black">Companies</h4>
                <p className="text-xs text-gray-500">Reported employers</p>
              </div>
              <BriefcaseBusiness className="size-5 text-gray-400" aria-hidden="true" />
            </div>
            <DimensionList items={insights.companies} emptyText="No company data is available." />
          </div>
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-black">Ticket types</h4>
                <p className="text-xs text-gray-500">VIPs include after-party access</p>
              </div>
              <Crown className="size-5 text-gray-400" aria-hidden="true" />
            </div>
            <DimensionList items={insights.ticketTypes} emptyText="No ticket data is available." />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-bold text-black">Raw role titles</h4>
              <p className="text-sm text-gray-600">
                Copy the counted list into an LLM to group similar titles into sponsor-friendly role families.
              </p>
            </div>
            <button
              type="button"
              disabled={!roleList}
              onClick={() => copyText(roleList, 'Role list copied.')}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy role list
            </button>
          </div>
          <div className="grid max-h-80 gap-x-6 gap-y-3 overflow-y-auto overscroll-contain pr-2 sm:grid-cols-2 lg:grid-cols-3">
            {insights.roles.map((role) => (
              <div key={role.label} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 text-sm">
                <span className="truncate text-black" title={role.label}>{role.label}</span>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">{role.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h4 className="font-bold text-black">Attendee research & export</h4>
              <p className="text-sm text-gray-600">
                Search locally, or open a targeted Google query for public speaker and open-source signals. No profile data is written back.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copyText(ticketsToCsv(audienceTickets), 'CSV copied.')}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-black hover:bg-gray-50"
              >
                <Copy className="size-4" aria-hidden="true" /> Copy CSV
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-black hover:bg-brand-primary/80"
              >
                <Download className="size-4" aria-hidden="true" /> Download CSV
              </button>
            </div>
          </div>

          <label className="relative block">
            <span className="sr-only">Search attendees</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={peopleSearch}
              onChange={(event) => setPeopleSearch(event.target.value)}
              placeholder="Search name, email, company, role, country, or ticket type"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm text-black placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </label>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Attendee</th>
                  <th className="px-3 py-2 font-semibold">Role & company</th>
                  <th className="px-3 py-2 font-semibold">Country</th>
                  <th className="px-3 py-2 font-semibold">Ticket</th>
                  <th className="px-3 py-2 text-right font-semibold">Research</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiblePeople.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-3 py-3">
                      <p className="font-medium text-black">{ticket.first_name} {ticket.last_name}</p>
                      <p className="text-xs text-gray-500">{ticket.email}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      <p>{getTicketRole(ticket) ?? 'Role not provided'}</p>
                      <p className="text-xs text-gray-500">{getTicketCompany(ticket) ?? 'Company not provided'}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{getTicketCountry(ticket) ?? 'Not provided'}</td>
                    <td className="px-3 py-3 capitalize text-gray-700">{getTicketType(ticket)}</td>
                    <td className="px-3 py-3 text-right">
                      <a
                        href={personResearchUrl(ticket)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-black underline decoration-brand-primary decoration-2 underline-offset-2 hover:bg-gray-50"
                        aria-label={`Research ${ticket.first_name} ${ticket.last_name} on Google`}
                      >
                        Google <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visiblePeople.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No attendees match this search.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AdminModal>
  );
}

export type { AudienceInsightsModalProps };
