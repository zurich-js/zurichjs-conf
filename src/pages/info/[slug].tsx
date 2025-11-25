import React from 'react';
import { GetStaticProps, GetStaticPaths } from 'next';
import { InfoContentLayout } from '@/components/InfoContentLayout';
import { getAllPageSlugs, getPageBySlug, type InfoPage } from '@/content/info-pages';

interface InfoPageProps {
  page: InfoPage;
}
const InfoPage: React.FC<InfoPageProps> = ({ page }) => {
  return <InfoContentLayout page={page} />;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllPageSlugs();

  return {
    paths: slugs.map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<InfoPageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  const page = getPageBySlug(slug);

  if (!page) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      page,
    },
  };
};

export default InfoPage;
