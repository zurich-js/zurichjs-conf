import { PhotoSlide } from "@/components/molecules";

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
    {
      id: 'photo-0',
      layout: {
        type: 'nested',
        main: {
          height: '2/3',
          image: '/images/meetups/cloudflare.png',
          alt: 'ZurichJS yellow T-shirts in a crowd during a meetup',
        },
        nested: {
          type: 'double-horizontal',
          height: '1/3',
          left: {
            width: '1/3',
            image: '/images/meetups/bogdan.png',
            alt: 'Smiles in the audience during a meetup',
          },
          right: {
            width: '2/3',
            image: '/images/meetups/ginetta.png',
            alt: 'Meetup attendees looking at screen',
          }
        }
      }
    },
    {
      id: 'photo-1',
      layout: {
        type: 'single',
        image: '/images/meetups/nico.jpg',
        alt: 'Nico Martin giving a talk',
      },
    },
    {
      id: 'photo-2',
      layout: {
        type: 'double-vertical',
        top: {
          image: '/images/meetups/june-workshop.png',
          alt: 'June workshop group photo',
          height: '1/3',
        },
        bottom: {
          image: '/images/meetups/june.png',
          alt: 'June workshop room with a huge screen',
          height: '2/3',
        }
      }
    },
    {
      id: 'photo-3',
      layout: {
        type: 'double-vertical',
        top: {
            image: '/images/meetups/july-group.png',
            alt: 'Smiling meetup attendee and speakers',
            height: '2/3',
        },
        bottom: {
          image: '/images/meetups/may.png',
          alt: 'smiles in the audience during a meetup',
          height: '1/3',
        }
      }
    },
    {
      id: 'photo-4',
      layout: {
          type: 'single',
          image: '/images/meetups/jens.png',
          alt: 'speaker pointing at screen during a talk',
      }
    }
  ],
} as const;
