/**
 * EmailLayout Component
 * Main wrapper for all email templates with preheader support
 */

import { Body, Container, Head, Html, Preview } from '@react-email/components';
import * as React from 'react';
import { colors, typography, layout } from '../design/tokens';

export interface EmailLayoutProps {
  preheader?: string;
  children: React.ReactNode;
}

export const EmailLayout: React.FC<EmailLayoutProps> = ({
  preheader,
  children,
}) => {
  return (
    <Html>
      <Head>
        <style>
          {`
            @media (prefers-color-scheme: dark) {
              .email-canvas {
                background-color: ${colors.surface.canvasDark} !important;
              }
            }
          `}
        </style>
      </Head>
      {preheader && <Preview>{preheader}</Preview>}
      <Body style={bodyStyle}>
        <div className="email-canvas" style={canvasStyle}>
          <Container style={containerStyle}>{children}</Container>
        </div>
      </Body>
    </Html>
  );
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: colors.surface.canvas,
  fontFamily: typography.family.base,
};

const canvasStyle: React.CSSProperties = {
  backgroundColor: colors.surface.canvas,
  minHeight: '100vh',
  padding: '32px 16px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: `${layout.containerWidth}px`,
  margin: '0 auto',
};
