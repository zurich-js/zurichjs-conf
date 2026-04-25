import Head from 'next/head';
import type { ReactNode } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminLoadingScreen } from '@/components/admin/AdminLoadingScreen';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { AdminPageShell } from '@/components/admin/common';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface AdminLayoutProps {
  title: string;
  headTitle: string;
  loginTitle?: string;
  backgroundClassName?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function AdminLayout({
  title,
  headTitle,
  loginTitle,
  backgroundClassName = 'bg-gradient-to-br from-gray-50 to-text-brand-gray-lightest',
  contentClassName = 'py-6 sm:py-8',
  children,
}: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) return <AdminLoadingScreen />;
  if (!isAuthenticated) return <AdminLoginForm title={loginTitle ?? title} />;

  return (
    <>
      <Head>
        <title>{headTitle}</title>
      </Head>
      <div className={`min-h-screen ${backgroundClassName}`}>
        <AdminHeader title={title} />
        <AdminPageShell className={contentClassName}>{children}</AdminPageShell>
      </div>
    </>
  );
}
