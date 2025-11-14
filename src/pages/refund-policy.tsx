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
              At ZurichJS Conference 2026, we want to ensure transparency regarding our
              refund policy. This policy outlines our approach to ticket refunds.
            </p>
          </div>

          <div className="space-y-12">
            {/* Main Policy */}
            <section>
              <div className="bg-black rounded-2xl p-8">
                <Heading level="h2" variant='light' className="mb-6 text-brand-primary">
                  No Refund Policy
                </Heading>
                <p className="text-gray-200 text-lg mb-4">
                  <strong className="text-brand-white">All ticket sales are final.</strong> We do not offer refunds for any ticket type
                  (Standard, Student/Unemployed, or VIP) under normal circumstances.
                </p>
                <p className="text-gray-200 mb-4">
                  This policy helps us plan and commit to delivering a high-quality event with
                  confirmed numbers for venue, catering, and other essential services.
                </p>
              </div>
            </section>

            {/* Exceptional Circumstances */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Exceptional Circumstances
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <p className="text-gray-200 mb-4">
                  While refunds are not available under normal circumstances, we understand that
                  extraordinary situations can arise. In <strong className="text-brand-white">exceptional cases only</strong>,
                  we may consider refund requests on a <strong className="text-brand-white">case-by-case basis</strong>.
                </p>
                <p className="text-gray-200 mb-4">
                  Examples of exceptional circumstances may include (but are not limited to):
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-200 mb-4">
                  <li>Serious medical emergencies (documentation required)</li>
                  <li>Unforeseen family emergencies</li>
                  <li>Other extraordinary circumstances beyond your control</li>
                </ul>
                <p className="text-gray-200">
                  <strong className="text-brand-white">Please note:</strong> Approval is not guaranteed and will be
                  evaluated individually based on the specific circumstances.
                </p>
              </div>
            </section>

            {/* Event Cancellation */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Event Cancellation or Postponement
              </Heading>
              <div className="space-y-4">
                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-brand-white">Conference Cancellation</h3>
                  <p className="text-gray-200">
                    If ZurichJS Conference 2026 is cancelled by the organizers, all ticket holders
                    will receive a <strong className="text-brand-white">full refund (100%)</strong> of the ticket price.
                  </p>
                </div>

                <div className="bg-black rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-3 text-brand-white">Conference Postponement</h3>
                  <p className="text-gray-200">
                    If the conference is postponed to a new date, ticket holders will have the option to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-200 mt-3">
                    <li>Transfer their ticket to the new date at no additional cost, or</li>
                    <li>Request a full refund (100%) within 14 days of the postponement announcement</li>
                  </ul>
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
                  If you are unable to attend, you may be able to transfer your ticket to another
                  person. Ticket transfers are evaluated on a <strong className="text-brand-white">case-by-case basis</strong>.
                </p>
                <p className="text-gray-200 mb-4">
                  <strong className="text-brand-white">Note:</strong> Student/Unemployed tickets can only
                  be transferred to someone who also qualifies for the discount (verification required).
                </p>
                <p className="text-gray-200">
                  To request a ticket transfer, please contact us with your order number and the
                  details of the person you wish to transfer the ticket to.
                </p>
              </div>
            </section>

            {/* How to Request */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                How to Request a Refund or Transfer
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <p className="text-gray-200 mb-4">
                  If you believe you have exceptional circumstances that warrant a refund, or if
                  you need to transfer your ticket:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-gray-200 mb-4">
                  <li>Email us at <a href="mailto:hello@zurichjs.com" className="text-brand-primary underline font-semibold">hello@zurichjs.com</a></li>
                  <li>Include your order number in the email</li>
                  <li>Clearly explain your circumstances and reason for the request</li>
                  <li>Attach any supporting documentation (if applicable)</li>
                </ol>
                <p className="text-gray-200">
                  We will review your request and respond within 5-7 business days. If your request
                  is approved, refunds will be processed to the original payment method within 10-14
                  business days.
                </p>
              </div>
            </section>

            {/* Important Notes */}
            <section>
              <Heading level="h2" variant='light' className="mb-6 text-black">
                Important Notes
              </Heading>
              <div className="bg-black rounded-2xl p-6">
                <ul className="list-disc list-inside space-y-2 text-gray-200">
                  <li>Refund decisions are made at the sole discretion of the organizers</li>
                  <li>Approved refunds are processed to the original payment method only</li>
                  <li>Processing typically takes 10-14 business days depending on your bank</li>
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
                  href="mailto:hello@zurichjs.com"
                  className="text-black hover:underline font-bold transition-colors"
                >
                  hello@zurichjs.com
                </a>
              </p>
              <p className="text-black/70 text-sm">
                Last updated: November 14, 2025
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RefundPolicyPage;
