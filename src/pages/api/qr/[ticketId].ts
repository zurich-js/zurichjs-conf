/**
 * QR Code Generation API Endpoint
 * Generates QR code images for tickets
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { generateTicketQRCode } from '@/lib/qrcode';
import { logger } from '@/lib/logger';

const log = logger.scope('QR Code API');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { ticketId } = req.query;

  if (!ticketId || typeof ticketId !== 'string') {
    res.status(400).json({ error: 'Invalid ticket ID' });
    return;
  }

  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await generateTicketQRCode(ticketId);

    // Extract base64 data from data URL
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Set headers and send image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow emails to load the image
    res.send(imageBuffer);
  } catch (error) {
    log.error('Error generating QR code', error);
    res.status(500).json({
      error: 'Failed to generate QR code',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
