import { Hr, Link, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components';
import { colors, spacing, typography, radii } from '../design/tokens';

export interface NamespaceStudentSponsorshipEmailProps {
  submissionId: string;
  fullName: string;
  email: string;
  universityName: string;
  degreeName: string;
  githubUrl: string;
  codeUrl: string;
  setupInstructions: string;
  prideExplanation: string;
  anythingElse?: string;
  submittedAt: string;
  userAgent?: string;
  posthogSessionId?: string;
  posthogDistinctId?: string;
}

export const NamespaceStudentSponsorshipEmail: React.FC<
  NamespaceStudentSponsorshipEmailProps
> = ({
  submissionId,
  fullName,
  email,
  universityName,
  degreeName,
  githubUrl,
  codeUrl,
  setupInstructions,
  prideExplanation,
  anythingElse,
  submittedAt,
  userAgent,
  posthogSessionId,
  posthogDistinctId,
}) => {
  const preheader = `New Namespace Student Sponsorship submission from ${fullName}`;

  return (
    <EmailLayout preheader={preheader}>
      <Section style={headerSectionStyle}>
        <Text style={headerTitleStyle}>Namespace Student Sponsorship</Text>
        <Text style={headerSubtitleStyle}>
          New ZurichJS Conf 2026 student challenge submission.
        </Text>
      </Section>

      <Section style={cardStyle}>
        <Text style={sectionTitleStyle}>Applicant</Text>

        <DetailRow label="Name" value={fullName} />
        <DetailRow
          label="Email"
          value={<Link href={`mailto:${email}`} style={linkValueStyle}>{email}</Link>}
        />
        <DetailRow label="University" value={universityName} />
        <DetailRow label="Degree" value={degreeName} />
        <DetailRow
          label="GitHub"
          value={<Link href={githubUrl} style={linkValueStyle}>{githubUrl}</Link>}
        />

        <Hr style={dividerStyle} />

        <Text style={sectionTitleStyle}>Submission</Text>
        <DetailRow
          label="Code link"
          value={<Link href={codeUrl} style={linkValueStyle}>{codeUrl}</Link>}
        />

        <Text style={labelStyle}>Setup instructions</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{setupInstructions}</Text>
        </div>

        <Text style={labelWithSpacingStyle}>Why they are proud of it</Text>
        <div style={messageBoxStyle}>
          <Text style={messageTextStyle}>{prideExplanation}</Text>
        </div>

        {anythingElse && (
          <>
            <Text style={labelWithSpacingStyle}>Anything else</Text>
            <div style={messageBoxStyle}>
              <Text style={messageTextStyle}>{anythingElse}</Text>
            </div>
          </>
        )}

        <Hr style={dividerStyle} />

        <table style={metaTableStyle}>
          <tbody>
            <tr>
              <td style={metaLabelStyle}>Submission ID</td>
              <td style={metaValueStyle}>{submissionId}</td>
            </tr>
            <tr>
              <td style={metaLabelStyle}>Submitted</td>
              <td style={metaValueStyle}>{submittedAt}</td>
            </tr>
            {(posthogSessionId || posthogDistinctId) && (
              <tr>
                <td style={metaLabelStyle}>PostHog</td>
                <td style={metaValueStyle}>
                  {posthogSessionId && (
                    <Link
                      href={`https://eu.posthog.com/replay/${posthogSessionId}`}
                      style={metaLinkStyle}
                    >
                      Session Replay
                    </Link>
                  )}
                  {posthogSessionId && posthogDistinctId && ' | '}
                  {posthogDistinctId && (
                    <Link
                      href={`https://eu.posthog.com/persons?search=${posthogDistinctId}`}
                      style={metaLinkStyle}
                    >
                      Person & Events
                    </Link>
                  )}
                </td>
              </tr>
            )}
            {userAgent && (
              <tr>
                <td style={metaLabelStyle}>User Agent</td>
                <td style={metaValueStyle}>{userAgent}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Section style={footerSectionStyle}>
        <Text style={footerTextStyle}>
          Reply directly to this email to contact the applicant.
        </Text>
      </Section>
    </EmailLayout>
  );
};

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div style={detailRowStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </div>
  );
}

export default NamespaceStudentSponsorshipEmail;

const headerSectionStyle: React.CSSProperties = {
  backgroundColor: colors.brand.yellow,
  padding: spacing['2xl'],
  borderRadius: `${radii.button}px ${radii.button}px 0 0`,
  marginBottom: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: '24px',
  lineHeight: '32px',
  fontWeight: 700,
  color: colors.text.primary,
  margin: 0,
};

const headerSubtitleStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.secondary,
  margin: `${spacing.sm}px 0 0 0`,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface.card,
  border: `1px solid ${colors.border.default}`,
  borderTop: 'none',
  borderRadius: `0 0 ${radii.button}px ${radii.button}px`,
  padding: spacing['2xl'],
  marginBottom: spacing['2xl'],
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: typography.h2.fontSize,
  lineHeight: typography.h2.lineHeight,
  fontWeight: typography.h2.fontWeight,
  color: colors.text.primary,
  margin: `0 0 ${spacing.base}px 0`,
};

const detailRowStyle: React.CSSProperties = {
  marginBottom: spacing.base,
};

const labelStyle: React.CSSProperties = {
  fontSize: typography.label.fontSize,
  lineHeight: typography.label.lineHeight,
  fontWeight: typography.label.fontWeight,
  textTransform: typography.label.textTransform,
  letterSpacing: typography.label.letterSpacing,
  color: colors.text.muted,
  margin: `0 0 ${spacing.xs}px 0`,
};

const labelWithSpacingStyle: React.CSSProperties = {
  ...labelStyle,
  margin: `${spacing.lg}px 0 ${spacing.xs}px 0`,
};

const valueStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  color: colors.text.primary,
  margin: 0,
  fontWeight: 500,
};

const linkValueStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
  fontWeight: 500,
};

const dividerStyle: React.CSSProperties = {
  borderColor: colors.border.subtle,
  margin: `${spacing.lg}px 0`,
};

const messageBoxStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: `1px solid ${colors.border.default}`,
  borderRadius: `${radii.button}px`,
  padding: spacing.base,
  marginBottom: spacing.base,
};

const messageTextStyle: React.CSSProperties = {
  fontSize: typography.body.fontSize,
  lineHeight: '1.6',
  color: colors.text.secondary,
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
};

const metaTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const metaLabelStyle: React.CSSProperties = {
  ...labelStyle,
  width: '130px',
  verticalAlign: 'top',
  padding: `${spacing.xs}px ${spacing.base}px ${spacing.xs}px 0`,
};

const metaValueStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: colors.text.muted,
  padding: `${spacing.xs}px 0`,
  verticalAlign: 'top',
  wordBreak: 'break-word' as const,
};

const metaLinkStyle: React.CSSProperties = {
  color: colors.brand.blue,
  textDecoration: 'underline',
};

const footerSectionStyle: React.CSSProperties = {
  textAlign: 'center' as const,
  paddingTop: spacing.lg,
  borderTop: `1px solid ${colors.border.subtle}`,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: '18px',
  color: colors.text.muted,
  margin: 0,
};
