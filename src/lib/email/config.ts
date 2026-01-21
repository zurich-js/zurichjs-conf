/**
 * Email Service Configuration
 * Resend client initialization and shared utilities
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';

export const log = logger.scope('Email');

/**
 * Delay utility for rate limiting
 * @param ms Milliseconds to delay
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Initialize Resend client
 */
export const getResendClient = (): Resend => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured in environment variables');
  }

  return new Resend(apiKey);
};

/**
 * Email configuration
 */
export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'ZurichJS Conference <hello@zurichjs.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'hello@zurichjs.com',
  supportEmail: 'hello@zurichjs.com',
};
