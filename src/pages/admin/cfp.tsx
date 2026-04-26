export const getServerSideProps = async () => ({
  redirect: {
    destination: '/admin/cfp/submissions',
    permanent: false,
  },
});

export default function CfpAdminRedirect() {
  return null;
}
