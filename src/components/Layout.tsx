import React from 'react';
import Head from 'next/head';

export interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Layout template component
 * Wraps page content with common elements
 * Follows atomic design pattern as a template composing organisms
 */
export const Layout: React.FC<LayoutProps> = ({
  children,
  title = 'ZurichJS Conference 2026',
  description = 'Join us for an amazing JavaScript conference in Zurich',
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="min-h-screen">
        {children}
      </main>
    </>
  );
};

