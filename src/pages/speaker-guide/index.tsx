import type { NextPage } from 'next';
import { SpeakerGuideView } from '@/components/speaker-guide';
import { speakerGuide } from '@/data/speaker-guide';

/** Unlisted general guide retained as the complete speaker reference. */
const SpeakerGuidePage: NextPage = () => (
  <SpeakerGuideView guide={speakerGuide} chatHref="/speaker-guide/chat" />
);

export default SpeakerGuidePage;
