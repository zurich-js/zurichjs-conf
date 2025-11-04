/**
 * FAQ Accordion Component
 * Expandable accordion for frequently asked questions
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        onClick={onClick}
        className="w-full text-left py-5 px-0 flex items-center justify-between gap-4 hover:text-white transition-colors focus:outline-none focus:ring-0 cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg font-semibold text-white">{item.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 text-xl font-bold flex-shrink-0"
          aria-hidden="true"
        >
          ↓
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-5 text-sm md:text-base text-gray-400 leading-relaxed">
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
    <div className={`w-full ${className}`}>
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
