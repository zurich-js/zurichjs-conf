/**
 * BadgePill Component
 * Small pill-shaped badge for status labels (e.g., "Early bird")
 */

import { Text } from '@react-email/components';
import * as React from 'react';
import { colors, radii, typography } from '../design/tokens';

export interface BadgePillProps {
  children: React.ReactNode;
}

export const BadgePill: React.FC<BadgePillProps> = ({ children }) => {
  return (
    <Text style={badgeStyle}>
      {children}
    </Text>
  );
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: colors.badge.bg,
  color: colors.badge.fg,
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  padding: '4px 12px',
  borderRadius: `${radii.badge}px`,
  margin: 0,
};
