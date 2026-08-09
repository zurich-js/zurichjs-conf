/**
 * Legacy speaker travel entry point.
 *
 * Travel preferences and attendance now belong to Speaker Logistics. Keep the
 * old URL working for previously shared links by forwarding speakers to the
 * remaining self-service capability: flight entry.
 */

import type { GetServerSideProps } from 'next';

export default function TravelRedirect() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/cfp/travel/flights',
    permanent: false,
  },
});
