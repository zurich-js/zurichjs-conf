import { PhotoSlide } from "@/components/molecules";

/**
 * Sponsors and Photos section data
 * Sponsors are now fetched dynamically from the API
 * This file contains static photo gallery configuration
 */

export interface SponsorsSectionProps {
  kicker?: string;
  title: string;
  photos?: PhotoSlide[];
}

/**
 * Sponsors section static data
 * Sponsor logos are fetched dynamically via usePublicSponsors hook
 */
export const sponsorsData: SponsorsSectionProps = {
  kicker: 'SPONSORS & PARTNERS',
  title: 'Made possible by our amazing sponsors and partners',

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
