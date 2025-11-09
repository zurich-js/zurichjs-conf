/**
 * WalletButton Component
 * Add to Apple Wallet / Google Wallet buttons
 */

import { Button } from '@react-email/components';
import * as React from 'react';
import { colors, radii, typography } from '../design/tokens';

export interface WalletButtonProps {
  vendor: 'apple' | 'google';
  href: string;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ vendor, href }) => {
  const isApple = vendor === 'apple';
  const label = isApple ? 'Add to Apple Wallet' : 'Add to Google Wallet';
  const bgColor = isApple ? colors.wallet.apple : colors.wallet.google;

  return (
    <Button
      href={href}
      style={{
        ...buttonStyle,
        backgroundColor: bgColor,
      }}
    >
      <table style={innerTableStyle}>
        <tbody>
          <tr>
            <td style={iconCellStyle}>
              {isApple ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                  xmlns="http://www.w3.org/2000/svg"
                  style={iconStyle}
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                  xmlns="http://www.w3.org/2000/svg"
                  style={iconStyle}
                >
                  <path d="M21.8 10.2h-9.4c-.5 0-.9.4-.9.9v1.8c0 .5.4.9.9.9h5.4c.5 0 .9.4.9.9 0 2.5-2 4.5-4.5 4.5s-4.5-2-4.5-4.5 2-4.5 4.5-4.5c1.2 0 2.3.5 3.1 1.3.4.4.9.4 1.3 0l1.3-1.3c.4-.4.4-.9 0-1.3-1.5-1.5-3.6-2.4-5.7-2.4-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8c0-1-.2-2-.5-2.9-.1-.4-.5-.6-.9-.6z" />
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" />
                </svg>
              )}
            </td>
            <td style={labelCellStyle}>{label}</td>
          </tr>
        </tbody>
      </table>
    </Button>
  );
};

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 20px',
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  minHeight: '44px',
  boxSizing: 'border-box',
};

const innerTableStyle: React.CSSProperties = {
  width: '100%',
  margin: '0 auto',
  borderCollapse: 'collapse',
  borderSpacing: 0,
};

const iconCellStyle: React.CSSProperties = {
  width: '24px',
  paddingRight: '10px',
  verticalAlign: 'middle',
  textAlign: 'center',
};

const iconStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '20px',
  height: '20px',
  verticalAlign: 'middle',
};

const labelCellStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 600,
  color: '#FFFFFF',
  textAlign: 'left',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};
