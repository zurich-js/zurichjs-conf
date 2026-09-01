/**
 * Door Staff Invitation Email
 * Sent when a volunteer is added to the check-in crew.
 */

import { Button, Hr, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, radii, spacing, typography } from '../design/tokens';

export interface DoorStaffInvitationEmailProps {
  staffName?: string;
  staffEmail: string;
  role: 'door_lead' | 'scanner' | 'goodie';
  loginUrl: string;
  supportEmail?: string;
}

const ROLE_LABELS: Record<DoorStaffInvitationEmailProps['role'], string> = {
  door_lead: 'Door Lead',
  scanner: 'Scanner',
  goodie: 'Goodie Bags',
};

const ROLE_DESCRIPTIONS: Record<DoorStaffInvitationEmailProps['role'], string> = {
  door_lead:
    'You can scan and check people in, look attendees up by name, admit someone whose code will not scan, and see contact details. You are who the other volunteers come to when something is wrong.',
  scanner:
    'You can scan an attendee’s code and check them in. If a code will not scan, hand the attendee to a door lead rather than turning them away.',
  goodie:
    'You can hand over t-shirts and hoodies and record that you did. Checking people in is a separate role, so send anyone who has not been scanned yet to a scanner first.',
};

export const DoorStaffInvitationEmail: React.FC<DoorStaffInvitationEmailProps> = ({
  staffName,
  staffEmail,
  role,
  loginUrl,
  supportEmail = 'hello@zurichjs.com',
}) => {
  const preheader = `You're on the ZurichJS 2026 check-in crew as ${ROLE_LABELS[role]}`;
  const greeting = staffName ? `Hi ${staffName}` : 'Hello';

  return (
    <EmailLayout preheader={preheader}>
      <Section style={headerBannerStyle}>
        <Text style={headerTitleStyle}>ZurichJS Conference 2026</Text>
        <Text style={headerSubtitleStyle}>Check-in crew</Text>
      </Section>

      <Section style={sectionStyle}>
        <Text style={greetingStyle}>{greeting},</Text>
        <Text style={bodyTextStyle}>
          You&apos;ve been added to the check-in crew for ZurichJS Conference 2026. Thank you —
          the door is the first thing 300 people experience.
        </Text>
      </Section>

      <Section style={roleCardStyle}>
        <Text style={roleLabelStyle}>Your role</Text>
        <Text style={roleNameStyle}>{ROLE_LABELS[role]}</Text>
        <Text style={roleDescriptionStyle}>{ROLE_DESCRIPTIONS[role]}</Text>
      </Section>

      <Section style={sectionStyle}>
        <Text style={bodyTextStyle}>
          <strong>Please sign in tonight, before the day itself.</strong> Signing in sends a code
          to this address, and doing it in advance means you are not waiting on an email at the
          door with a queue in front of you.
        </Text>
        <Button href={loginUrl} style={buttonStyle}>
          Sign in to the check-in station
        </Button>
        <Text style={mutedTextStyle}>
          Sign in with <strong>{staffEmail}</strong> — the invitation is tied to that address.
        </Text>
      </Section>

      <Hr style={hrStyle} />

      <Section style={sectionStyle}>
        <Text style={smallHeadingStyle}>On the day</Text>
        <Text style={mutedTextStyle}>
          Use the same phone and browser you signed in on, and keep the tab open for your whole
          shift. Closing it means signing in again, and anything not yet synced is lost.
        </Text>
        <Text style={mutedTextStyle}>
          You will be handling other people&apos;s personal details. Please don&apos;t share your
          screen or your sign-in link with anyone, and tell a lead straight away if you lose your
          phone so your access can be switched off.
        </Text>
        <Text style={mutedTextStyle}>
          Questions before then? Reply to this email or contact{' '}
          <strong>{supportEmail}</strong>.
        </Text>
      </Section>
    </EmailLayout>
  );
};

const headerBannerStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: `${spacing.xl}px ${spacing.lg}px`,
  borderRadius: `${radii.card}px`,
  textAlign: 'center',
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: typography.h1.fontSize,
  lineHeight: typography.h1.lineHeight,
  fontWeight: typography.h1.fontWeight,
  color: colors.text.primary,
  margin: 0,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `${spacing.xs}px 0 0 0`,
};

const sectionStyle: React.CSSProperties = { padding: `${spacing.lg}px 0 0 0` };

const greetingStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  fontWeight: 600,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const mutedTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: `0 0 ${spacing.sm}px 0`,
};

const smallHeadingStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const roleCardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.card}px`,
  padding: spacing.xl,
  marginTop: spacing.lg,
};

const roleLabelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const roleNameStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const roleDescriptionStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  color: colors.text.primary,
  padding: `${spacing.md}px ${spacing.xl}px`,
  borderRadius: `${radii.button}px`,
  fontSize: typography.body.fontSize,
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
  margin: `0 0 ${spacing.sm}px 0`,
};

const hrStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0 0 0`,
};
