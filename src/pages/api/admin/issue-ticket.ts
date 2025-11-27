/**
 * Admin Manual Ticket Issuance API
 * POST /api/admin/issue-ticket - Manually issue a ticket
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken } from '@/lib/admin/auth';
import { createTicket } from '@/lib/tickets';
import type { TicketCategory, TicketStage, TicketType } from '@/lib/types/database';
import { TICKET_CATEGORIES, TICKET_STAGES } from '@/lib/types/ticket-constants';
import { sendTicketConfirmationEmailsQueued, type TicketConfirmationData } from '@/lib/email';
import { generateTicketPDF, imageUrlToDataUrl } from '@/lib/pdf';
import { generateOrderUrl } from '@/lib/auth/orderToken';

interface IssueTicketRequest {
  // Ticket type
  ticketCategory: TicketCategory;
  ticketStage: TicketStage;

  // Attendee details
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;

  // Payment type
  paymentType: 'complimentary' | 'stripe';

  // Stripe details (only required if paymentType is 'stripe')
  stripePaymentId?: string;
  amountPaid?: number;
  currency?: string;

  // Complimentary details
  complimentaryReason?: string;

  // Options
  sendEmail: boolean;
}

/**
 * Map category/stage to legacy ticket type
 */
function toLegacyType(category: TicketCategory, stage: TicketStage): TicketType {
  if (category === 'vip') return 'vip';
  if (category === 'student') return 'student';
  if (category === 'unemployed') return 'unemployed';
  if (stage === 'blind_bird') return 'blind_bird';
  if (stage === 'early_bird') return 'early_bird';
  if (stage === 'late_bird') return 'late_bird';
  return 'standard';
}

/**
 * Get display name for ticket
 */
function getTicketDisplayName(category: TicketCategory, stage: TicketStage): string {
  if (category === 'vip') return 'VIP Ticket';
  if (category === 'student') return 'Student Ticket';
  if (category === 'unemployed') return 'Unemployed Ticket';

  const stageNames: Record<TicketStage, string> = {
    blind_bird: 'Blind Bird',
    early_bird: 'Early Bird',
    general_admission: 'Standard',
    late_bird: 'Late Bird',
  };

  return stageNames[stage] || 'Conference Ticket';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.cookies.admin_token;
    if (!verifyAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body as IssueTicketRequest;

    // Validate required fields
    if (!body.ticketCategory || !body.ticketStage) {
      return res.status(400).json({ error: 'Ticket category and stage are required' });
    }

    if (!body.firstName || !body.lastName || !body.email) {
      return res.status(400).json({ error: 'Attendee details are required' });
    }

    if (!body.paymentType) {
      return res.status(400).json({ error: 'Payment type is required' });
    }

    // Validate ticket category and stage
    if (!(TICKET_CATEGORIES as readonly string[]).includes(body.ticketCategory)) {
      return res.status(400).json({ error: 'Invalid ticket category' });
    }

    if (!(TICKET_STAGES as readonly string[]).includes(body.ticketStage)) {
      return res.status(400).json({ error: 'Invalid ticket stage' });
    }

    // Validate stripe payment if applicable
    if (body.paymentType === 'stripe') {
      if (!body.stripePaymentId) {
        return res.status(400).json({ error: 'Stripe payment ID is required for paid tickets' });
      }
      if (body.amountPaid === undefined || body.amountPaid < 0) {
        return res.status(400).json({ error: 'Valid amount is required for paid tickets' });
      }
    }

    // Prepare ticket data
    const ticketType = toLegacyType(body.ticketCategory, body.ticketStage);
    const isComplimentary = body.paymentType === 'complimentary';

    // Generate unique session ID for manual tickets
    const manualSessionId = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create the ticket
    const ticketResult = await createTicket({
      ticketType,
      ticketCategory: body.ticketCategory,
      ticketStage: body.ticketStage,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      company: body.company || null,
      jobTitle: body.jobTitle || null,
      stripeCustomerId: isComplimentary ? `comp_${manualSessionId}` : `stripe_${body.stripePaymentId}`,
      stripeSessionId: manualSessionId,
      stripePaymentIntentId: isComplimentary ? undefined : body.stripePaymentId,
      amountPaid: isComplimentary ? 0 : (body.amountPaid || 0),
      currency: body.currency || 'CHF',
      status: 'confirmed',
      metadata: {
        issuedManually: true,
        issuedAt: new Date().toISOString(),
        paymentType: body.paymentType,
        complimentaryReason: isComplimentary ? body.complimentaryReason : undefined,
        stripePaymentId: body.stripePaymentId,
      },
    });

    if (!ticketResult.success || !ticketResult.ticket) {
      console.error('Failed to create ticket:', ticketResult.error);
      return res.status(500).json({ error: ticketResult.error || 'Failed to create ticket' });
    }

    const ticket = ticketResult.ticket;

    // Send confirmation email if requested
    if (body.sendEmail) {
      try {
        const ticketDisplayName = getTicketDisplayName(body.ticketCategory, body.ticketStage);
        const attendeeName = `${body.firstName} ${body.lastName}`;

        // Generate PDF if QR code is available
        let pdfBuffer: Buffer | undefined;
        if (ticket.qr_code_url) {
          try {
            const qrCodeDataUrl = await imageUrlToDataUrl(ticket.qr_code_url);
            pdfBuffer = await generateTicketPDF({
              ticketId: ticket.id,
              attendeeName,
              attendeeEmail: body.email,
              ticketType: ticketDisplayName,
              orderNumber: ticket.id,
              amountPaid: ticket.amount_paid,
              currency: body.currency || 'CHF',
              conferenceDate: 'September 11, 2026',
              conferenceName: 'ZurichJS Conference 2026',
              venueName: 'Technopark Zürich',
              venueAddress: 'Technoparkstrasse 1, 8005 Zürich',
              qrCodeDataUrl,
              notes: isComplimentary ? 'Complimentary ticket' : undefined,
            });
          } catch (pdfError) {
            console.error('Error generating PDF:', pdfError);
            // Continue without PDF
          }
        }

        // Generate order URL
        const orderUrl = generateOrderUrl(ticket.id);

        // Prepare email data
        const emailData: TicketConfirmationData = {
          to: body.email,
          customerName: attendeeName,
          customerEmail: body.email,
          ticketType: ticketDisplayName,
          orderNumber: ticket.id,
          amountPaid: ticket.amount_paid,
          currency: body.currency || 'CHF',
          conferenceDate: 'September 11, 2026',
          conferenceName: 'ZurichJS Conference 2026',
          ticketId: ticket.id,
          qrCodeUrl: ticket.qr_code_url || undefined,
          orderUrl,
          notes: isComplimentary ? 'This is a complimentary ticket.' : undefined,
          pdfAttachment: pdfBuffer,
        };

        const emailResults = await sendTicketConfirmationEmailsQueued([emailData]);
        const emailSuccess = emailResults.some(r => r.success);

        if (!emailSuccess) {
          console.error('Failed to send confirmation email');
          // Don't fail the request, ticket was created
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the request, ticket was created
      }
    }

    return res.status(201).json({
      success: true,
      ticket: {
        id: ticket.id,
        firstName: ticket.first_name,
        lastName: ticket.last_name,
        email: ticket.email,
        ticketCategory: ticket.ticket_category,
        ticketStage: ticket.ticket_stage,
        amountPaid: ticket.amount_paid,
        currency: ticket.currency,
        status: ticket.status,
        createdAt: ticket.created_at,
      },
      emailSent: body.sendEmail,
    });
  } catch (error) {
    console.error('Admin issue ticket API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
