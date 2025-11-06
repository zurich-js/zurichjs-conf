import React from 'react';
import { Layout } from '@/components/Layout';
import { Heading, Kicker } from '@/components/atoms';

/**
 * Refund Policy Page
 * Outlines the conditions and process for ticket refunds
 * Follows the design system and styling patterns from the main site
 */
const RefundPolicyPage: React.FC = () => {
  return (
    <Layout
      title="Refund Policy | ZurichJS Conference 2026"
      description="Clear and transparent refund policy for ZurichJS Conference 2026 tickets"
    >
      <div className="min-h-screen bg-brand-primary text-gray-900 py-16 md:py-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-12">
            <Kicker variant="light" className="mb-4">
              Policies
            </Kicker>
            <Heading level="h1" variant='light' className="mb-6 text-black">
              Refund Policy
            </Heading>
            <p className="text-lg text-black leading-relaxed">
              At ZurichJS Conference 2026, we want to ensure a fair and transparent refund process
              for all attendees. This policy outlines the conditions under which refunds are
              available and how to request them.
            </p>
          </div>

          <div className="space-y-12">
            {/* Quick Reference Table */}
            <section>
              <div className="bg-black rounded-2xl p-6 overflow-x-auto">
                <h3 className="text-xl font-semibold mb-4 text-brand-primary">Refund Quick Reference</h3>
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-200 font-semibold">Timeframe</th>
                      <th className="text-center py-3 px-2 text-gray-200 font-semibold">Student/Unemployed</th>
                      <th className="text-center py-3 px-2 text-gray-200 font-semibold">Standard</th>
                      <th className="text-center py-3 px-2 text-gray-200 font-semibold">VIP</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    <tr className="border-b border-gray-800">
                      <td className="py-3 px-2">&gt;60 days before</td>
                      <td className="text-center py-3 px-2 text-success-light font-semibold">80%</td>
                      <td className="text-center py-3 px-2 text-success-light font-semibold">80%</td>
                      <td className="text-center py-3 px-2 text-success-light font-semibold">80%</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 px-2">30-60 days before</td>
                      <td className="text-center py-3 px-2 text-warning-light font-semibold">50%</td>
                      <td className="text-center py-3 px-2 text-warning-light font-semibold">50%</td>
                      <td className="text-center py-3 px-2 text-warning-light font-semibold">50%</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 px-2">&lt;30 days before</td>
                      <td className="text-center py-3 px-2 text-error-light">0%*</td>
                      <td className="text-center py-3 px-2 text-error-light">0%*</td>
                      <td className="text-center py-3 px-2 text-error-light">0%*</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-3 px-2">Transfers</td>
                      <td className="text-center py-3 px-2 text-success-light">Free**</td>
                      <td className="text-center py-3 px-2 text-success-light">Free</td>
                      <td className="text-center py-3 px-2 text-success-light">Free</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">Event cancelled</td>
                      <td className="text-center py-3 px-2 text-success-light font-semibold">100%</td>
                      <td className="text-center py-3 px-2 text-success-light font-semibold">100%</td>
                      <td className="text-center py-3 px-2 text-success-light font-semibold">100%</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-4">
                  * Transfers to another person are free up to 7 days before the event.<br />
                  ** Student/Unemployed tickets can only be transferred to someone who also qualifies for the discount.
                </p>
              </div>
            </section>

            {/* Ticket Types */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Ticket Types & Refund Eligibility
              </Heading>

              <div className="space-y-4">
                {/* Standard, Student/Unemployed & VIP Tickets */}
                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-xl font-semibold mb-3 text-brand-primary">
                    Standard, Student/Unemployed & VIP Tickets
                  </h3>
                  <p className="text-gray-200">
                    All ticket types (Standard, Student/Unemployed, and VIP) are <strong className="text-white">refundable</strong> under the conditions
                    specified in this policy. Student/Unemployed tickets follow the same refund policy as Standard tickets.
                  </p>
                </div>
              </div>
            </section>

            {/* Refund Conditions */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Refund Conditions (All Ticket Types)
              </Heading>

              <div className="space-y-4">
                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-white">1. Conference Cancellation</h3>
                  <p className="text-gray-200">
                    If ZurichJS Conference 2026 is cancelled by the organizers, all
                    ticket holders will receive a <strong className="text-white">full refund (100%)</strong> of the ticket
                    price.
                  </p>
                </div>

                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-white">2. Conference Postponement</h3>
                  <p className="text-gray-200 mb-3">
                    If the conference is postponed to a new date, ticket holders have two options:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-200">
                    <li>Transfer your ticket to the new date at no additional cost, or</li>
                    <li>
                      Request a refund within 14 days of the postponement announcement for a{' '}
                      <strong className="text-white">full refund (100%)</strong>
                    </li>
                  </ul>
                </div>

                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-white">3. Major Conference Changes</h3>
                  <p className="text-gray-200 mb-3">
                    If significant changes are made to the conference (e.g., venue change to a
                    different city, major format changes), ticket holders may request a refund
                    within 14 days of the change announcement:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-200">
                    <li>
                      <strong className="text-white">More than 60 days before event:</strong> 100% refund
                    </li>
                    <li>
                      <strong className="text-white">30-60 days before event:</strong> 75% refund
                    </li>
                    <li>
                      <strong className="text-white">Less than 30 days before event:</strong> 50% refund
                    </li>
                  </ul>
                </div>

                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-white">4. Personal Circumstances</h3>
                  <p className="text-gray-200 mb-3">
                    If you cannot attend due to personal reasons, refunds are available based on the
                    timing of your request:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-200">
                    <li>
                      <strong className="text-white">More than 60 days before event:</strong> 80% refund
                    </li>
                    <li>
                      <strong className="text-white">30-60 days before event:</strong> 50% refund
                    </li>
                    <li>
                      <strong className="text-white">Less than 30 days before event:</strong> No refund available (ticket
                      may be transferred to another person)
                    </li>
                  </ul>
                </div>

                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-white">5. Medical Emergencies</h3>
                  <p className="text-gray-200">
                    In the case of serious illness or medical emergency (with supporting
                    documentation), a <strong className="text-white">full refund (100%)</strong> may be granted at the
                    discretion of the organizers, regardless of timing.
                  </p>
                </div>
              </div>
            </section>

            {/* Ticket Transfers */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Ticket Transfers
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <p className="text-gray-200 mb-4">
                  All ticket types may be transferred to another person at no
                  cost up to <strong className="text-white">7 days before the event</strong>. Note: Student/Unemployed tickets
                  can only be transferred to someone who also qualifies for the discount. To transfer your ticket:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-200">
                  <li>Contact us at tickets@zurichjs.com with the subject &quot;Ticket Transfer&quot;</li>
                  <li>Provide your order number and the new attendee&apos;s full name and email</li>
                  <li>We&apos;ll process the transfer within 2-3 business days</li>
                </ol>
              </div>
            </section>

            {/* How to Request */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                How to Request a Refund
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <p className="text-gray-200 mb-4">
                  To request a refund for an eligible ticket:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-200">
                  <li>Email us at tickets@zurichjs.com with the subject &quot;Refund Request&quot;</li>
                  <li>Include your order number and reason for the refund</li>
                  <li>
                    If applicable, attach supporting documentation (e.g., medical certificate)
                  </li>
                  <li>We&apos;ll review your request and respond within 5 business days</li>
                  <li>
                    If approved, refunds will be processed to the original payment method within
                    10-14 business days
                  </li>
                </ol>
              </div>
            </section>

            {/* Workshop Tickets */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Workshop Tickets
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <p className="text-gray-200 mb-3">
                  Workshop tickets are purchased separately and have their own refund policy.
                  Workshop refunds are available:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-200">
                  <li>
                    <strong className="text-white">More than 14 days before workshop:</strong> 100% refund
                  </li>
                  <li>
                    <strong className="text-white">7-14 days before workshop:</strong> 50% refund
                  </li>
                  <li>
                    <strong className="text-white">Less than 7 days before workshop:</strong> No refund available
                  </li>
                </ul>
              </div>
            </section>

            {/* Important Notes */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Important Notes
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <ul className="list-disc list-inside space-y-2 text-gray-200">
                  <li>All refund percentages are calculated based on the amount paid, not the full ticket price</li>
                  <li>Refunds are processed to the original payment method only</li>
                  <li>Processing typically takes 5-10 business days depending on your bank</li>
                  <li>This policy may be updated; changes will be communicated to ticket holders via email</li>
                  <li>The organizers reserve the right to make exceptions on a case-by-case basis</li>
                </ul>
              </div>
            </section>

            {/* Contact */}
            <section className="mt-12 pt-8 border-t border-black/20">
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Questions?
              </Heading>
              <p className="text-black mb-4">
                If you have questions about this refund policy or need clarification, please contact
                us at{' '}
                <a
                  href="mailto:tickets@zurichjs.com"
                  className="text-black hover:underline font-bold transition-colors"
                >
                  hello@zurichjs.com
                </a>
              </p>
              <p className="text-black/70 text-sm">
                Last updated: November 13, 2025
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RefundPolicyPage;

