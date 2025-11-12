/**
 * Sponsors and Photos section data
 * Includes sponsor logos and photo gallery configuration
 */

export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  url: string;
  tier: 'platinum' | 'gold' | 'silver' | 'community';
  // Width in grid columns (out of 12)
  width: number;
  // Height in pixels
  height: number;
}

// Photo layout types for manual masonry control
// Max 2 levels of nesting: 1-2 images OR 1 image + 1 container with 2 images
export type PhotoLayout =
  | { type: 'single'; image: string; alt: string }
  | {
      type: 'double-vertical';
      top: { image: string; alt: string; height: '1/3' | '2/3' };
      bottom: { image: string; alt: string; height: '1/3' | '2/3' };
    }
  | {
      type: 'double-horizontal';
      left: { image: string; alt: string; width: '1/3' | '2/3' };
      right: { image: string; alt: string; width: '1/3' | '2/3' };
    }
  | {
      type: 'nested';
      main: { image: string; alt: string; height: '1/3' | '2/3' };
      nested: {
        height: '1/3' | '2/3';
        left: { image: string; alt: string; width: '1/3' | '2/3' };
        right: { image: string; alt: string; width: '1/3' | '2/3' };
      };
    };

export interface PhotoSlide {
  id: string;
  layout: PhotoLayout;
}

export interface SponsorsSectionProps {
  kicker?: string;
  title: string;
  sponsors?: Sponsor[];
  photos?: PhotoSlide[];
}

/**
 * Sponsors and Photos data
 * Replace with actual sponsor information and conference photos
 */
