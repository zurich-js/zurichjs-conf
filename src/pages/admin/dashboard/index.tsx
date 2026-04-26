export const getServerSideProps = async () => ({
  redirect: {
    destination: '/admin/dashboard/tickets',
    permanent: false,
  },
});

export default function AdminDashboardRedirect() {
  return null;
}
