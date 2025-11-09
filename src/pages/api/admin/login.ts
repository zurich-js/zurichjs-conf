/**
 * Admin Login API
 * POST /api/admin/login
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminPassword, generateAdminToken } from '@/lib/admin/auth';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!verifyAdminPassword(password)) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate admin token
    const token = generateAdminToken();

    // Set HTTP-only cookie
    res.setHeader(
      'Set-Cookie',
      serialize('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      })
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
