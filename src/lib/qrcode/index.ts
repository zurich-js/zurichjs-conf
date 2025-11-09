/**
 * QR Code Generation Utilities
 * Generates QR codes for ticket validation
 */

import QRCode from 'qrcode';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * Generate a QR code data URL for a ticket
 * The QR code contains the ticket ID which can be scanned for validation
 */
export async function generateTicketQRCode(ticketId: string): Promise<string> {
  console.log('[QRCode] Generating QR code data URL for ticket:', ticketId);

  try {
    // Create a validation URL that contains the ticket ID
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zurichjs-conf.vercel.app';
    const validationData = `${baseUrl}/validate/${ticketId}`;
    console.log('[QRCode] Data URL validation URL:', validationData);

    // Generate QR code as data URL (base64 encoded PNG)
    const qrCodeDataUrl = await QRCode.toDataURL(validationData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High error correction for better scanning
    });

    console.log('[QRCode] ✅ Data URL generated, length:', qrCodeDataUrl.length, 'chars');
    return qrCodeDataUrl;
  } catch (error) {
    console.error('[QRCode] ❌ Error generating QR code data URL:', error);
    console.error('[QRCode] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate and store QR code for a ticket in Supabase storage
 * Returns the public URL of the uploaded QR code OR falls back to data URL
 */
export async function generateAndStoreTicketQRCode(
  ticketId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  console.log('[QRCode] Starting QR code generation and storage for ticket:', ticketId);

  try {
    const supabase = createServiceRoleClient();

    // Generate QR code as buffer
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zurichjs-conf.vercel.app';
    const validationData = `${baseUrl}/validate/${ticketId}`;
    console.log('[QRCode] Validation URL:', validationData);

    console.log('[QRCode] Generating QR code buffer...');
    const qrCodeBuffer = await QRCode.toBuffer(validationData, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });
    console.log('[QRCode] QR code buffer generated, size:', qrCodeBuffer.length, 'bytes');

    // Upload to Supabase storage
    const fileName = `${ticketId}.png`;
    console.log('[QRCode] Uploading to Supabase storage bucket "ticket-qrcodes", filename:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-qrcodes')
      .upload(fileName, qrCodeBuffer, {
        contentType: 'image/png',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('[QRCode] ⚠️ Storage upload failed:', {
        message: uploadError.message,
        name: uploadError.name,
      });
      console.log('[QRCode] Falling back to data URL generation...');

      // Fallback: Generate data URL instead
      try {
        const dataUrl = await generateTicketQRCode(ticketId);
        console.log('[QRCode] ✅ Fallback data URL generated successfully');
        return {
          success: true,
          url: dataUrl,
          error: `Storage failed (${uploadError.message}), using data URL fallback`,
        };
      } catch (fallbackError) {
        console.error('[QRCode] ❌ Fallback data URL generation also failed:', fallbackError);
        return {
          success: false,
          error: `Storage and fallback both failed: ${uploadError.message}`,
        };
      }
    }

    console.log('[QRCode] Upload successful, path:', uploadData?.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('ticket-qrcodes')
      .getPublicUrl(fileName);

    console.log('[QRCode] ✅ Public URL retrieved:', urlData.publicUrl);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('[QRCode] ❌ Unexpected error in generateAndStoreTicketQRCode:', error);
    console.log('[QRCode] Attempting data URL fallback...');

    // Final fallback: try to generate data URL
    try {
      const dataUrl = await generateTicketQRCode(ticketId);
      console.log('[QRCode] ✅ Emergency fallback data URL generated');
      return {
        success: true,
        url: dataUrl,
        error: `Storage error, using data URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    } catch (fallbackError) {
      console.error('[QRCode] ❌ All QR code generation attempts failed:', fallbackError);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Validate a ticket by its ID
 * Used when scanning QR codes at the venue
 */
export async function validateTicket(
  ticketId: string
): Promise<{
  valid: boolean;
  ticket?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    ticketType: string;
    checkedIn: boolean;
  };
  error?: string;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Fetch ticket from database
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return {
        valid: false,
        error: 'Ticket not found',
      };
    }

    // Type assertion to help TypeScript
    const typedTicket = ticket as {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      ticket_type: string;
      status: string;
      checked_in: boolean | null;
    };

    // Check if ticket is valid
    if (typedTicket.status !== 'confirmed') {
      return {
        valid: false,
        error: 'Ticket is not confirmed',
      };
    }

    return {
      valid: true,
      ticket: {
        id: typedTicket.id,
        firstName: typedTicket.first_name,
        lastName: typedTicket.last_name,
        email: typedTicket.email,
        ticketType: typedTicket.ticket_type,
        checkedIn: typedTicket.checked_in || false,
      },
    };
  } catch (error) {
    console.error('[QRCode] Error validating ticket:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a ticket as checked in
 */
export async function checkInTicket(
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('tickets')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[QRCode] Error checking in ticket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
