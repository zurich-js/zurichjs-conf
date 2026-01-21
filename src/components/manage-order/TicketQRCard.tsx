/**
 * Ticket QR Code Card
 * Displays the QR code for ticket check-in
 */

import Image from 'next/image';

interface TicketQRCardProps {
  qrCodeUrl?: string | null;
}

export function TicketQRCard({ qrCodeUrl }: TicketQRCardProps) {
  return (
    <div className="bg-black rounded-2xl p-8 mb-8">
      <h2 className="text-xl font-bold text-brand-primary mb-6 text-center">Your Entry Pass</h2>
      <div className="flex flex-col items-center">
        {qrCodeUrl ? (
          <>
            <div className="bg-white p-6 rounded-xl mb-4">
              <Image src={qrCodeUrl} alt="Ticket QR Code" width={300} height={300} className="w-64 h-64" />
            </div>
            <p className="text-gray-400 text-sm text-center max-w-md">
              Present this QR code at the venue entrance for check-in. You can also show this from your email or download
              the PDF ticket.
            </p>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-gray-800 p-8 rounded-xl mb-4">
              <p className="text-gray-400 text-lg mb-2">QR Code Generating...</p>
              <p className="text-gray-500 text-sm">
                Your QR code is being generated. Please check your email for the full ticket with QR code, or refresh this
                page in a few moments.
              </p>
            </div>
            <p className="text-gray-400 text-sm max-w-md">
              If you continue to see this message, please contact us at hello@zurichjs.com
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
