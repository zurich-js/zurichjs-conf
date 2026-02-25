/**
 * Ticket Validation API Endpoint
 * Validates tickets by scanning QR codes and marks them as checked in
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { validateTicket, checkInTicket } from '@/lib/qrcode';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { logger } from '@/lib/logger';

const log = logger.scope('Ticket Validation API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const { ticketId } = req.query;

  if (!ticketId || typeof ticketId !== 'string') {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }

  // GET: Validate ticket (read-only check)
  if (req.method === 'GET') {
    try {
      const result = await validateTicket(ticketId);

      if (!result.valid) {
        res.status(404).json({
          valid: false,
          error: result.error || 'Ticket not found or invalid',
        });
        return;
      }

      res.status(200).json({
        valid: true,
        ticket: result.ticket,
      });
    } catch (error) {
      log.error('Error validating ticket', error);
      res.status(500).json({
        valid: false,
        error: 'Failed to validate ticket',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  // POST: Check in ticket (mark as checked in)
  if (req.method === 'POST') {
    // Require admin authentication for check-in
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - Admin access required',
      });
      return;
    }

    try {
      // First validate the ticket
      const validationResult = await validateTicket(ticketId);

      if (!validationResult.valid) {
        res.status(404).json({
          success: false,
          error: validationResult.error || 'Ticket not found or invalid',
        });
        return;
      }

      // Check if already checked in
      if (validationResult.ticket?.checkedIn) {
        res.status(200).json({
          success: true,
          alreadyCheckedIn: true,
          ticket: validationResult.ticket,
          message: 'Ticket was already checked in',
        });
        return;
      }

      // Mark as checked in
      const checkInResult = await checkInTicket(ticketId);

      if (!checkInResult.success) {
        res.status(500).json({
          success: false,
          error: checkInResult.error || 'Failed to check in ticket',
        });
        return;
      }

      res.status(200).json({
        success: true,
        alreadyCheckedIn: false,
        ticket: validationResult.ticket,
        message: 'Ticket checked in successfully',
      });
    } catch (error) {
      log.error('Error checking in ticket', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check in ticket',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
