import {TICKET_FAQ} from "@/data/tickets";
import {motion} from "framer-motion";
import {FAQAccordion} from "@/components/molecules";
import React from "react";
import {SectionSplitView} from "@/components/organisms/SectionSplitView";
import {useMotion} from "@/contexts";

export const FAQSection = () => {
  const { shouldAnimate } = useMotion();

  return (
    <SectionSplitView
      kicker="Frequently Asked Questions"
      title="F.A.Q."
      variant="dark"
      subtitle="Find answers to common questions about tickets, the event, and more."
      link={{ label: "Read more here", href: "/faq" }}
    >
      <motion.div
        className="pt-8"
        initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <FAQAccordion items={TICKET_FAQ} />
      </motion.div>
    </SectionSplitView>

  )
}
