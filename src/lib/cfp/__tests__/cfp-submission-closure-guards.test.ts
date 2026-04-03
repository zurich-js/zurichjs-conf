import { describe, expect, it } from 'vitest';
import { canCreateSubmissionNow, canSubmitOrEditSubmission, getCfpCloseDate } from '../closure';

describe('submission closure guards', () => {
  it('blocks create after CFP close', () => {
    const closeDate = getCfpCloseDate();
    expect(canCreateSubmissionNow(new Date(closeDate.getTime() - 1))).toBe(true);
    expect(canCreateSubmissionNow(closeDate)).toBe(false);
  });

  it('blocks submit/edit after close without reopen window', () => {
    expect(
      canSubmitOrEditSubmission(
        { submitted_at: '2026-03-20T10:00:00.000Z', metadata: {} },
        new Date('2026-04-10T10:00:00.000Z')
      )
    ).toBe(false);
  });

  it('blocks submit/edit after close even when metadata contains reopen_until', () => {
    const submission = {
      submitted_at: '2026-03-20T10:00:00.000Z',
      metadata: { reopen_until: '2026-04-10T12:00:00.000Z' },
    };

    expect(canSubmitOrEditSubmission(submission, new Date('2026-04-10T11:00:00.000Z'))).toBe(false);
    expect(canSubmitOrEditSubmission(submission, new Date('2026-04-10T12:00:00.000Z'))).toBe(false);
  });
});
