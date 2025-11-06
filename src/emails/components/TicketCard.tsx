/**
 * TicketCard Component
 * Main ticket design with perforation nibbles, QR code, and wallet integration
 */

import { Column, Hr, Img, Row, Section, Text } from '@react-email/components';
import * as React from 'react';
import { colors, radii, spacing, shadows, typography, layout } from '../design/tokens';
import { BadgePill } from './BadgePill';
import { InfoBlock } from './InfoBlock';
import { WalletButton } from './WalletButton';

export interface TicketCardProps {
  eventName: string;
  edition?: string;
  tierLabel: string;
  badgeLabel?: string;
  venueName: string;
  venueAddress: string;
  dateLabel: string;
  timeLabel: string;
  tz?: string;
  fullName: string;
  email: string;
  ticketId: string;
  qrSrc: string;
  qrAlt?: string;
  appleWalletUrl?: string;
  googleWalletUrl?: string;
  logoSrc: string;
  logoAlt?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  eventName,
  tierLabel,
  badgeLabel,
  venueName,
  venueAddress,
  dateLabel,
  timeLabel,
  tz,
  fullName,
  email,
  ticketId,
  qrSrc,
  qrAlt = 'Ticket QR Code',
  appleWalletUrl,
  googleWalletUrl,
  logoSrc,
  logoAlt = 'Event Logo',
}) => {
  const timeWithTz = tz ? `${timeLabel} ${tz}` : timeLabel;

  return (
    <Section style={cardStyle}>
      {/* Perforation nibbles */}
      <div style={perforationContainerStyle}>
        <div style={{ ...nibbleStyle, ...nibbleLeftStyle }} />
        <div style={{ ...nibbleStyle, ...nibbleRightStyle }} />
      </div>

      {/* Header: Logo + Event Info */}
      <Section style={headerStyle}>
        <Row>
          <Column style={logoColumnStyle}>
            <Img
              src={logoSrc}
              alt={logoAlt}
              width="48"
              height="48"
              style={logoStyle}
            />
          </Column>
          <Column style={titleColumnStyle}>
            <Text style={eventNameStyle}>{eventName}</Text>
            <div style={metaRowStyle}>
              <Text style={tierLabelStyle}>{tierLabel}</Text>
              {badgeLabel && (
                <div style={badgeWrapperStyle}>
                  <BadgePill>{badgeLabel}</BadgePill>
                </div>
              )}
            </div>
          </Column>
        </Row>
      </Section>

      <Hr style={dividerStyle} />

      {/* Info Row: Location + Date */}
      <Section style={infoSectionStyle}>
        <Row>
          <Column style={infoColumnStyle}>
            <InfoBlock label="Location" value={`${venueName}\n${venueAddress}`} />
          </Column>
          <Column style={{ width: spacing.xl }} />
          <Column style={infoColumnStyle}>
            <InfoBlock label="Date & Time" value={`${dateLabel}\n${timeWithTz}`} />
          </Column>
        </Row>
      </Section>

      <Hr style={perforationDividerStyle} />

      {/* Identity + QR Row */}
      <Section style={identitySectionStyle}>
        <Row>
          <Column style={identityColumnStyle}>
            <InfoBlock label="Attendee" value={fullName} />
            <InfoBlock label="Email" value={email} />
            <InfoBlock label="Ticket ID" value={<Text style={ticketIdStyle}>{ticketId}</Text>} />
          </Column>
          <Column style={{ width: spacing.xl }} />
          <Column style={qrColumnStyle}>
            <Img
              src={qrSrc}
              alt={qrAlt}
              width="144"
              height="144"
              style={qrStyle}
            />
          </Column>
        </Row>
      </Section>

      {/* Wallet Buttons */}
      {(appleWalletUrl || googleWalletUrl) && (
        <>
          <Hr style={dividerStyle} />
          <Section style={walletSectionStyle}>
            <Row>
              {appleWalletUrl && (
                <Column style={walletColumnStyle}>
                  <WalletButton vendor="apple" href={appleWalletUrl} />
                </Column>
              )}
              {appleWalletUrl && googleWalletUrl && (
                <Column style={{ width: spacing.md }} />
              )}
              {googleWalletUrl && (
                <Column style={walletColumnStyle}>
                  <WalletButton vendor="google" href={googleWalletUrl} />
                </Column>
              )}
            </Row>
          </Section>
        </>
      )}
    </Section>
  );
};

// Card container styles
const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  borderRadius: `${radii.card}px`,
  padding: `${layout.cardPadding}px`,
  boxShadow: shadows.card,
  position: 'relative',
  marginBottom: spacing['3xl'],
};

// Perforation nibbles (circular cutouts on left and right)
const perforationContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: 0,
  right: 0,
  height: 0,
  pointerEvents: 'none',
  zIndex: 1,
};

const nibbleStyle: React.CSSProperties = {
  position: 'absolute',
  width: '16px',
  height: '16px',
  backgroundColor: colors.surface.canvas,
  borderRadius: '50%',
  top: '-8px',
};

const nibbleLeftStyle: React.CSSProperties = {
  left: '-8px',
};

const nibbleRightStyle: React.CSSProperties = {
  right: '-8px',
};

// Header styles
const headerStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const logoColumnStyle: React.CSSProperties = {
  width: '48px',
  verticalAlign: 'top',
};

const logoStyle: React.CSSProperties = {
  display: 'block',
  width: '48px',
  height: '48px',
  objectFit: 'contain',
};

const titleColumnStyle: React.CSSProperties = {
  verticalAlign: 'top',
  paddingLeft: spacing.base,
};

const eventNameStyle: React.CSSProperties = {
  fontSize: typography.h1.fontSize,
  lineHeight: typography.h1.lineHeight,
  fontWeight: typography.h1.fontWeight,
  color: colors.text.primary,
  margin: 0,
  marginBottom: spacing.xs,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
};

const tierLabelStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.muted,
  margin: 0,
};

const badgeWrapperStyle: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: spacing.sm,
};

// Divider styles
const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.base}px 0`,
};

const perforationDividerStyle: React.CSSProperties = {
  borderColor: colors.border.default,
  borderStyle: 'dashed',
  margin: `${spacing.base}px 0`,
};

// Info section styles
const infoSectionStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const infoColumnStyle: React.CSSProperties = {
  verticalAlign: 'top',
  width: '50%',
};

// Identity section styles
const identitySectionStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const identityColumnStyle: React.CSSProperties = {
  verticalAlign: 'top',
};

const qrColumnStyle: React.CSSProperties = {
  verticalAlign: 'top',
  width: '144px',
  textAlign: 'right',
};

const qrStyle: React.CSSProperties = {
  display: 'block',
  width: '144px',
  height: '144px',
  marginLeft: 'auto',
};

const ticketIdStyle: React.CSSProperties = {
  fontFamily: typography.family.mono,
  fontSize: typography.body.fontSize,
  color: colors.text.primary,
};

// Wallet section styles
const walletSectionStyle: React.CSSProperties = {
  marginTop: spacing.base,
};

const walletColumnStyle: React.CSSProperties = {
  verticalAlign: 'top',
};
