import { describe, it, expect } from 'vitest';
import {
  DOOR_ABILITIES,
  DOOR_FAILURE_MESSAGES,
  DOOR_OCCASIONS,
  DOOR_ROLES,
  DOOR_ROLE_ABILITIES,
  DOOR_ROLE_DESCRIPTIONS,
  DOOR_ROLE_LABELS,
  doorFailureMessage,
  isDoorResolveHit,
  roleCan,
  type DoorResolveResult,
} from '..';

describe('role abilities', () => {
  it('gives every role a label and a description a volunteer can read', () => {
    for (const role of DOOR_ROLES) {
      expect(DOOR_ROLE_LABELS[role]).toBeTruthy();
      expect(DOOR_ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(20);
    }
  });

  it('matches the authorization branches in door_check_in', () => {
    // A goodie volunteer may not admit anyone; the RPC returns
    // role_may_not_check_in for exactly this case.
    expect(roleCan('goodie', 'check_in')).toBe(false);
    expect(roleCan('scanner', 'check_in')).toBe(true);
    expect(roleCan('door_lead', 'check_in')).toBe(true);
  });

  it('restricts manual admission to a lead', () => {
    expect(roleCan('scanner', 'manual_admit')).toBe(false);
    expect(roleCan('goodie', 'manual_admit')).toBe(false);
    expect(roleCan('door_lead', 'manual_admit')).toBe(true);
  });

  it('restricts contact details to a lead, so PII is not on every screen', () => {
    expect(roleCan('scanner', 'view_contact')).toBe(false);
    expect(roleCan('goodie', 'view_contact')).toBe(false);
    expect(roleCan('door_lead', 'view_contact')).toBe(true);
  });

  it('lets every role look someone up, since blank badges make that routine', () => {
    for (const role of DOOR_ROLES) {
      expect(roleCan(role, 'lookup')).toBe(true);
    }
  });

  it('grants a goodie volunteer handover and nothing more', () => {
    expect(roleCan('goodie', 'goodie')).toBe(true);
    const granted = DOOR_ABILITIES.filter((a) => roleCan('goodie', a));
    expect([...granted].sort()).toEqual(['goodie', 'lookup']);
  });

  it('names only abilities that exist', () => {
    for (const role of DOOR_ROLES) {
      for (const ability of DOOR_ROLE_ABILITIES[role]) {
        expect(DOOR_ABILITIES).toContain(ability);
      }
    }
  });
});

describe('isDoorResolveHit', () => {
  it('narrows a miss', () => {
    const miss: DoorResolveResult = { found: false, subjectKind: null };
    expect(isDoorResolveHit(miss)).toBe(false);
  });

  it('narrows a hit', () => {
    const hit: DoorResolveResult = {
      found: true,
      subjectKind: 'ticket',
      subjectId: 'x',
      person: { firstName: 'A', lastName: 'B', email: 'a@b.c', company: null, jobTitle: null },
      ticket: null,
      admissible: true,
      refusalReason: null,
      checkIn: { workshopDayAt: null, conferenceDayAt: null },
      goodie: { entitled: true, handedAt: null, note: null },
      apparel: { tshirtSize: null, hoodieSize: null },
      doorNote: null,
      workshops: { held: [], purchasedForOthers: [] },
    };
    expect(isDoorResolveHit(hit)).toBe(true);
  });
});

describe('doorFailureMessage', () => {
  it('maps every refusal the functions can return', () => {
    const fromSql = [
      'staff_not_active',
      'role_may_not_check_in',
      'manual_admit_requires_lead',
      'manual_admit_requires_reason',
      'subject_not_found',
      'not_entitled',
      'ticket_pending',
      'ticket_cancelled',
      'ticket_refunded',
      'registration_pending',
      'registration_cancelled',
      'registration_refunded',
    ];
    for (const reason of fromSql) {
      expect(DOOR_FAILURE_MESSAGES[reason]).toBeTruthy();
      expect(doorFailureMessage(reason)).not.toMatch(/^Refused:/);
    }
  });

  it('never renders a blank for an unmapped reason', () => {
    expect(doorFailureMessage('something_new')).toBe('Refused: something_new');
  });

  it('has a fallback when there is no reason at all', () => {
    expect(doorFailureMessage(undefined)).toMatch(/went wrong/i);
  });

  it('tells a volunteer what to DO, not just what happened', () => {
    expect(DOOR_FAILURE_MESSAGES.ticket_refunded).toMatch(/desk/i);
    expect(DOOR_FAILURE_MESSAGES.subject_not_found).toMatch(/lookup|desk/i);
    expect(DOOR_FAILURE_MESSAGES.staff_not_active).toMatch(/lead/i);
  });
});

describe('occasions', () => {
  it('covers only the two days that are actually checked in', () => {
    expect([...DOOR_OCCASIONS]).toEqual(['workshop_day', 'conference_day']);
  });
});
