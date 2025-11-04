import { Hero, ScheduleSection, TicketsSection, TimelineSection } from '@/components/organisms';
import { Layout } from '@/components/Layout';
import { Separator } from '@/components/atoms/Separator';
import { heroData, scheduleData, ticketsData, timelineData, footerData } from '@/data';

export default function Home() {
  const handleCtaClick = () => {
    console.log('Render ticket clicked!');
    // Add your ticket rendering logic here
  };

  return (
    <Layout
      title="ZurichJS Conference 2026 | JavaScript Conference in Zurich"
      description="Join us for an amazing JavaScript conference in Zurich. Learn from industry experts, network with peers, and explore the latest in web development."
      footerProps={footerData}
    >
      <Hero
        title={heroData.title}
        kicker={heroData.kicker}
        dateTimeISO={heroData.dateTimeISO}
        venue={heroData.venue}
        city={heroData.city}
        ctaLabel={heroData.ctaLabel}
        onCtaClick={handleCtaClick}
        speakers={heroData.speakers}
        background={heroData.background}
      />
      <ScheduleSection
        title={scheduleData.title}
        subtitle={scheduleData.subtitle}
        aboutLink={scheduleData.aboutLink}
        days={scheduleData.days}
      />
      <Separator variant="diagonal-transition" backgroundColor="white" fill="black" />
      
      <TicketsSection
        kicker={ticketsData.kicker}
        heading={ticketsData.heading}
        subcopy={ticketsData.subcopy}
        plans={ticketsData.plans}
        discountEndsAt={ticketsData.discountEndsAt}
        helpLine={ticketsData.helpLine}
      />
      <Separator variant="diagonal-bottom" fill="#000000" className="h-12 md:h-16 lg:h-20" />
      
      <TimelineSection
        kicker={timelineData.kicker}
        title={timelineData.title}
        copy={timelineData.copy}
        entries={timelineData.entries}
      />
      <Separator variant="diagonal-bottom" fill="#19191B" />
    </Layout>
  );
}
