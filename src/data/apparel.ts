/**
 * Conference apparel copy
 * Availability wording shown wherever we collect t-shirt / hoodie sizes.
 */

import type { ApparelAvailabilityCopy } from '@/components/molecules/ApparelAvailabilityNotice';

/**
 * Sizes are picked well after the print run is committed, so checkout has to be
 * honest that a requested size might already be spoken for. The tone stays warm:
 * early buyers were counted first, and we always offer an alternative.
 */
export const APPAREL_AVAILABILITY_NOTICE: ApparelAvailabilityCopy = {
  title: 'A quick note on sizes',
  paragraphs: [
    'We are in the final weeks before the conference, so our apparel order is already with the printers. We ordered a healthy batch of spares on top of the sizes people had picked by then, but we cannot promise every size will still be there on the day.',
    'Sizes go on a first-come, first-served basis, and the orders placed earliest were counted first. If your size has run out by the time you collect, we will gladly swap in something equivalent from the rest of the conference merch we are ordering.',
  ],
  hoodieNote:
    'The same goes for the VIP hoodie — the run is already placed, spares included, and we will find you the closest match if your size is gone.',
  acknowledgement:
    'By completing your order you are confirming you are happy to go ahead on that basis. Thank you for understanding — we would much rather tell you now than surprise you at the merch desk.',
} as const;
