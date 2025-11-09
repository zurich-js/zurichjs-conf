/**
 * EmailLayout Component
 * Main wrapper for all email templates with preheader support
 */

import { Body, Container, Head, Html, Preview } from '@react-email/components';
import * as React from 'react';
import { typography, layout } from '../design/tokens';

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
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <style>
          {`
            :root {
              color-scheme: light only;
              supported-color-schemes: light only;
            }

            /* Force light mode for Apple Mail and other email clients */
            @media (prefers-color-scheme: dark) {
              body, .email-canvas, [data-ogsc] {
                background-color: #FFFFFF !important;
              }
              * {
                color: inherit !important;
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
  backgroundColor: '#FFFFFF',
  fontFamily: typography.family.base,
};

const canvasStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  padding: '32px 16px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: `${layout.containerWidth}px`,
  margin: '0 auto',
};
