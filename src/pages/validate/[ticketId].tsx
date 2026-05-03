/**
 * Ticket & Workshop Validation Page
 * Displays when a QR code is scanned
 * Allows event staff to validate and check in tickets or workshop registrations
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

interface WorkshopData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  workshopTitle: string;
  checkedIn: boolean;
}

interface ValidationResponse {
  valid: boolean;
  type?: 'ticket' | 'workshop';
  ticket?: TicketData;
  registration?: WorkshopData;
  error?: string;
}

interface CheckInResponse {
  success: boolean;
  alreadyCheckedIn?: boolean;
  type?: 'ticket' | 'workshop';
  ticket?: TicketData;
  registration?: WorkshopData;
  message?: string;
  error?: string;
}

export default function ValidateTicketPage() {
  const router = useRouter();
  const { ticketId } = router.query;
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInData, setCheckInData] = useState<CheckInResponse | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/verify');
        if (!response.ok) { router.push('/'); return; }
        setCheckingAuth(false);
      } catch { router.push('/'); }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!ticketId || typeof ticketId !== 'string' || checkingAuth) return;
    async function validate() {
      setLoading(true);
      try {
        const response = await fetch(`/api/validate/${ticketId}`);
        const data: ValidationResponse = await response.json();
        setValidationData(data);
      } catch {
        setValidationData({ valid: false, error: 'Failed to validate' });
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [ticketId, checkingAuth]);

  const handleCheckIn = async () => {
    if (!ticketId || typeof ticketId !== 'string') return;
    setCheckingIn(true);
    try {
      const response = await fetch(`/api/validate/${ticketId}`, { method: 'POST' });
      if (response.status === 401) { router.push('/'); return; }
      const data: CheckInResponse = await response.json();
      setCheckInData(data);
      if (data.success && validationData) {
        if (validationData.type === 'ticket' && validationData.ticket) {
          setValidationData({ ...validationData, ticket: { ...validationData.ticket, checkedIn: true } });
        } else if (validationData.type === 'workshop' && validationData.registration) {
          setValidationData({ ...validationData, registration: { ...validationData.registration, checkedIn: true } });
        }
      }
    } catch {
      setCheckInData({ success: false, error: 'Failed to check in' });
    } finally {
      setCheckingIn(false);
    }
  };

  const isWorkshop = validationData?.type === 'workshop';
  const entry = isWorkshop ? validationData?.registration : validationData?.ticket;
  const isCheckedIn = entry?.checkedIn ?? false;

  return (
    <>
      <Head>
        <title>{isWorkshop ? 'Workshop Check-In' : 'Validate Ticket'} - ZurichJS Conference 2026</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={containerStyle}>
        <div style={cardStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={logoBadgeStyle}>
              {isWorkshop ? '🎓' : '🎫'}
            </div>
            <h1 style={titleStyle}>ZurichJS Conf 2026</h1>
            <p style={subtitleStyle}>{isWorkshop ? 'Workshop Check-In' : 'Ticket Validation'}</p>
          </div>

          {/* Loading states */}
          {(checkingAuth || (!checkingAuth && loading)) && (
            <div style={loadingBoxStyle}>
              <div style={spinnerStyle} />
              <p style={{ ...statusTextStyle, fontSize: '16px', color: '#6b7280' }}>
                {checkingAuth ? 'Verifying access...' : 'Validating...'}
              </p>
            </div>
          )}

          {/* Validation result */}
          {!checkingAuth && !loading && validationData && (
            <>
              {validationData.valid && entry ? (
                <>
                  {/* Status badge */}
                  <div style={{ ...statusBadgeStyle, ...(isCheckedIn ? checkedInBadgeStyle : validBadgeStyle) }}>
                    <span style={{ fontSize: '20px' }}>{isCheckedIn ? '✅' : '✓'}</span>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>
                      {isCheckedIn ? 'Already Checked In' : isWorkshop ? 'Valid Registration' : 'Valid Ticket'}
                    </span>
                  </div>

                  {/* Workshop title — full width, prominent */}
                  {isWorkshop && validationData.registration && (
                    <div style={workshopTitleCardStyle}>
                      <p style={workshopLabelStyle}>Workshop</p>
                      <p style={workshopNameStyle}>{validationData.registration.workshopTitle}</p>
                    </div>
                  )}

                  {/* Attendee details */}
                  <div style={detailsCardStyle}>
                    <InfoRow label={isWorkshop ? 'Attendee' : 'Name'} value={`${entry.firstName} ${entry.lastName}`} />
                    <InfoRow label="Email" value={entry.email} />
                    {!isWorkshop && validationData.ticket && (
                      <InfoRow label="Type" value={validationData.ticket.ticketType} />
                    )}
                  </div>

                  {/* Check-in button */}
                  {!isCheckedIn && (
                    <button onClick={handleCheckIn} disabled={checkingIn} style={checkInButtonStyle}>
                      {checkingIn ? 'Checking In...' : isWorkshop ? 'Check In Attendee' : 'Check In Ticket'}
                    </button>
                  )}

                  {/* Check-in result message */}
                  {checkInData && (
                    <div style={{ ...messageBoxStyle, ...(checkInData.success ? successMsgStyle : errorMsgStyle) }}>
                      {checkInData.message || checkInData.error}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ ...statusBadgeStyle, ...invalidBadgeStyle }}>
                  <span style={{ fontSize: '20px' }}>❌</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>Invalid</p>
                    <p style={{ fontSize: '13px', color: '#991b1b', margin: '4px 0 0' }}>
                      {validationData.error || 'Not found'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRowStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <span style={infoValueStyle}>{value}</span>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  backgroundColor: '#0a0a0a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '20px',
  padding: '24px',
  maxWidth: '440px',
  width: '100%',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
};

const logoBadgeStyle: React.CSSProperties = {
  fontSize: '36px',
  marginBottom: '8px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#111827',
  margin: '0 0 4px',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  margin: 0,
  fontWeight: 'normal',
};

const loadingBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  padding: '32px 0',
};

const spinnerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '3px solid #e5e7eb',
  borderTopColor: '#F1E271',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const statusBadgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '14px 16px',
  borderRadius: '12px',
  marginBottom: '16px',
};

const validBadgeStyle: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  border: '1px solid #86efac',
  color: '#15803d',
};

const checkedInBadgeStyle: React.CSSProperties = {
  backgroundColor: '#dbeafe',
  border: '1px solid #93c5fd',
  color: '#1d4ed8',
};

const invalidBadgeStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  border: '1px solid #fca5a5',
  color: '#991b1b',
};

const workshopTitleCardStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '14px 16px',
  marginBottom: '12px',
};

const workshopLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 6px',
};

const workshopNameStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#111827',
  margin: 0,
  lineHeight: 1.4,
};

const detailsCardStyle: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '4px 16px',
  marginBottom: '20px',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: '12px 0',
  borderBottom: '1px solid #e5e7eb',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 500,
  color: '#111827',
  wordBreak: 'break-word',
};

const statusTextStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  margin: 0,
  color: '#111827',
};

const checkInButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#F1E271',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#000000',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const messageBoxStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '12px 16px',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: 500,
};

const successMsgStyle: React.CSSProperties = {
  backgroundColor: '#dcfce7',
  color: '#15803d',
};

const errorMsgStyle: React.CSSProperties = {
  backgroundColor: '#fee2e2',
  color: '#991b1b',
};
