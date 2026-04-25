/**
 * Shared Admin Tab Bar
 * Desktop pill tabs + mobile dropdown, consistent across all admin pages
 */

export interface AdminTab<T extends string = string> {
  id: T;
  label: string;
}

interface AdminTabBarProps<T extends string> {
  tabs: AdminTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export function AdminTabBar<T extends string>({ tabs, activeTab, onTabChange }: AdminTabBarProps<T>) {
  return (
    <div className="mb-6">
      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <select
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value as T)}
          className="block w-full rounded-lg border border-gray-200 bg-white pl-4 pr-10 py-3 text-sm font-medium text-black shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary focus:outline-none appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:block">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 inline-flex space-x-1">
          {tabs.map((tab) => {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-black shadow-sm'
                    : 'text-gray-600 hover:text-black hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
