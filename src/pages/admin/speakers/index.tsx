export const getServerSideProps = async () => ({
  redirect: {
    destination: '/admin/program/sessions',
    permanent: false,
  },
});

export default function ProgramAdminIndexRedirect() {
  return null;
}
