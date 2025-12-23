/**
 * CFP Review Guide Component
 * Explains scoring criteria with examples for reviewers
 */

import React, { useState } from 'react';
import { Info, BookOpen } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, ControlledDisclosure } from '@/components/atoms';

interface ReviewGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const CRITERIA = [
  {
    id: 'overall',
    name: 'Overall Score',
    required: true,
    description: 'Your holistic assessment of this submission for ZurichJS Conf.',
    guidance: [
      { score: 5, label: 'Must Have', description: 'Exceptional proposal that would be a highlight of the conference. Clear, compelling, and highly relevant.' },
      { score: 4, label: 'Strong Yes', description: 'Solid proposal with clear value. Would strengthen the conference program.' },
      { score: 3, label: 'Maybe', description: 'Decent proposal with potential. Has merit but may need refinement or faces competition from stronger submissions.' },
      { score: 2, label: 'Weak', description: 'Below average. Topic may be relevant but execution, clarity, or depth is lacking.' },
      { score: 1, label: 'No', description: 'Not suitable for the conference. Off-topic, poorly written, or lacks substance.' },
    ],
    examples: {
      high: 'A well-structured proposal on a timely topic (e.g., "Building Accessible React Components") with clear takeaways, from a speaker with relevant experience.',
      low: 'Vague proposal with generic title like "JavaScript Tips" with no clear learning outcomes or structure.',
    },
  },
  {
    id: 'relevance',
    name: 'Relevance',
    required: true,
    description: 'How relevant is this topic to the ZurichJS community and current JavaScript ecosystem?',
    guidance: [
      { score: 5, label: 'Highly Relevant', description: 'Core JS/TS topic or cutting-edge technology that the community is actively discussing.' },
      { score: 4, label: 'Relevant', description: 'Good fit for the JS community. Addresses common challenges or introduces useful tools/patterns.' },
      { score: 3, label: 'Somewhat Relevant', description: 'Tangentially related to JS. May be more general web dev or requires JS context to be valuable.' },
      { score: 2, label: 'Low Relevance', description: 'Weak connection to JavaScript. May be better suited for a different conference.' },
      { score: 1, label: 'Not Relevant', description: 'No clear connection to JavaScript or web development.' },
    ],
    examples: {
      high: '"Type-Safe API Clients with Zod and tRPC" - Directly addresses TypeScript patterns used by JS developers.',
      low: '"Introduction to Python for Data Science" - Wrong language/community for this conference.',
    },
  },
  {
    id: 'technical_depth',
    name: 'Technical Depth',
    required: true,
    description: 'Does the proposal demonstrate appropriate technical depth for its stated level?',
    guidance: [
      { score: 5, label: 'Excellent Depth', description: 'Shows deep understanding. Proposal hints at insights beyond surface-level coverage.' },
      { score: 4, label: 'Good Depth', description: 'Solid technical grounding. Speaker clearly understands the nuances of the topic.' },
      { score: 3, label: 'Adequate Depth', description: 'Covers the basics well. May not go beyond what attendees could find in documentation.' },
      { score: 2, label: 'Shallow', description: 'Surface-level treatment. Lacks technical substance or concrete details.' },
      { score: 1, label: 'Lacking', description: 'No evidence of technical understanding. Abstract is too vague to assess.' },
    ],
    examples: {
      high: 'Proposal discusses specific implementation challenges, performance considerations, and trade-offs with alternative approaches.',
      low: 'Abstract only mentions buzzwords without explaining what attendees will actually learn or see.',
    },
  },
  {
    id: 'clarity',
    name: 'Clarity',
    required: true,
    description: 'How well-written and clear is the proposal? Can you understand what the talk will cover?',
    guidance: [
      { score: 5, label: 'Crystal Clear', description: 'Exceptionally well-written. Clear structure, defined takeaways, and engaging description.' },
      { score: 4, label: 'Clear', description: 'Well-organized and easy to understand. Minor improvements possible but overall strong.' },
      { score: 3, label: 'Adequate', description: 'Understandable but could be clearer. Some ambiguity about scope or outcomes.' },
      { score: 2, label: 'Unclear', description: 'Difficult to understand the focus. Rambling, disorganized, or missing key information.' },
      { score: 1, label: 'Confusing', description: 'Cannot determine what the talk is about. Major issues with writing or structure.' },
    ],
    examples: {
      high: '"Attendees will leave knowing: 1) How to set up..., 2) Common pitfalls and how to avoid them, 3) When to use X vs Y..."',
      low: 'Wall of text with no structure, unclear what problem is being solved or what attendees will gain.',
    },
  },
  {
    id: 'diversity',
    name: 'Originality',
    required: true,
    description: 'Does this submission bring a fresh perspective or unique value to the conference program?',
    guidance: [
      { score: 5, label: 'Highly Original', description: 'Novel topic, unique angle, or innovative approach rarely seen at conferences. Would make the program stand out.' },
      { score: 4, label: 'Fresh Perspective', description: 'Brings new insights or a different take on known topics. Adds meaningful variety to the program.' },
      { score: 3, label: 'Standard', description: 'Solid topic but commonly presented. Value depends on execution quality.' },
      { score: 2, label: 'Derivative', description: 'Very similar to many other talks. Little to distinguish it from existing content.' },
      { score: 1, label: 'Redundant', description: 'Overlaps heavily with other submissions or widely available content. Does not add program value.' },
    ],
    examples: {
      high: 'A unique case study from production experience, novel research findings, or creative application of technology to solve unusual problems.',
      low: 'Yet another "Intro to React Hooks" when the conference already has similar beginner content covered.',
    },
  },
];

