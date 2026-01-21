/**
 * CFP Tab Navigation Component
 * Desktop tabs and mobile dropdown for CFP admin sections
 */

import type { CfpTab } from '@/lib/types/cfp-admin';

interface TabNavigationProps {
  activeTab: CfpTab;
  setActiveTab: (tab: CfpTab) => void;
}

const TABS: CfpTab[] = ['submissions', 'speakers', 'reviewers', 'tags'];

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
  return (
    <div className="mb-6">
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as CfpTab)}
          className="block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-black"
        >
          <option value="submissions">Submissions</option>
          <option value="speakers">Speakers</option>
          <option value="reviewers">Reviewers</option>
          <option value="tags">Tags</option>
        </select>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer ${
                activeTab === tab ? 'bg-[#F1E271] text-black shadow-sm' : 'text-black hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
