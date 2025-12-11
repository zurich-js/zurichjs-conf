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

// Default keywords for the site - optimized for "javascript conferences 2026" searches
const DEFAULT_KEYWORDS = [
  // Primary target keywords for 2026 searches
  'javascript conferences 2026',
  'javascript conference 2026',
  'js conferences 2026',
  'js conference 2026',
  'web development conferences 2026',
  'frontend conferences 2026',
  'tech conferences 2026',
  'developer conferences 2026',
  // European/Swiss specific
  'javascript conferences europe 2026',
  'javascript conference europe 2026',
  'tech conferences europe 2026',
  'javascript conferences switzerland 2026',
  'javascript conference switzerland 2026',
  'swiss javascript conference 2026',
  // Brand and location keywords
  'zurichjs conf',
  'zurichjs conference',
  'zurich js conf',
  'zurich js conference',
  'javascript conference zurich',
  'js conference switzerland',
  'javascript conference switzerland',
  'zurich javascript',
  'swiss javascript conference',
  'tech conference zurich',
  'developer conference zurich',
  'web development conference',
  'frontend conference',
  'javascript event zurich',
  'zurich tech events',
  'javascript meetup zurich',
  'zurichjs',
  'zurich.js',
  'js conf zurich',
  'september 11 2026',
  'technopark zurich',
  'javascript talks',
  'javascript workshops',
  // Additional discovery keywords
  'node.js conference 2026',
  'react conference 2026',
  'typescript conference 2026',
  'web dev conference europe',
  'best javascript conferences',
  'top js conferences 2026',
].join(', ');

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
 * Follows Google's official guidelines for logo display in search results
 * @see https://developers.google.com/search/docs/appearance/structured-data/organization
 * Logo requirements: min 112x112px, crawlable URL, looks good on white background
 */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'ZurichJS Conf',
  legalName: 'ZurichJS Conf',
  alternateName: ['ZurichJS Conference', 'ZurichJS', 'Zurich.js', 'ZurichJS - Swiss JavaScript Group'],
  description: "Switzerland's premier JavaScript conference, bringing together developers, engineers, and tech enthusiasts for expert talks, workshops, and networking in Zürich.",
  url: BASE_URL,
  // Logo per Google requirements: min 112x112px, crawlable, displays well on white
  logo: {
    '@type': 'ImageObject',
    '@id': `${BASE_URL}/#logo`,
    url: `${BASE_URL}/images/logo/zurichjs-square.png`,
    contentUrl: `${BASE_URL}/images/logo/zurichjs-square.png`,
    width: 512,
    height: 512,
    caption: 'ZurichJS Conf Logo',
  },
  image: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/images/logo/zurichjs-square.png`,
    width: 512,
    height: 512,
  },
  sameAs: [
    'https://www.linkedin.com/company/zurichjs',
    'https://www.instagram.com/zurich.js',
    'https://twitter.com/zurichjs',
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
    addressRegion: 'ZH',
    postalCode: '8008',
    addressCountry: 'CH',
  },
  foundingDate: '2024',
  email: 'hello@zurichjs.com',
};

/**
 * Event schema for the conference
 * Follows Google's official Event structured data guidelines
 * @see https://developers.google.com/search/docs/appearance/structured-data/event
 * Required: name, startDate, location (Place with address and name)
 * Recommended: description, endDate, eventStatus, image, offers, organizer, performer
 */
export const eventSchema = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  '@id': `${BASE_URL}/#event`,
  // Required properties
  name: 'ZurichJS Conf 2026 - JavaScript Conference Switzerland',
  startDate: '2026-09-11T08:30:00+02:00',
  location: {
    '@type': 'Place',
    name: 'Technopark Zürich',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Technoparkstrasse 1',
      addressLocality: 'Zürich',
      addressRegion: 'ZH',
      postalCode: '8005',
      addressCountry: 'CH',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 47.3903,
      longitude: 8.5157,
    },
  },
  // Recommended properties
  description: "ZurichJS Conf 2026 is Switzerland's premier JavaScript conference taking place September 11th, 2026 at Technopark Zürich. Join 300+ developers for expert talks on JavaScript, TypeScript, React, Node.js, and web development. Features hands-on workshops, networking, and industry-leading speakers. One of the top JavaScript conferences in Europe for 2026.",
  endDate: '2026-09-11T18:30:00+02:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  // Images in multiple aspect ratios per Google recommendation (16:9, 4:3, 1:1)
  image: [
    `${BASE_URL}/images/og-default.png`,
    `${BASE_URL}/images/logo/zurichjs-square.png`,
  ],
  offers: [
    {
      '@type': 'Offer',
      name: 'Student / Unemployed Ticket',
      price: 175,
      priceCurrency: 'CHF',
      availability: 'https://schema.org/InStock',
      validFrom: '2025-01-01T00:00:00+01:00',
      url: `${BASE_URL}/#tickets`,
    },
    {
      '@type': 'Offer',
      name: 'Standard Ticket',
      price: 345,
      priceCurrency: 'CHF',
      availability: 'https://schema.org/InStock',
      validFrom: '2025-01-01T00:00:00+01:00',
      url: `${BASE_URL}/#tickets`,
    },
    {
      '@type': 'Offer',
      name: 'VIP Ticket',
      price: 545,
      priceCurrency: 'CHF',
      availability: 'https://schema.org/LimitedAvailability',
      validFrom: '2025-01-01T00:00:00+01:00',
      url: `${BASE_URL}/#tickets`,
    },
  ],
  organizer: {
    '@id': `${BASE_URL}/#organization`,
  },
  performer: {
    '@type': 'PerformingGroup',
    name: 'ZurichJS Conference Speakers',
  },
  url: BASE_URL,
  // Additional helpful properties for search engines and AI
  inLanguage: 'en',
  isAccessibleForFree: false,
};

