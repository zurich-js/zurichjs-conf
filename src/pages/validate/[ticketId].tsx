/**
 * Ticket Validation Page
 * Displays when a QR code is scanned
 * Allows event staff to validate and check in tickets
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';

interface TicketData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ticketType: string;
  checkedIn: boolean;
}

interface ValidationResponse {
  valid: boolean;
  ticket?: TicketData;
  error?: string;
}

interface CheckInResponse {
  success: boolean;
  alreadyCheckedIn?: boolean;
  ticket?: TicketData;
  message?: string;
  error?: string;
}

export default function ValidateTicketPage() {
  const router = useRouter();
  const { ticketId } = router.query;
  const [loading, setLoading] = useState(true);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInResponse | null>(null);

  useEffect(() => {
    if (!ticketId || typeof ticketId !== 'string') return;

    async function validateTicket() {
      setLoading(true);
      try {
        const response = await fetch(`/api/validate/${ticketId}`);
        const data: ValidationResponse = await response.json();
        setValidationData(data);
      } catch (error) {
        console.error('Error validating ticket:', error);
        setValidationData({
          valid: false,
          error: 'Failed to validate ticket',
        });
      } finally {
        setLoading(false);
      }
    }

    validateTicket();
  }, [ticketId]);

  const handleCheckIn = async () => {
    if (!ticketId || typeof ticketId !== 'string') return;

    setCheckingIn(true);
    try {
      const response = await fetch(`/api/validate/${ticketId}`, {
        method: 'POST',
      });
      const data: CheckInResponse = await response.json();
      setCheckInData(data);

      // Update validation data to reflect check-in status
      if (data.success && validationData?.ticket) {
        setValidationData({
          ...validationData,
          ticket: {
            ...validationData.ticket,
            checkedIn: true,
          },
        });
      }
    } catch (error) {
      console.error('Error checking in ticket:', error);
      setCheckInData({
        success: false,
        error: 'Failed to check in ticket',
      });
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <>
      <Head>
        <title>Validate Ticket - ZurichJS Conference 2026</title>
      </Head>

      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>ZurichJS Conference 2026</h1>
          <h2 style={subtitleStyle}>Ticket Validation</h2>

          {loading && (
            <div style={statusBoxStyle}>
              <p style={statusTextStyle}>Validating ticket...</p>
            </div>
          )}

          {!loading && validationData && (
            <>
              {validationData.valid && validationData.ticket ? (
                <>
                  <div style={{ ...statusBoxStyle, ...validStatusStyle }}>
                    <div style={statusIconStyle}>✓</div>
                    <p style={statusTextStyle}>Valid Ticket</p>
                  </div>

                  <div style={ticketInfoStyle}>
                    <div style={infoRowStyle}>
                      <span style={labelStyle}>Name:</span>
                      <span style={valueStyle}>
                        {validationData.ticket.firstName} {validationData.ticket.lastName}
                      </span>
                    </div>
                    <div style={infoRowStyle}>
                      <span style={labelStyle}>Email:</span>
                      <span style={valueStyle}>{validationData.ticket.email}</span>
                    </div>
                    <div style={infoRowStyle}>
                      <span style={labelStyle}>Ticket Type:</span>
                      <span style={valueStyle}>{validationData.ticket.ticketType}</span>
                    </div>
                    <div style={infoRowStyle}>
                      <span style={labelStyle}>Status:</span>
                      <span
                        style={{
                          ...valueStyle,
                          color: validationData.ticket.checkedIn ? '#16a34a' : '#ea580c',
                          fontWeight: 600,
                        }}
                      >
                        {validationData.ticket.checkedIn ? 'Already Checked In' : 'Not Checked In'}
                      </span>
                    </div>
                  </div>

                  {!validationData.ticket.checkedIn && (
                    <button
                      onClick={handleCheckIn}
                      disabled={checkingIn}
                      style={checkInButtonStyle}
                    >
                      {checkingIn ? 'Checking In...' : 'Check In Ticket'}
                    </button>
                  )}

                  {checkInData && (
                    <div
                      style={{
                        ...messageBoxStyle,
                        ...(checkInData.success ? successMessageStyle : errorMessageStyle),
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        {checkInData.message || checkInData.error || 'Unknown response'}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ ...statusBoxStyle, ...invalidStatusStyle }}>
                  <div style={statusIconStyle}>✗</div>
                  <p style={statusTextStyle}>Invalid Ticket</p>
                  <p style={errorTextStyle}>{validationData.error || 'Ticket not found'}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Styles
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  backgroundColor: '#f3f4f6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '40px',
  maxWidth: '500px',
  width: '100%',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#111827',
  textAlign: 'center',
  marginTop: 0,
  marginBottom: '8px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '18px',
  color: '#6b7280',
  textAlign: 'center',
  marginTop: 0,
  marginBottom: '32px',
  fontWeight: 'normal',
};

const statusBoxStyle: React.CSSProperties = {
  padding: '24px',
  borderRadius: '8px',
  textAlign: 'center',
  marginBottom: '24px',
};

const validStatusStyle: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  border: '2px solid #16a34a',
};

const invalidStatusStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  border: '2px solid #dc2626',
};

const statusIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '8px',
};

const statusTextStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  margin: 0,
  color: '#111827',
};

const errorTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '8px',
};

const ticketInfoStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px 0',
  borderBottom: '1px solid #e5e7eb',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  color: '#374151',
};

const valueStyle: React.CSSProperties = {
  color: '#111827',
};

const checkInButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#F1E271',
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#000000',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const messageBoxStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '12px',
  borderRadius: '6px',
  fontSize: '14px',
};

const successMessageStyle: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  color: '#15803d',
};

const errorMessageStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  color: '#991b1b',
};
