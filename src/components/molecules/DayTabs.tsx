import React, { useRef, KeyboardEvent } from 'react';
import { Tab } from '@/components/atoms/Tab';

export interface DayTab {
  id: string;
  label: string;
  date: string;
}

export interface DayTabsProps {
  tabs: DayTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/**
 * DayTabs molecule component
 * Accessible tab list with keyboard navigation
 * Displays tabs for different conference days
 */
export const DayTabs: React.FC<DayTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, currentIndex: number) => {
    let targetIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        targetIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    onTabChange(tabs[targetIndex].id);
  };

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Conference schedule by day"
      className="flex flex-wrap gap-2 sm:gap-0 border-b border-gray-200"
      onKeyDown={(e) => {
        const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
        handleKeyDown(e, currentIndex);
      }}
    >
      {tabs.map((tab, index) => (
        <Tab
          key={tab.id}
          id={tab.id}
          label={`${tab.label} – ${tab.date}`}
          isActive={activeTab === tab.id}
          onClick={onTabChange}
          index={index}
        />
      ))}
    </div>
  );
};

