/**
 * Admin Authentication Utilities
 * Simple password-based authentication for admin dashboard
 */

import { serverEnv } from '@/config/env';

/**
 * Verify admin password
 */
export function verifyAdminPassword(password: string): boolean {
  return password === serverEnv.admin.password;
}

/**
 * Session token generation (simple approach)
 * In production, use proper JWT or session management
 */
export function generateAdminToken(): string {
  // Simple token generation - in production use crypto.randomBytes or JWT
  return Buffer.from(`admin:${Date.now()}:${Math.random()}`).toString('base64');
}

/**
 * Verify admin token (basic check)
 * In production, use proper session validation
 */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, 'base64').toString();
    return decoded.startsWith('admin:');
  } catch {
    return false;
  }
}
