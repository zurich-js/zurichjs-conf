import { useState, useCallback } from 'react';

/**
 * Hook for managing tab state
 * Provides controlled tab selection with keyboard navigation support
 */
export function useTabs<T extends string>(initialTab: T) {
  const [activeTab, setActiveTab] = useState<T>(initialTab);

  const handleTabChange = useCallback((tabId: T) => {
    setActiveTab(tabId);
  }, []);

  return {
    activeTab,
    setActiveTab: handleTabChange,
  };
}



