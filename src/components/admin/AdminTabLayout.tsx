import type { ReactNode } from 'react';
import { AdminTabBar, type AdminTab } from '@/components/admin/AdminTabBar';
import { AdminOverviewCards, type AdminOverviewCardItem } from '@/components/admin/common';

export type AdminOverviewCard = AdminOverviewCardItem;

interface AdminTabLayoutProps<T extends string> {
  tabs: AdminTab<T>[];
  activeTab: T;
  overview?: ReactNode;
  overviewCards?: AdminOverviewCard[];
  isOverviewLoading?: boolean;
  children: ReactNode;
}

export function AdminTabLayout<T extends string>({
  tabs,
  activeTab,
  overview,
  overviewCards,
  isOverviewLoading = false,
  children,
}: AdminTabLayoutProps<T>) {
  return (
    <>
      {overview ?? (
        overviewCards ? (
          <AdminOverviewCards items={overviewCards} isLoading={isOverviewLoading} />
        ) : null
      )}
      <AdminTabBar tabs={tabs} activeTab={activeTab} />
      <div className="pb-12">{children}</div>
    </>
  );
}
