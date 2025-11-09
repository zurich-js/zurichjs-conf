/**
 * PDF Generation Module
 * Handles generation of PDF tickets
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { TicketPDF, type TicketPDFProps } from './ticket-pdf';

/**
 * Generate a PDF ticket and return as buffer
 */
export async function generateTicketPDF(props: TicketPDFProps): Promise<Buffer> {
  try {
    console.log('[PDF] Generating PDF for ticket:', props.ticketId);

    const pdfDocument = <TicketPDF {...props} />;
    const pdfBuffer = await renderToBuffer(pdfDocument);

    console.log('[PDF] ✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    return pdfBuffer;
  } catch (error) {
    console.error('[PDF] ❌ Error generating PDF:', error);
    throw error;
  }
}

/**
 * Convert image URL to base64 data URL
 * Required for embedding images in PDF
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  try {
    console.log('[PDF] Fetching image from URL:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Detect content type
    const contentType = response.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log('[PDF] ✅ Image converted to data URL, size:', base64.length, 'chars');
    return dataUrl;
  } catch (error) {
    console.error('[PDF] ❌ Error converting image to data URL:', error);
    throw error;
  }
}

export type { TicketPDFProps } from './ticket-pdf';
