export const getServerSideProps = async () => ({
  redirect: {
    destination: '/admin/program/sessions',
    permanent: false,
  },
});

export default function ProgramAdminRedirect() {
  return null;
}
