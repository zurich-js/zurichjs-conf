import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { colors } from '@/styles/tokens';

export interface DayTab {
  id: string;
  label: string;
  date: string;
}

export interface DayTabsProps {
  tabs: DayTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * DayTabs molecule component
 * Accessible tab list with keyboard navigation and animated indicator
 * Responsive: horizontal scroll on mobile, single row on desktop
 */
export const DayTabs: React.FC<DayTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [liveRegionText, setLiveRegionText] = useState('');
  const prefersReducedMotion = usePrefersReducedMotion();

  // Update indicator position when active tab changes
  useEffect(() => {
    const activeTabElement = tabRefs.current.get(activeTab);
    if (!activeTabElement || !containerRef.current) return;

    const updatePosition = () => {
      if (!activeTabElement || !containerRef.current) return;

      const scrollContainer = containerRef.current.querySelector('.overflow-x-auto') as HTMLElement;
      const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;

      // Use offsetLeft and subtract scroll position for accurate placement
      setIndicatorStyle({
        left: activeTabElement.offsetLeft - scrollLeft,
        width: activeTabElement.offsetWidth,
      });
    };

    // Initial position update
    updatePosition();

    const scrollContainer = containerRef.current.querySelector('.overflow-x-auto') as HTMLElement;

    // Add scroll listener to update indicator during scroll
    const handleScroll = () => {
      updatePosition();
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }

    // Scroll active tab into view on mobile - align to left edge
    if (window.innerWidth < 640 && scrollContainer) {
      const tabLeft = activeTabElement.offsetLeft;

      // Scroll so active tab is at the left edge
      scrollContainer.scrollTo({
        left: tabLeft,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });

      // Update position after scroll completes
      setTimeout(updatePosition, prefersReducedMotion ? 0 : 200);
    }

    // Update aria-live region
    const activeTabData = tabs.find((tab) => tab.id === activeTab);
    if (activeTabData) {
      setLiveRegionText(`${activeTabData.label}, ${activeTabData.date}, selected`);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeTab, tabs, prefersReducedMotion]);

  // Handle resize and recompute indicator position
  useEffect(() => {
    const updateIndicator = () => {
      if (!containerRef.current) return;

      // Recompute indicator position
      const activeTabElement = tabRefs.current.get(activeTab);
      if (activeTabElement) {
        const scrollContainer = containerRef.current.querySelector('.overflow-x-auto') as HTMLElement;
        const scrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;

        // Use offsetLeft and subtract scroll position for accurate placement
        setIndicatorStyle({
          left: activeTabElement.offsetLeft - scrollLeft,
          width: activeTabElement.offsetWidth,
        });
      }
    };

    updateIndicator();

    const scrollContainer = containerRef.current?.querySelector('.overflow-x-auto') as HTMLElement;

    // Add scroll listener to update indicator position during scroll
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateIndicator);
    }

    const resizeObserver = new ResizeObserver(updateIndicator);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateIndicator);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateIndicator);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
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
      case 'Enter':
      case ' ':
        e.preventDefault();
        onTabChange(tabs[currentIndex].id);
        return;
      default:
        return;
    }

    const targetTab = tabs[targetIndex];
    const targetElement = tabRefs.current.get(targetTab.id);
    if (targetElement) {
      targetElement.focus();
      onTabChange(targetTab.id);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full pt-8 ${className}`}
      style={
        {
          '--brandAccent': colors.brand.primary,
          '--brandPrimary': colors.brand.primary,
          '--textMuted': colors.text.muted,
        } as React.CSSProperties
      }
    >
      {/* Wrapper with bottom border (grey line) */}
      <div className="relative isolate w-full">
        <div
          className="absolute left-0 w-full z-10 bottom-0 h-[4px] bg-brand-gray-lightest pointer-events-none"
        />

        <div className="relative z-20 overflow-x-auto sm:overflow-visible -mb-1 scrollbar-hide w-full">
          {/* Tabs row - left aligned */}
          <div
            role="tablist"
            aria-label="Conference schedule by day"
            className="relative flex items-end gap-10"
          >
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) {
                      tabRefs.current.set(tab.id, el);
                    } else {
                      tabRefs.current.delete(tab.id);
                    }
                  }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="group relative shrink-0 py-2.5 outline-none min-h-[44px]
                  flex flex-col gap-2.5 items-start justify-center focus-visible:ring-2 focus-visible:ring-brand-yellow-main/40 focus-visible:ring-offset-2
                  focus-visible:ring-offset-white rounded-t-md transition-colors touch-manipulation"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Title */}
                  <span
                    className={`block leading-tight text-md xs:text-lg font-bold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-brand-black'
                        : 'text-brand-gray-light group-hover:text-brand-black group-active:text-brand-black'
                    }`}
                  >
                    {tab.label}
                  </span>

                  {/* Date sublabel */}
                  <span
                    className={`block leading-tight text-xs xs:text-sm whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-brand-black'
                        : 'text-brand-gray-light group-hover:text-brand-black group-active:text-brand-black'
                    }`}
                  >
                    {tab.date}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animated yellow indicator bar */}
        <div
          className="absolute z-30 bottom-0 h-[4px] rounded-full bg-[color:var(--brandAccent)] pointer-events-none"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            transition: prefersReducedMotion
              ? 'none'
              : 'left 160ms ease-out, width 160ms ease-out',
          }}
        />
      </div>

      {/* Aria-live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveRegionText}
      </div>
    </div>
  );
};

