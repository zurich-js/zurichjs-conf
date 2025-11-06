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
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={iconStyle}
                >
                  <path
                    d="M14.5 3.5C13.8 4.3 12.7 5 11.7 5C11.6 4 12 2.9 12.6 2.2C13.3 1.4 14.5 0.8 15.4 0.8C15.5 1.8 15.1 2.8 14.5 3.5ZM15.4 5.2C13.4 5.1 11.7 6.4 10.7 6.4C9.7 6.4 8.2 5.3 6.6 5.3C4.4 5.3 2.3 6.7 1.3 8.8C-0.7 12.9 0.8 19 2.7 22.4C3.6 23.9 4.7 25.6 6.2 25.6C7.7 25.6 8.3 24.7 10.1 24.7C11.9 24.7 12.4 25.6 14 25.6C15.6 25.6 16.6 24.1 17.5 22.6C18.2 21.5 18.5 20.9 19.1 19.7C15.4 18.3 14.9 12.9 18.5 11.2C17.4 9.6 15.7 8.5 14.1 8.5C13.4 8.5 12.8 8.7 12.3 8.9C11.8 9.1 11.4 9.3 11 9.3C10.6 9.3 10.2 9.1 9.7 8.9C9.1 8.7 8.5 8.5 7.7 8.5C6.3 8.5 5 9.3 4.1 10.5C2.8 12.3 2.7 15.1 3.9 17.5C5 19.7 6.8 22.6 8.8 22.6C9.6 22.6 10.1 22.2 10.7 21.7C11.3 21.2 12 20.7 13.1 20.7C14.2 20.7 14.8 21.2 15.4 21.7C16 22.2 16.5 22.6 17.4 22.6C19.3 22.6 21.1 19.9 22.1 17.9C22.4 17.2 22.6 16.6 22.8 16C19.6 14.8 19.1 10.2 22.2 8.8C21.5 7.8 20.5 7.1 19.4 6.6C18.4 6.1 17.2 5.8 16.1 5.8C15.5 5.8 15 5.9 14.6 6C14.2 6.1 13.9 6.2 13.6 6.2C13.3 6.2 13 6.1 12.6 6C12.2 5.9 11.7 5.8 11.1 5.8C9.8 5.8 8.5 6.3 7.5 7.2C6.1 8.4 5.4 10.2 5.6 12C5.8 14.5 7.5 17.3 9.8 18.8C10.3 19.2 10.8 19.4 11.4 19.4C12 19.4 12.5 19.2 13 18.8C15.3 17.3 17 14.5 17.2 12C17.4 10.2 16.7 8.4 15.3 7.2C14.3 6.3 13 5.8 11.7 5.8C11.1 5.8 10.6 5.9 10.2 6C9.8 6.1 9.5 6.2 9.2 6.2C8.9 6.2 8.6 6.1 8.2 6C7.8 5.9 7.3 5.8 6.7 5.8C5.4 5.8 4.1 6.3 3.1 7.2C1.7 8.4 1 10.2 1.2 12C1.4 14.5 3.1 17.3 5.4 18.8C5.9 19.2 6.4 19.4 7 19.4C7.6 19.4 8.1 19.2 8.6 18.8C10.9 17.3 12.6 14.5 12.8 12C13 10.2 12.3 8.4 10.9 7.2C9.9 6.3 8.6 5.8 7.3 5.8C6.7 5.8 6.2 5.9 5.8 6C5.4 6.1 5.1 6.2 4.8 6.2"
                    fill="white"
                  />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={iconStyle}
                >
                  <path
                    d="M9.99 0C4.47 0 0 4.48 0 10C0 15.52 4.47 20 9.99 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 9.99 0ZM16.23 6H13.77C13.4 4.84 12.87 3.75 12.18 2.76C14.03 3.54 15.5 4.59 16.23 6ZM10 2.04C10.83 3.24 11.48 4.57 11.91 6H8.09C8.52 4.57 9.17 3.24 10 2.04ZM2.26 12C2.1 11.36 2 10.69 2 10C2 9.31 2.1 8.64 2.26 8H5.64C5.56 8.66 5.5 9.32 5.5 10C5.5 10.68 5.56 11.34 5.64 12H2.26ZM3.77 14H6.23C6.6 15.16 7.13 16.25 7.82 17.24C5.97 16.46 4.5 15.41 3.77 14ZM6.23 6H3.77C4.5 4.59 5.97 3.54 7.82 2.76C7.13 3.75 6.6 4.84 6.23 6ZM10 17.96C9.17 16.76 8.52 15.43 8.09 14H11.91C11.48 15.43 10.83 16.76 10 17.96ZM12.34 12H7.66C7.57 11.34 7.5 10.68 7.5 10C7.5 9.32 7.57 8.65 7.66 8H12.34C12.43 8.65 12.5 9.32 12.5 10C12.5 10.68 12.43 11.34 12.34 12ZM12.18 17.24C12.87 16.25 13.4 15.16 13.77 14H16.23C15.5 15.41 14.03 16.46 12.18 17.24ZM14.36 12C14.44 11.34 14.5 10.68 14.5 10C14.5 9.32 14.44 8.66 14.36 8H17.74C17.9 8.64 18 9.31 18 10C18 10.69 17.9 11.36 17.74 12H14.36Z"
                    fill="white"
                  />
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
  padding: '14px 20px',
  borderRadius: `${radii.button}px`,
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  minHeight: '44px',
};

const innerTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const iconCellStyle: React.CSSProperties = {
  width: '20px',
  paddingRight: '12px',
  verticalAlign: 'middle',
};

const iconStyle: React.CSSProperties = {
  display: 'block',
  width: '20px',
  height: '20px',
};

const labelCellStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  fontWeight: 700,
  color: colors.surface.card,
  textAlign: 'left',
  verticalAlign: 'middle',
};
