/**
 * DiscountCodeCard
 * Dashed highlight card presenting a discount code inside an email.
 * Shared by the discount-code email and the save-cart goodie block so the
 * two stay visually in sync.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface DiscountCodeCardProps {
  code: string;
  title?: string;
  text?: React.ReactNode;
  finePrint?: React.ReactNode;
}

export const DiscountCodeCard: React.FC<DiscountCodeCardProps> = ({
  code,
  title,
  text,
  finePrint,
}) => (
  <Section style={cardStyle}>
    {title && <Text style={titleStyle}>{title}</Text>}
    {text && <Text style={textStyle}>{text}</Text>}
    <Text style={codeStyle}>{code}</Text>
    {finePrint && <Text style={finePrintStyle}>{finePrint}</Text>}
  </Section>
);

// Styles
const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `2px dashed ${colors.brand.yellow}`,
  borderRadius: `${radii.card}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['3xl'],
  textAlign: 'center' as const,
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  lineHeight: '24px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const textStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `0 0 ${spacing.base}px 0`,
};

const codeStyle: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: 700,
  letterSpacing: '4px',
  fontFamily: 'ui-monospace, Menlo, monospace',
  color: colors.text.primary,
  margin: `0 0 ${spacing.sm}px 0`,
};

const finePrintStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: colors.text.muted,
  margin: 0,
};
