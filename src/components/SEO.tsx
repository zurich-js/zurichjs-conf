/**
 * SEO Component
 * Handles all meta tags, OpenGraph, Twitter Cards, and JSON-LD structured data
 */

import Head from 'next/head';
import React from 'react';

// Base URL for the site
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://conf.zurichjs.com';

// Default OG image dimensions
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export interface SEOProps {
  /** Page title (without site name suffix) */
  title: string;
  /** Meta description - aim for 150-160 characters */
  description: string;
  /** Canonical URL path (e.g., '/about') */
  canonical?: string;
  /** OG image path or full URL */
  ogImage?: string;
  /** OG type - defaults to 'website' */
  ogType?: 'website' | 'article' | 'event';
  /** Twitter card type */
  twitterCard?: 'summary' | 'summary_large_image';
  /** JSON-LD structured data - can be single object or array */
  jsonLd?: object | object[];
  /** Set to true to add noindex,nofollow */
  noindex?: boolean;
  /** Additional keywords (comma-separated) */
  keywords?: string;
  /** Article publish date (for og:article) */
  publishedTime?: string;
  /** Article modified date */
  modifiedTime?: string;
}

/**
 * Organization schema - used site-wide
 */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ZurichJS - Swiss JavaScript Group',
  alternateName: 'ZurichJS',
  url: BASE_URL,
  logo: `${BASE_URL}/images/logo/zurichjs-square.png`,
  sameAs: [
    'https://www.linkedin.com/company/zurichjs',
    'https://www.instagram.com/zurich.js',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@zurichjs.com',
    contactType: 'customer service',
    availableLanguage: ['English', 'German'],
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Alderstrasse 30',
    addressLocality: 'Zürich',
    postalCode: '8008',
    addressCountry: 'CH',
  },
};

/**
 * Event schema for the conference
 */
export const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'ZurichJS Conference 2026',
  description:
    "Switzerland's premier JavaScript conference. Join 300+ developers for talks, workshops, and networking at Technopark Zürich.",
  startDate: '2026-09-11T08:30:00+02:00',
  endDate: '2026-09-11T18:30:00+02:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: 'Technopark Zürich',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Technoparkstrasse 1',
      addressLocality: 'Zürich',
      postalCode: '8005',
      addressCountry: 'CH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 47.3903,
      longitude: 8.5157,
    },
  },
  organizer: organizationSchema,
  performer: {
    '@type': 'PerformingGroup',
    name: 'ZurichJS Conference Speakers',
  },
  offers: [
    {
      '@type': 'Offer',
      name: 'Student / Unemployed Ticket',
      price: '175',
      priceCurrency: 'CHF',
      availability: 'https://schema.org/InStock',
      validFrom: '2025-01-01',
      url: `${BASE_URL}/#tickets`,
    },
    {
      '@type': 'Offer',
      name: 'Standard Ticket',
      price: '345',
      priceCurrency: 'CHF',
      availability: 'https://schema.org/InStock',
      validFrom: '2025-01-01',
      url: `${BASE_URL}/#tickets`,
    },
    {
      '@type': 'Offer',
      name: 'VIP Ticket',
      price: '545',
      priceCurrency: 'CHF',
      availability: 'https://schema.org/LimitedAvailability',
      validFrom: '2025-01-01',
      url: `${BASE_URL}/#tickets`,
    },
  ],
  image: `${BASE_URL}/images/og-default.jpg`,
  url: BASE_URL,
};

/**
 * Website schema for sitelinks search box potential
 */
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ZurichJS Conference',
  alternateName: 'ZurichJS Conf 2026',
  url: BASE_URL,
  publisher: organizationSchema,
};

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  ogImage = '/images/og-default.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  jsonLd,
  noindex = false,
  keywords,
  publishedTime,
  modifiedTime,
}) => {
  // Build full title with site name
  const fullTitle = `${title} | ZurichJS Conference 2026`;

  // Build canonical URL
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  // Build OG image URL (handle both relative and absolute URLs)
  const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;

  // Prepare JSON-LD script content
  const jsonLdContent = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : null;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/images/logo/zurichjs-square.png" />

      {/* OpenGraph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={title} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content="ZurichJS Conference" />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG tags */}
      {ogType === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {ogType === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@zurichjs" />
      <meta name="twitter:creator" content="@zurichjs" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content={title} />

      {/* JSON-LD Structured Data */}
      {jsonLdContent &&
        jsonLdContent.map((schema, index) => (
          <script
            key={`jsonld-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
    </Head>
  );
};

/**
 * Generate FAQ Page schema from FAQ items
 */
export const generateFAQSchema = (
  faqs: Array<{ question: string; answer: string }>
) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

/**
 * Generate BreadcrumbList schema
 */
export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>
) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
  })),
});

/**
 * Generate Person schema for speakers
 */
export const generatePersonSchema = (speaker: {
  name: string;
  jobTitle?: string;
  company?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: speaker.name,
  ...(speaker.jobTitle && { jobTitle: speaker.jobTitle }),
  ...(speaker.company && {
    worksFor: {
      '@type': 'Organization',
      name: speaker.company,
    },
  }),
  ...(speaker.image && { image: speaker.image }),
  ...(speaker.url && { url: speaker.url }),
  ...(speaker.sameAs && { sameAs: speaker.sameAs }),
});

export default SEO;
