/**
 * CFP Tab Navigation Component
 * Desktop tabs and mobile dropdown for CFP admin sections
 */

import type { CfpTab } from '@/lib/types/cfp-admin';

interface TabNavigationProps {
  activeTab: CfpTab;
  setActiveTab: (tab: CfpTab) => void;
}

const TABS: Array<{ key: CfpTab; label: string }> = [
  { key: 'submissions', label: 'Submissions' },
  { key: 'speakers', label: 'Speakers' },
  { key: 'reviewers', label: 'Reviewers' },
  { key: 'tags', label: 'Tags' },
  { key: 'insights', label: 'Insights' },
  { key: 'analytics', label: 'Analytics' },
];

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="mb-6">
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as CfpTab)}
          className="block w-full rounded-lg border border-brand-gray-lightest bg-white px-4 py-3 text-sm font-medium text-black"
        >
          {TABS.map((tab) => (
            <option key={tab.key} value={tab.key}>{tab.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="bg-white rounded-lg shadow-sm border border-brand-gray-lightest p-1 inline-flex space-x-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer ${
                activeTab === tab.key ? 'bg-brand-primary text-black shadow-sm' : 'text-black hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
