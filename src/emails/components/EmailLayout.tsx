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

            @media only screen and (max-width: 600px) {
              .action-cell {
                display: block !important;
                width: 100% !important;
                padding-bottom: 12px !important;
              }
              .action-table td {
                display: block !important;
                width: 100% !important;
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
  padding: '32px 16px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: `${layout.containerWidth}px`,
  margin: '0 auto',
};
