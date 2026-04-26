import { AdminTopNav } from '@/components/admin/common';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AdminHeader(props: AdminHeaderProps) {
  void props;
  return <AdminTopNav />;
}
