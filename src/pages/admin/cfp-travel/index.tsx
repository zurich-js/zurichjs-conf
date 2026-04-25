export const getServerSideProps = async () => ({
  redirect: {
    destination: '/admin/travel/overview',
    permanent: false,
  },
});

export default function TravelAdminIndexRedirect() {
  return null;
}
