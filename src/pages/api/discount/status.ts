/**
 * Discount Status API
 * GET: Reads httpOnly cookies and returns discount state to the client.
 * Used on page reload to restore minimized/modal state.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerConfig } from '@/lib/discount/config';
import type { DiscountStatusResponse } from '@/lib/discount/types';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiscountStatusResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = req.cookies.discount_code;
  const expiresAt = req.cookies.discount_expires_at;
  const percentOffCookie = req.cookies.discount_percent_off;

  if (!code || !expiresAt) {
    return res.status(200).json({ active: false });
  }

  // Check if expired
  if (new Date(expiresAt) <= new Date()) {
    // Clear expired httpOnly cookies
    res.setHeader('Set-Cookie', [
      'discount_code=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'discount_expires_at=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'discount_percent_off=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ]);
    return res.status(200).json({ active: false });
  }

  const config = getServerConfig();
  // Use stored percentOff if available (for lottery discounts), otherwise fall back to config
  const percentOff = percentOffCookie ? parseInt(percentOffCookie, 10) : config.percentOff;

  return res.status(200).json({
    active: true,
    code,
    expiresAt,
    percentOff,
  });
}
