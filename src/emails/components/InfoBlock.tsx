/**
 * InfoBlock Component
 * Reusable label/value pair for ticket information
 */

import { Text } from '@react-email/components';
import * as React from 'react';
import { colors, typography, spacing } from '../design/tokens';

export interface InfoBlockProps {
  label: string;
  value: string | React.ReactNode;
  valueStyle?: React.CSSProperties;
}

export const InfoBlock: React.FC<InfoBlockProps> = ({ label, value, valueStyle: customValueStyle }) => {
  const finalValueStyle = customValueStyle ? { ...valueStyle, ...customValueStyle } : valueStyle;

  return (
    <div style={containerStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={finalValueStyle}>{value}</Text>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const valueStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  fontWeight: typography.body.fontWeight,
  color: colors.text.primary,
  margin: 0,
  whiteSpace: 'pre-line',
};
