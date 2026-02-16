/**
 * CFP Review Guide Component
 * Simple, easy-to-scan scoring guide for reviewers
 */

import React from 'react';
import { BookOpen } from 'lucide-react';
import { Modal, ModalBody } from '@/components/atoms';

interface ReviewGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCORE_GUIDE = [
  { score: 4, label: 'Excellent', color: 'text-green-400' },
  { score: 3, label: 'Good', color: 'text-green-300' },
  { score: 2, label: 'Fair', color: 'text-yellow-400' },
  { score: 1, label: 'Poor', color: 'text-red-400' },
];

const CRITERIA = [
  {
    name: 'Relevance',
    question: 'Is this topic valuable for our JS community?',
    high: 'Core JS/TS topics, modern frameworks, real-world patterns',
    low: 'Off-topic, wrong audience, not applicable to JS developers',
  },
  {
    name: 'Technical Depth',
    question: 'Does it go beyond surface-level content?',
    high: 'Specific insights, implementation details, trade-offs discussed',
    low: 'Buzzwords only, vague descriptions, no concrete takeaways',
  },
  {
    name: 'Clarity',
    question: 'Can you understand what attendees will learn?',
    high: 'Clear structure, defined outcomes, well-written abstract',
    low: 'Confusing scope, missing information, hard to follow',
  },
  {
    name: 'Originality',
    question: 'Does it bring something fresh to our program?',
    high: 'Fresh perspective, unique angle, novel approach',
    low: 'Overdone topic, many similar submissions already',
  },
  {
    name: 'Overall Score',
    question: 'Would this talk improve our conference?',
    high: 'Would recommend to a colleague, excited to attend',
    low: 'Would skip this session, doesn\'t add value',
  },
];

export function ReviewGuide({ isOpen, onClose }: ReviewGuideProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scoring Guide"
      variant="dark"
      size="md"
    >
      <ModalBody className="space-y-6">
        {/* Score Scale */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Score Scale</h3>
          <div className="flex gap-2">
            {SCORE_GUIDE.map(({ score, label, color }) => (
              <div key={score} className="flex-1 text-center">
                <div className="w-full aspect-square rounded-lg bg-brand-gray-darkest flex items-center justify-center mb-1">
                  <span className={`text-lg font-bold ${color}`}>{score}</span>
                </div>
                <span className="text-xs text-brand-gray-light">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Criteria */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">What to evaluate</h3>
          {CRITERIA.map((criterion) => (
            <div key={criterion.name} className="bg-brand-gray-darkest rounded-lg p-4">
              <div className="font-medium text-white mb-1">{criterion.name}</div>
              <div className="text-sm text-brand-gray-light mb-3">{criterion.question}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-green-400 font-medium">High scores:</span>
                  <p className="text-brand-gray-light mt-0.5">{criterion.high}</p>
                </div>
                <div>
                  <span className="text-red-400 font-medium">Low scores:</span>
                  <p className="text-brand-gray-light mt-0.5">{criterion.low}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-brand-primary mb-2">Quick tips</h3>
          <ul className="text-sm text-brand-gray-light space-y-1">
            <li>• Judge the proposal, not assumptions about the speaker</li>
            <li>• Consider the stated difficulty level</li>
            <li>• Use internal notes for committee discussion</li>
          </ul>
        </div>
      </ModalBody>
    </Modal>
  );
}

/**
 * Button to open the review guide
 */
export function ReviewGuideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-brand-gray-light hover:text-white bg-brand-gray-dark hover:bg-brand-gray-medium rounded-lg transition-colors cursor-pointer"
    >
      <BookOpen className="w-4 h-4" />
      Review Guide
    </button>
  );
}
