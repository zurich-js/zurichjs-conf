/**
 * CFP Review Guide Component
 * Explains scoring criteria with examples for reviewers
 */

import React, { useState } from 'react';
import { Heading } from '@/components/atoms';

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
    required: false,
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
    required: false,
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
    required: false,
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
    name: 'Diversity & Inclusion',
    required: false,
    description: 'Does this submission contribute to a diverse and inclusive conference program?',
    guidance: [
      { score: 5, label: 'Strong Contribution', description: 'Brings underrepresented perspective, topic, or approach. Helps broaden conference appeal.' },
      { score: 4, label: 'Good Contribution', description: 'Adds variety to the program. Different angle or experience than typical submissions.' },
      { score: 3, label: 'Neutral', description: 'Standard submission. Neither particularly adds nor detracts from program diversity.' },
      { score: 2, label: 'Redundant', description: 'Very similar to other submissions. Topic/perspective well-covered already.' },
      { score: 1, label: 'Narrow', description: 'Extremely niche with limited audience appeal. May alienate rather than include.' },
    ],
    examples: {
      high: 'Accessibility-focused talk, non-traditional career path perspective, or topic underrepresented in typical JS conferences.',
      low: 'Fifth proposal about React state management when we already have strong options in this space.',
    },
  },
];

export function ReviewGuide({ isOpen, onClose }: ReviewGuideProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<string | null>('overall');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 pt-16">
        <div className="relative bg-brand-gray-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-brand-gray-medium">
            <div>
              <Heading level="h2" className="text-xl font-bold text-white">
                Review Scoring Guide
              </Heading>
              <p className="text-sm text-brand-gray-light mt-1">
                Reference guide for consistent and fair evaluation
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-brand-gray-light hover:text-white rounded-lg hover:bg-brand-gray-medium transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* General Guidelines */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm">
                  <p className="text-blue-300 font-medium mb-2">General Guidelines</p>
                  <ul className="text-brand-gray-light space-y-1">
                    <li>• <strong>Overall score is required</strong>, other criteria are optional but helpful</li>
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
                <div
                  key={criterion.id}
                  className="bg-brand-gray-darkest rounded-xl overflow-hidden"
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => setExpandedCriteria(
                      expandedCriteria === criterion.id ? null : criterion.id
                    )}
                    className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-brand-gray-medium/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">{criterion.name}</span>
                      {criterion.required && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs">
                          Required
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-brand-gray-light transition-transform ${
                        expandedCriteria === criterion.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Accordion Content */}
                  {expandedCriteria === criterion.id && (
                    <div className="px-4 pb-4 space-y-4">
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
                          <div className="text-green-400 text-xs font-medium mb-1">
                            ✓ Strong Example
                          </div>
                          <p className="text-brand-gray-light text-xs">
                            {criterion.examples.high}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                          <div className="text-red-400 text-xs font-medium mb-1">
                            ✗ Weak Example
                          </div>
                          <p className="text-brand-gray-light text-xs">
                            {criterion.examples.low}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-brand-gray-medium bg-brand-gray-darkest/50">
            <p className="text-center text-xs text-brand-gray-medium">
              When in doubt, discuss with other reviewers. Aim for consistency across all submissions.
            </p>
          </div>
        </div>
      </div>
    </div>
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
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      Review Guide
    </button>
  );
}