export const sponsorsData: SponsorsSectionProps = {
  kicker: 'SPONSORS & PARTNERS',
  title: 'Made possible by our amazing sponsors and partners',

  // Static sponsor logo grid
  sponsors: [
    // Platinum sponsors (larger - 4 columns each)
    // {
    //   id: 'aws',
    //   name: 'AWS',
    //   logo: '/images/sponsors/aws.png',
    //   url: 'https://aws.amazon.com',
    //   tier: 'platinum',
    //   width: 4,
    //   height: 120,
    // },
    // {
    //   id: 'stripe',
    //   name: 'Stripe',
    //   logo: '/images/sponsors/stripe.png',
    //   url: 'https://stripe.com',
    //   tier: 'platinum',
    //   width: 4,
    //   height: 120,
    // },
    // // Gold sponsors (medium - 3 columns each)
    // {
    //   id: 'imagekit',
    //   name: 'ImageKit',
    //   logo: '/images/sponsors/imagekit.png',
    //   url: 'https://imagekit.io',
    //   tier: 'gold',
    //   width: 3,
    //   height: 100,
    // },
    // {
    //   id: 'digitec',
    //   name: 'Digitec Galaxus',
    //   logo: '/images/sponsors/digitec.png',
    //   url: 'https://digitec.ch',
    //   tier: 'gold',
    //   width: 3,
    //   height: 100,
    // },
    // {
    //   id: 'cityjs',
    //   name: 'CityJS',
    //   logo: '/images/sponsors/cityjs.png',
    //   url: 'https://cityjs.io',
    //   tier: 'gold',
    //   width: 3,
    //   height: 100,
    // },
    // {
    //   id: 'getyourguide',
    //   name: 'GetYourGuide',
    //   logo: '/images/sponsors/getyourguide.png',
    //   url: 'https://getyourguide.com',
    //   tier: 'gold',
    //   width: 3,
    //   height: 100,
    // },
    // // Silver sponsors (smaller - 2 columns each)
    // {
    //   id: 'sentry',
    //   name: 'Sentry',
    //   logo: '/images/sponsors/sentry.png',
    //   url: 'https://sentry.io',
    //   tier: 'silver',
    //   width: 2,
    //   height: 80,
    // },
    // {
    //   id: 'google',
    //   name: 'Google',
    //   logo: '/images/sponsors/google.png',
    //   url: 'https://google.com',
    //   tier: 'silver',
    //   width: 2,
    //   height: 80,
    // },
    // {
    //   id: 'smallpdf',
    //   name: 'Smallpdf',
    //   logo: '/images/sponsors/smallpdf.png',
    //   url: 'https://smallpdf.com',
    //   tier: 'silver',
    //   width: 2,
    //   height: 80,
    // },
    // {
    //   id: 'storyblok',
    //   name: 'Storyblok',
    //   logo: '/images/sponsors/storyblok.png',
    //   url: 'https://storyblok.com',
    //   tier: 'silver',
    //   width: 2,
    //   height: 80,
    // },
  ],

  // Photo gallery with manual masonry layouts
  // Using Unsplash placeholder images - replace with actual conference photos
  // Max 2 levels of nesting: each slide has 1-2 images OR 1 image + 1 container with 2 images
  photos: [
    // Slide 1: Single full image - Conference hall
    {
      id: 'photo-1',
      layout: {
        type: 'single',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=1000&fit=crop',
        alt: 'Conference main hall with attendees',
      },
    },
    // Slide 2: Nested layout - main image (2/3) + container with 2 split images (1/3)
    {
      id: 'photo-2',
      layout: {
        type: 'nested',
        main: {
          image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=667&fit=crop',
          alt: 'Speaker presenting on stage',
          height: '2/3',
        },
        nested: {
          height: '1/3',
          left: {
            image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=267&h=333&fit=crop',
            alt: 'Engaged audience members',
            width: '1/3',
          },
          right: {
            image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=533&h=333&fit=crop',
            alt: 'Audience taking notes during talk',
            width: '2/3',
          },
        },
      },
    },
    // Slide 3: Double vertical - networking (1/3) + workshop (2/3)
    {
      id: 'photo-3',
      layout: {
        type: 'double-vertical',
        top: {
          image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=333&fit=crop',
          alt: 'Networking session with attendees',
          height: '1/3',
        },
        bottom: {
          image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=667&fit=crop',
          alt: 'Hands-on coding workshop',
          height: '2/3',
        },
      },
    },
    // Slide 4: Double horizontal - coffee break (1/3) + panel (2/3)
    {
      id: 'photo-4',
      layout: {
        type: 'double-horizontal',
        left: {
          image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=267&h=1000&fit=crop',
          alt: 'Coffee break networking',
          width: '1/3',
        },
        right: {
          image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=533&h=1000&fit=crop',
          alt: 'Panel discussion with experts',
          width: '2/3',
        },
      },
    },
    // Slide 5: Single full image - group photo
    {
      id: 'photo-5',
      layout: {
        type: 'single',
        image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&h=1000&fit=crop',
        alt: 'Conference attendees group photo',
      },
    },
    // Slide 6: Nested layout - main image (2/3) + container (1/3)
    {
      id: 'photo-6',
      layout: {
        type: 'nested',
        main: {
          image: 'https://images.unsplash.com/photo-1560439514-4e9645039924?w=800&h=667&fit=crop',
          alt: 'Keynote presentation moment',
          height: '2/3',
        },
        nested: {
          height: '1/3',
          left: {
            image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=267&h=333&fit=crop',
            alt: 'Conference signage',
            width: '1/3',
          },
          right: {
            image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=533&h=333&fit=crop',
            alt: 'Attendees collaborating',
            width: '2/3',
          },
        },
      },
    },
    // Slide 7: Double horizontal - sponsor booth (2/3) + attendees (1/3)
    {
      id: 'photo-7',
      layout: {
        type: 'double-horizontal',
        left: {
          image: 'https://images.unsplash.com/photo-1507537362848-9c7e70b7b5c1?w=267&h=1000&fit=crop',
          alt: 'Sponsor booth interaction',
          width: '2/3',
        },
        right: {
          image: 'https://images.unsplash.com/photo-1507537362848-9c7e70b7b5c1?w=267&h=1000&fit=crop',
          alt: 'Attendees mingling',
          width: '1/3',
        },
      },
    },
    // Slide 8: Single full image - venue exterior
    {
      id: 'photo-8',
      layout: {
        type: 'single',
        image: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=1000&fit=crop',
        alt: 'Conference venue exterior',
      },
    },
  ],
} as const;
