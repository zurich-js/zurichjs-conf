import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { verifyAdminAccess } from '@/lib/admin/auth';
import {
  archiveWorkshopOfferingForSession,
  createWorkshopOfferingForSession,
  getWorkshopOfferingBySessionId,
  updateWorkshopOfferingForSession,
  validateWorkshopStripeLookup,
} from '@/lib/program/workshop-offerings';

const OfferingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  room: z.string().nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  stripe_product_id: z.string().nullable().optional(),
  stripe_price_lookup_key: z.string().nullable().optional(),
  stripe_validation: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed', 'archived']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),
});

const ValidateSchema = z.object({
  lookupKey: z.string().min(1),
  stripeProductId: z.string().nullable().optional(),
  store: z.boolean().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const { sessionId } = req.query;
  if (typeof sessionId !== 'string') return res.status(400).json({ error: 'Invalid session id' });

  if (req.method === 'GET') {
    const result = await getWorkshopOfferingBySessionId(sessionId);
    if (result.error) return res.status(500).json({ error: result.error });
    return res.status(200).json({ offering: result.offering });
  }

  if (req.method === 'POST') {
    if ('lookupKey' in (req.body ?? {})) {
      const parsed = ValidateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
      }

      const result = await validateWorkshopStripeLookup({
        lookupKey: parsed.data.lookupKey,
        stripeProductId: parsed.data.stripeProductId,
      });
      if (result.error || !result.validation) {
        return res.status(500).json({ error: result.error || 'Failed to validate Stripe lookup key' });
      }

      if (parsed.data.store) {
        await updateWorkshopOfferingForSession(sessionId, {
          stripe_price_lookup_key: parsed.data.lookupKey,
          stripe_product_id: parsed.data.stripeProductId ?? null,
          stripe_validation: result.validation as unknown as Record<string, unknown>,
        });
      }

      return res.status(200).json({ validation: result.validation });
    }

    const parsed = OfferingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
    }

    const result = await createWorkshopOfferingForSession({
      session_id: sessionId,
      ...parsed.data,
    });
    if (result.error || !result.offering) {
      return res.status(400).json({ error: result.error || 'Failed to create offering' });
    }

    return res.status(201).json({ offering: result.offering });
  }

  if (req.method === 'PATCH') {
    const parsed = OfferingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body', issues: parsed.error.issues });
    }

    const result = await updateWorkshopOfferingForSession(sessionId, parsed.data);
    if (result.error || !result.offering) {
      return res.status(400).json({ error: result.error || 'Failed to update offering' });
    }

    return res.status(200).json({ offering: result.offering });
  }

  if (req.method === 'DELETE') {
    const result = await archiveWorkshopOfferingForSession(sessionId);
    if (result.error || !result.offering) {
      return res.status(400).json({ error: result.error || 'Failed to archive offering' });
    }

    return res.status(200).json({ offering: result.offering });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
