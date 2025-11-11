import {TICKET_FAQ} from "@/data/tickets";
import {motion} from "framer-motion";
import {FAQAccordion} from "@/components/molecules";
import React from "react";

export const FAQSection = () => {
  return (
    <motion.div
      className="mb-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
        Frequently Asked Questions
      </h2>
      <div className="rounded-[28px] p-6 md:p-8 shadow-card bg-brand-gray-dark">
        <FAQAccordion items={TICKET_FAQ} />
      </div>
    </motion.div>
  )
}
