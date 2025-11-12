/**
 * FAQ Accordion Component
 * Expandable accordion for frequently asked questions
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {useMotion} from "@/contexts";
import { ChevronDownIcon } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  className?: string;
}

/**
 * Individual accordion item
 */
const AccordionItem: React.FC<{ item: FAQItem; isOpen: boolean; onClick: () => void }> = ({
  item,
  isOpen,
  onClick,
}) => {
  const { shouldAnimate } = useMotion();

  return (
    <div className="bg-brand-gray-dark rounded-xl">
      <button
        onClick={onClick}
        className="w-full text-left p-2.5 flex items-center justify-between gap-2.5 hover:text-white transition-colors focus:outline-none focus:ring-0 cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-base font-semibold text-white">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
          aria-hidden="true"
        >
          <ChevronDownIcon size={20} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={shouldAnimate ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden px-2.5 pb-5"
          >
            <div className="text-base text-brand-gray-light leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * FAQ Accordion component
 * Displays a list of collapsible FAQ items
 */
export const FAQAccordion: React.FC<FAQAccordionProps> = ({ items, className = '' }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={`w-full flex flex-col gap-2.5 ${className}`}>
      {items.map((item, index) => (
        <AccordionItem
          key={index}
          item={item}
          isOpen={openIndex === index}
          onClick={() => handleToggle(index)}
        />
      ))}
    </div>
  );
};
