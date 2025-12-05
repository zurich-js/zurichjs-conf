/**
 * B2B Invoice Attendees API
 * GET /api/admin/b2b-invoices/[id]/attendees - List attendees
 * POST /api/admin/b2b-invoices/[id]/attendees - Add attendees
 * DELETE /api/admin/b2b-invoices/[id]/attendees - Remove all attendees
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import {
  getAttendees,
  addAttendees,
  updateAttendee,
  deleteAttendee,
  deleteAllAttendees,
  parseAttendeesFromCSV,
  validateAttendeeCount,
} from '@/lib/b2b';
import type { AttendeeInput, UpdateAttendeeRequest } from '@/lib/types/b2b';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify admin authentication
  const token = req.cookies.admin_token;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid invoice ID' });
  }

  if (req.method === 'GET') {
    return handleGet(id, res);
  }

  if (req.method === 'POST') {
    return handlePost(id, req, res);
  }

  if (req.method === 'PUT') {
    return handleUpdate(req, res);
  }

  if (req.method === 'DELETE') {
    return handleDelete(id, req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET - List all attendees for an invoice
 */
async function handleGet(invoiceId: string, res: NextApiResponse) {
  try {
    const attendees = await getAttendees(invoiceId);
    const validation = await validateAttendeeCount(invoiceId);

    return res.status(200).json({
      attendees,
      validation,
    });
  } catch (error) {
    console.error('Error fetching attendees:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch attendees',
    });
  }
}

/**
 * POST - Add attendees (individual or bulk via CSV)
 */
async function handlePost(
  invoiceId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { attendees, csv } = req.body;

    // Handle CSV import
    if (csv && typeof csv === 'string') {
      const parseResult = parseAttendeesFromCSV(csv);

      if (parseResult.errors.length > 0 && parseResult.attendees.length === 0) {
        return res.status(400).json({
          error: 'CSV parsing failed',
          errors: parseResult.errors,
        });
      }

      if (parseResult.attendees.length === 0) {
        return res.status(400).json({ error: 'No valid attendees found in CSV' });
      }

      const created = await addAttendees(invoiceId, parseResult.attendees);
      const validation = await validateAttendeeCount(invoiceId);

      return res.status(201).json({
        attendees: created,
        validation,
        warnings: parseResult.warnings,
        errors: parseResult.errors,
      });
    }

    // Handle individual attendee(s)
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ error: 'Missing required field: attendees' });
    }

    // Validate attendee data
    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i] as AttendeeInput;
      if (!attendee.firstName || !attendee.lastName || !attendee.email) {
        return res.status(400).json({
          error: `Attendee ${i + 1}: firstName, lastName, and email are required`,
        });
      }
    }

    const created = await addAttendees(invoiceId, attendees);
    const validation = await validateAttendeeCount(invoiceId);

    return res.status(201).json({
      attendees: created,
      validation,
    });
  } catch (error) {
    console.error('Error adding attendees:', error);
    const message = error instanceof Error ? error.message : 'Failed to add attendees';

    if (message.includes('Cannot') || message.includes('not found')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}

/**
 * PUT - Update a single attendee
 */
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { attendeeId, ...data } = req.body;

    if (!attendeeId || typeof attendeeId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: attendeeId' });
    }

    const updateData: UpdateAttendeeRequest = data;
    const updated = await updateAttendee(attendeeId, updateData);

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating attendee:', error);
    const message = error instanceof Error ? error.message : 'Failed to update attendee';

    if (message.includes('Cannot') || message.includes('not found')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}

/**
 * DELETE - Delete attendee(s)
 */
async function handleDelete(
  invoiceId: string,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { attendeeId, deleteAll } = req.body;

    // Delete all attendees
    if (deleteAll === true) {
      await deleteAllAttendees(invoiceId);
      return res.status(200).json({ success: true, message: 'All attendees deleted' });
    }

    // Delete single attendee
    if (!attendeeId || typeof attendeeId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: attendeeId' });
    }

    await deleteAttendee(attendeeId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting attendee:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete attendee';

    if (message.includes('Cannot') || message.includes('not found')) {
      return res.status(400).json({ error: message });
    }

    return res.status(500).json({ error: message });
  }
}
