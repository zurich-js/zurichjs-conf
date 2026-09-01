import type { SpeakerBadgeSource } from '@/lib/badges/export';
import { getVisibleSpeakersForOg } from '@/lib/cfp/speakers';

export type PublicBadgeSpeaker = Omit<SpeakerBadgeSource, 'badge_code'>;

export async function loadPublicBadgeSpeakers(): Promise<PublicBadgeSpeaker[]> {
  const publicSpeakerRows = await getVisibleSpeakersForOg();
  if (publicSpeakerRows.length === 0) {
    throw new Error('The public speaker lineup is empty; refusing to create an incomplete badge list');
  }

  return publicSpeakerRows.map((speaker) => ({
    id: speaker.slug,
    slug: speaker.slug,
    first_name: speaker.first_name,
    last_name: speaker.last_name,
    company: speaker.company,
    job_title: speaker.job_title,
  }));
}
