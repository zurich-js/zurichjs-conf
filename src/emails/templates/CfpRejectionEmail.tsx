/**
 * CFP Rejection Email Template
 * Sent to speakers when their submission is not accepted
 * Uses a human, transparent tone with stats and optional feedback
 */

import { Button, Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';
import type { CfpRejectionEmailData } from '@/lib/types/cfp/decisions';

export const CfpRejectionEmail: React.FC<CfpRejectionEmailData> = ({
  speaker_name,
  talk_title,
  conference_name,
  personal_message,
  coupon_code,
  coupon_discount_percent,
  coupon_expires_at,
  tickets_url,
  // Transparency stats
  total_submissions,
  total_reviews,
  workshop_slots_min,
  workshop_slots_max,
  talks_total,
  talks_from_cfp,
  // Committee feedback
  include_feedback,
  feedback_text,
  // Multi-submission
  has_other_pending_submissions,
}) => {
  const firstName = speaker_name.split(' ')[0];
  const preheader = `Update on your ${conference_name} submission`;

  // Format coupon expiry date
  const formattedExpiry = coupon_expires_at
    ? new Date(coupon_expires_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <EmailLayout preheader={preheader}>
      {/* Header - more subtle for rejections */}
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>Update on Your Submission</Text>
      </Section>

      {/* Content Card */}
      <Section style={cardStyle}>
        <Text style={greetingStyle}>Hi {firstName},</Text>

        <Text style={bodyStyle}>
          Thank you for submitting <strong>&quot;{talk_title}&quot;</strong> to {conference_name}.
          We genuinely appreciate you taking the time to share your idea with us.
        </Text>

        <Text style={bodyStyle}>
          After careful review, we weren&apos;t able to include your talk in this year&apos;s program.
          This was a really hard decision for our committee.
        </Text>

        <Text style={bodyStyle}>
          Many of us on the program committee and organizing team are conference speakers ourselves.
          We know exactly how disheartening it feels to receive an email like this — we&apos;ve been
          there, and we don&apos;t want you to feel that way. Your submission had merit, and the
          competition was simply fierce this year.
        </Text>

        {/* Transparency Stats */}
        {(total_submissions || talks_from_cfp) && (
          <div style={statsBoxStyle}>
            <Text style={statsLabelStyle}>Some context on our selection</Text>
            <ul style={statsListStyle}>
              {total_submissions && (
                <li style={statsItemStyle}>
                  We received <strong>{total_submissions} submissions</strong> this year
                </li>
              )}
              {total_reviews && (
                <li style={statsItemStyle}>
                  Our committee completed <strong>{total_reviews} reviews</strong>
                </li>
              )}
              {talks_from_cfp && talks_total && (
                <li style={statsItemStyle}>
                  We only have room for <strong>{talks_from_cfp} talks from the CFP</strong> (out of {talks_total} total speaking slots)
                </li>
              )}
              {workshop_slots_min && workshop_slots_max && (
                <li style={statsItemStyle}>
                  Workshop slots: <strong>{workshop_slots_min}-{workshop_slots_max}</strong> available
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Personal Message from Committee */}
        {personal_message && (
          <>
            <Hr style={dividerStyle} />
            <Text style={sectionTitleStyle}>A Note from the Committee</Text>
            <div style={messageBoxStyle}>
              <Text style={messageTextStyle}>{personal_message}</Text>
            </div>
          </>
        )}

        {/* Committee Feedback */}
        {include_feedback && feedback_text && (
          <>
            <Hr style={dividerStyle} />
            <Text style={sectionTitleStyle}>Feedback from Our Reviewers</Text>
            <Text style={bodyStyle}>
              We hope this feedback is helpful for future submissions:
            </Text>
            <div style={feedbackBoxStyle}>
              <Text style={feedbackTextStyle}>{feedback_text}</Text>
            </div>
          </>
        )}

        <Hr style={dividerStyle} />

        {/* Multi-submission note */}
        {has_other_pending_submissions && (
          <div style={infoBoxStyle}>
            <Text style={infoTextStyle}>
              <strong>Note:</strong> You have other submissions still under review.
              We&apos;ll be in touch about those separately.
            </Text>
          </div>
        )}

        {/* Encouragement */}
        <Text style={bodyStyle}>
          Not being selected doesn&apos;t reflect on the quality of your work — it just
          means we couldn&apos;t fit everything in this time. If you&apos;d like more detailed
          feedback on your submission, please don&apos;t hesitate to reach out. We&apos;re happy
          to share our thoughts and help you refine your proposal for future conferences.
        </Text>

        <Text style={bodyStyle}>
          Most importantly, we want you to be part of our community. Whether as a speaker
          next year or as an attendee this year, we&apos;d love to have you there. The best
          conversations often happen in the hallways between talks.
        </Text>

        {/* Coupon Section */}
        {coupon_code && (
          <>
            <Hr style={dividerStyle} />
            <Text style={sectionTitleStyle}>Join Us Anyway?</Text>
            <Text style={bodyStyle}>
              We&apos;d love to have you there as an attendee! Here&apos;s a thank-you
              discount for taking the time to submit:
            </Text>

            <div style={couponBoxStyle}>
              <Text style={couponLabelStyle}>Your Discount Code</Text>
              <Text style={couponCodeStyle}>{coupon_code}</Text>
              <Text style={couponDiscountStyle}>
                {coupon_discount_percent}% off your ticket
              </Text>
              {formattedExpiry && (
                <Text style={couponExpiryStyle}>
                  Valid until {formattedExpiry}
                </Text>
              )}
            </div>

            <Section style={ctaContainerStyle}>
              <Button href={tickets_url} style={buttonStyle}>
                Get Your Ticket
              </Button>
            </Section>
          </>
        )}

        {!coupon_code && (
          <>
            <Hr style={dividerStyle} />
            <Text style={bodyStyle}>
              We&apos;d still love to have you join us as an attendee:
            </Text>
            <Section style={ctaContainerStyle}>
              <Button href={tickets_url} style={buttonSecondaryStyle}>
                View Tickets
              </Button>
            </Section>
          </>
        )}
      </Section>

      {/* Questions Section */}
      <Section style={questionsSectionStyle}>
        <Text style={questionsTextStyle}>
          Questions? Just reply to this email or reach out at{' '}
          <Link href="mailto:hello@zurichjs.com" style={linkStyle}>
            hello@zurichjs.com
          </Link>
        </Text>
      </Section>

      {/* Footer */}
      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          Thanks for being part of the ZurichJS community.
        </Text>
        <Text style={footerSignatureStyle}>
          — The {conference_name} Team
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default CfpRejectionEmail;

// Styles
const headerSectionStyle: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  padding: spacing['2xl'],
  borderRadius: `${radii.card}px ${radii.card}px 0 0`,
  marginBottom: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '22px',
  lineHeight: '28px',
  fontWeight: 600,
  color: colors.text.primary,
  margin: 0,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderTop: 'none',
  borderRadius: `0 0 ${radii.card}px ${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['2xl'],
};

const greetingStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const bodyStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.7',
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
};

const statsBoxStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginTop: spacing.base,
  marginBottom: spacing.base,
};

const statsLabelStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const statsListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
};

const statsItemStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: colors.text.secondary,
  marginBottom: '4px',
};

const messageBoxStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
};

const messageTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: 0,
  fontStyle: 'italic',
  whiteSpace: 'pre-wrap' as const,
};

const feedbackBoxStyle: React.CSSProperties = {
  backgroundColor: '#EFF6FF',
  border: '1px solid #BFDBFE',
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
};

const feedbackTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: '#1E40AF',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #FCD34D',
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.base,
};

const infoTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: '#92400E',
  margin: 0,
};

const couponBoxStyle: React.CSSProperties = {
  backgroundColor: '#ECFDF5',
  border: '1px solid #A7F3D0',
  borderRadius: `${radii.button}px`,
  padding: spacing.lg,
  textAlign: 'center' as const,
  marginTop: spacing.base,
};

const couponLabelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: 'uppercase',
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const couponCodeStyle: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: 700,
  color: '#065F46',
  fontFamily: typography.family.mono,
  margin: `0 0 ${spacing.xs}px 0`,
  letterSpacing: '0.05em',
};

const couponDiscountStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: '#047857',
  margin: 0,
  fontWeight: 600,
};

const couponExpiryStyle: React.CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.4',
  color: colors.text.muted,
  margin: `${spacing.sm}px 0 0 0`,
};

const ctaContainerStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  padding: `${spacing.lg}px 0`,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#059669',
  color: '#FFFFFF',
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  padding: `${spacing.md}px ${spacing.xl}px`,
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
  display: 'inline-block',
};

const buttonSecondaryStyle: React.CSSProperties = {
  backgroundColor: colors.brand.blue,
  color: '#FFFFFF',
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  padding: `${spacing.md}px ${spacing.xl}px`,
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
  display: 'inline-block',
};

const questionsSectionStyle: React.CSSProperties = {
  marginBottom: spacing['2xl'],
};

const questionsTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  paddingTop: spacing.lg,
  borderTop: `1px solid ${colors.border.subtle}`,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const footerSignatureStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: 0,
};