export function ReviewGuide({ isOpen, onClose }: ReviewGuideProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>('overall');

  const handleToggle = (id: string) => {
    setExpandedCriteria(expandedCriteria === id ? null : id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Review Scoring Guide"
      subtitle="Reference guide for consistent and fair evaluation"
      variant="dark"
      size="lg"
    >
      <ModalBody className="space-y-6">
        {/* General Guidelines */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium mb-2">General Guidelines</p>
              <ul className="text-brand-gray-light space-y-1">
                <li>• <strong className="text-white">All scoring criteria are required</strong> for fair and consistent assessment</li>
                <li>• Score based on the proposal quality, not assumptions about the speaker</li>
                <li>• Consider the stated difficulty level when evaluating depth</li>
                <li>• Use private notes for concerns you want to discuss with the committee</li>
                <li>• Use speaker feedback for constructive suggestions they can act on</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Criteria Accordion */}
        <div className="space-y-3">
          {CRITERIA.map((criterion) => (
            <ControlledDisclosure
              key={criterion.id}
              isOpen={expandedCriteria === criterion.id}
              onToggle={() => handleToggle(criterion.id)}
              trigger={criterion.name}
              variant="dark"
              badge={
                criterion.required && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                    Required
                  </span>
                )
              }
            >
              <div className="space-y-4 pt-2">
                {/* Description */}
                <p className="text-brand-gray-light text-sm">
                  {criterion.description}
                </p>

                {/* Score Breakdown */}
                <div className="space-y-2">
                  {criterion.guidance.map((guide) => (
                    <div
                      key={guide.score}
                      className="flex gap-3 p-2 rounded-lg bg-brand-gray-dark/50"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-primary/20 text-brand-primary font-bold flex items-center justify-center">
                        {guide.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{guide.label}</div>
                        <div className="text-brand-gray-light text-xs mt-0.5">
                          {guide.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Examples */}
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="text-green-400 text-xs font-medium mb-1 flex items-center gap-1">
                      <span className="w-4 h-4 flex items-center justify-center">✓</span>
                      Strong Example
                    </div>
                    <p className="text-brand-gray-light text-xs">
                      {criterion.examples.high}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <div className="text-red-400 text-xs font-medium mb-1 flex items-center gap-1">
                      <span className="w-4 h-4 flex items-center justify-center">✗</span>
                      Weak Example
                    </div>
                    <p className="text-brand-gray-light text-xs">
                      {criterion.examples.low}
                    </p>
                  </div>
                </div>
              </div>
            </ControlledDisclosure>
          ))}
        </div>
      </ModalBody>

      <ModalFooter variant="dark">
        <p className="text-center text-xs text-brand-gray-medium">
          When in doubt, discuss with other reviewers. Aim for consistency across all submissions.
        </p>
      </ModalFooter>
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
