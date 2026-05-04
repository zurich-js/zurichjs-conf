/**
 * Ticket & Workshop Registration Validation API Endpoint
 * Validates tickets or workshop registrations by scanning QR codes
 * and marks them as checked in.
 *
 * The shared route first checks the tickets table, then falls back
 * to workshop_registrations.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateTicket, checkInTicket, validateWorkshopRegistration, checkInWorkshopRegistration } from '@/lib/qrcode';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Validation API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { ticketId: id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }

  // GET: Validate ticket or workshop registration (read-only check)
  if (req.method === 'GET') {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      res.status(401).json({ valid: false, error: 'Unauthorized - Admin access required' });
      return;
    }

    try {
      // Try ticket first
      const ticketResult = await validateTicket(id);
      if (ticketResult.valid) {
        res.status(200).json({ valid: true, type: 'ticket', ticket: ticketResult.ticket });
        return;
      }

      // Fall back to workshop registration
      const workshopResult = await validateWorkshopRegistration(id);
      if (workshopResult.valid) {
        res.status(200).json({ valid: true, type: 'workshop', registration: workshopResult.registration });
        return;
      }

      res.status(404).json({ valid: false, error: 'Ticket or registration not found' });
    } catch (error) {
      log.error('Error validating', error);
      res.status(500).json({ valid: false, error: 'Failed to validate' });
    }
    return;
  }

  // POST: Check in ticket or workshop registration
  if (req.method === 'POST') {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      res.status(401).json({ success: false, error: 'Unauthorized - Admin access required' });
      return;
    }

    try {
      // Try ticket first
      const ticketResult = await validateTicket(id);
      if (ticketResult.valid) {
        if (ticketResult.ticket?.checkedIn) {
          res.status(200).json({ success: true, alreadyCheckedIn: true, type: 'ticket', ticket: ticketResult.ticket, message: 'Already checked in' });
          return;
        }
        const checkIn = await checkInTicket(id);
        if (!checkIn.success) {
          res.status(500).json({ success: false, error: checkIn.error || 'Failed to check in' });
          return;
        }
        res.status(200).json({ success: true, alreadyCheckedIn: false, type: 'ticket', ticket: ticketResult.ticket, message: 'Checked in successfully' });
        return;
      }

      // Fall back to workshop registration
      const workshopResult = await validateWorkshopRegistration(id);
      if (workshopResult.valid) {
        if (workshopResult.registration?.checkedIn) {
          res.status(200).json({ success: true, alreadyCheckedIn: true, type: 'workshop', registration: workshopResult.registration, message: 'Already checked in' });
          return;
        }
        const checkIn = await checkInWorkshopRegistration(id);
        if (!checkIn.success) {
          res.status(500).json({ success: false, error: checkIn.error || 'Failed to check in' });
          return;
        }
        res.status(200).json({ success: true, alreadyCheckedIn: false, type: 'workshop', registration: workshopResult.registration, message: 'Checked in successfully' });
        return;
      }

      res.status(404).json({ success: false, error: 'Ticket or registration not found' });
    } catch (error) {
      log.error('Error checking in', error);
      res.status(500).json({ success: false, error: 'Failed to check in' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
