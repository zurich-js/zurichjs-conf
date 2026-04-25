import Link from 'next/link';
import { useRouter } from 'next/router';

export interface AdminTab<T extends string = string> {
  id: T;
  label: string;
  href: string;
}

interface AdminTabBarProps<T extends string> {
  tabs: AdminTab<T>[];
  activeTab: T;
}

export function AdminTabBar<T extends string>({ tabs, activeTab }: AdminTabBarProps<T>) {
  const router = useRouter();
  const activeHref = tabs.find((tab) => tab.id === activeTab)?.href ?? tabs[0]?.href ?? '';

  return (
    <div className="mb-6">
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <select
          value={activeHref}
          onChange={(e) => router.push(e.target.value)}
          className="block w-full rounded-lg border border-brand-gray-lightest bg-white pl-4 pr-10 py-3 text-sm font-medium text-black shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.href}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="inline-flex min-h-[52px] rounded-xl border border-brand-gray-lightest bg-white p-1 shadow-sm">
          {tabs.map((tab) => {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex min-h-[42px] items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-black shadow-sm'
                    : 'text-brand-gray-dark hover:text-black hover:bg-gray-50'
                }`}
              >
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