/**
 * Website schema for sitelinks search box potential
 */
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  name: 'ZurichJS Conf',
  alternateName: [
    'ZurichJS Conference',
    'ZurichJS Conf 2026',
    'ZurichJS Conference 2026',
    'Zurich.js Conference',
    'JavaScript Conference Switzerland 2026',
    'JavaScript Conference Zurich 2026',
  ],
  description: "Switzerland's premier JavaScript conference - ZurichJS Conf 2026 on September 11th at Technopark Zürich",
  url: BASE_URL,
  image: `${BASE_URL}/images/logo/zurichjs-square.png`,
  publisher: {
    '@id': `${BASE_URL}/#organization`,
  },
  inLanguage: 'en',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

/**
 * Speakable schema for voice search optimization
 * Identifies content suitable for text-to-speech on voice assistants
 * @see https://developers.google.com/search/docs/appearance/structured-data/speakable
 */
export const speakableSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${BASE_URL}/#webpage`,
  name: 'ZurichJS Conf 2026 - JavaScript Conference Switzerland',
  description: "Switzerland's premier JavaScript conference on September 11th, 2026 at Technopark Zürich",
  url: BASE_URL,
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['h1', '.hero-description', '.event-details'],
  },
  mainEntity: {
    '@id': `${BASE_URL}/#event`,
  },
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
  const fullTitle = `${title} | ZurichJS Conf 2026`;

  // Build canonical URL
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  // Build OG image URL (handle both relative and absolute URLs)
  const ogImageUrl = ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`;

  // Merge default keywords with custom keywords
  const allKeywords = keywords 
    ? `${DEFAULT_KEYWORDS}, ${keywords}` 
    : DEFAULT_KEYWORDS;

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
      <meta name="keywords" content={allKeywords} />

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
      
      {/* Logo for Google Search - helps Google identify and display the logo */}
      <link rel="image_src" href={`${BASE_URL}/images/logo/zurichjs-square.png`} />

      {/* OpenGraph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={title} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content="ZurichJS Conf" />
      <meta property="og:locale" content="en_US" />
      
      {/* Additional logo reference for better recognition */}
      <meta property="og:logo" content={`${BASE_URL}/images/logo/zurichjs-square.png`} />

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
