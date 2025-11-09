/**
 * Email Rendering Utilities
 * Helper functions for rendering and sending React Email templates
 */

import { render } from '@react-email/render';
import type { ReactElement } from 'react';

/**
 * Render React Email component to HTML string
 * Optimized for production use with inlined styles
 */
export function renderEmail(component: ReactElement): Promise<string> {
  return render(component, {
    pretty: process.env.NODE_ENV === 'development',
  });
}

/**
 * Render React Email component to plain text
 * Useful for email clients that don't support HTML
 */
export function renderEmailText(component: ReactElement): Promise<string> {
  return render(component, {
    plainText: true,
  });
}

/**
 * Generate ticket ID in format: ZJS2026-XXXXX
 */
export function generateTicketId(edition: string = 'ZJS2026'): string {
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${edition}-${randomPart}`;
}

/**
 * Format currency for display in emails
 */
export function formatCurrency(
  amount: number,
  currency: string = 'CHF',
  locale: string = 'en-CH'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date for display in emails
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
}

/**
 * Format time for display in emails
 */
export function formatTime(
  date: Date | string,
  locale: string = 'en-US',
  timezone: string = 'Europe/Zurich'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(dateObj);
}

/**
 * Get timezone abbreviation (e.g., "CEST" for Central European Summer Time)
 */
export function getTimezoneAbbr(
  date: Date | string,
  timezone: string = 'Europe/Zurich'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(dateObj);

  // Extract timezone abbreviation from formatted string
  const match = formatted.match(/\b[A-Z]{3,5}\b/);
  return match ? match[0] : '';
}

/**
 * Extract first name from full name
 */
export function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

/**
 * Generate Apple Wallet pass URL
 * In production, this should generate an actual .pkpass file
 */
export function generateAppleWalletUrl(ticketId: string, baseUrl: string): string {
  return `${baseUrl}/wallet/apple/${ticketId}`;
}

/**
 * Generate Google Wallet pass URL
 * In production, this should generate a JWT-based URL
 */
export function generateGoogleWalletUrl(ticketId: string, baseUrl: string): string {
  return `${baseUrl}/wallet/google/${ticketId}`;
}

/**
 * Generate calendar add URL (ICS format)
 */
export function generateCalendarUrl(
  eventName: string,
  startDate: Date,
  endDate: Date,
  location: string,
  description: string,
  baseUrl: string
): string {
  const params = new URLSearchParams({
    name: eventName,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    location,
    description,
  });

  return `${baseUrl}/calendar/add?${params.toString()}`;
}

/**
 * Generate Google Maps URL for venue
 */
export function generateMapsUrl(address: string): string {
  const encodedAddress = encodeURIComponent(address.replace(/\n/g, ' '));
  return `https://maps.google.com/?q=${encodedAddress}`;
}

/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
