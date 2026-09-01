import { describe, it, expect } from 'vitest';
import type { DoorSearchableRecord } from '../roster-index';
import {
  DOOR_SEARCH_LIMIT,
  DOOR_SEARCH_MIN_LENGTH,
  createDoorSearch,
  foldTerm,
} from '../search';

function person(overrides: Partial<DoorSearchableRecord> = {}): DoorSearchableRecord {
  return {
    subjectId: overrides.subjectId ?? `id-${overrides.lastName ?? 'x'}`,
    subjectKind: 'ticket',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@analytical.example',
    company: 'Analytical Engines',
    ticketCategory: 'standard',
    checkedInAt: null,
    ...overrides,
  };
}

const names = (hits: ReturnType<ReturnType<typeof createDoorSearch>['query']>) =>
  hits.map((hit) => `${hit.record.firstName} ${hit.record.lastName}`);

describe('foldTerm', () => {
  it('folds the diacritics a volunteer will not type', () => {
    // At a Zurich conference this is not an edge case. A strict match would fail
    // on a large fraction of the roster.
    expect(foldTerm('Müller')).toBe('muller');
    expect(foldTerm('José')).toBe('jose');
    expect(foldTerm('Ångström')).toBe('angstrom');
    expect(foldTerm('Škoda')).toBe('skoda');
  });

  it('folds the letters Unicode normalisation cannot', () => {
    // NFD only helps where the accent is a separate combining mark. In these the
    // mark is part of the glyph, so normalisation alone leaves them untouched —
    // and Łukasz and Søren are names this conference will see.
    expect(foldTerm('Łukasz')).toBe('lukasz');
    expect(foldTerm('Søren')).toBe('soren');
    expect(foldTerm('Đorđe')).toBe('dorde');
    // ss, not s: that is how it is written in Switzerland, so it is what a Swiss
    // volunteer types.
    expect(foldTerm('Weiß')).toBe('weiss');
    expect(foldTerm('Æsa')).toBe('aesa');
  });

  it('lowercases, since nobody capitalises at a door', () => {
    expect(foldTerm('LOVELACE')).toBe('lovelace');
  });

  it('leaves plain ascii alone', () => {
    expect(foldTerm('smith')).toBe('smith');
  });
});

describe('createDoorSearch', () => {
  it('finds someone from a three-letter prefix', () => {
    // What a volunteer actually types before looking up at the queue.
    const search = createDoorSearch([person({ lastName: 'Lovelace' })]);
    expect(names(search.query('lov'))).toEqual(['Ada Lovelace']);
  });

  it('finds an accented name typed without the accent', () => {
    const search = createDoorSearch([
      person({ firstName: 'Jürgen', lastName: 'Müller', email: 'jm@example.com' }),
    ]);

    expect(names(search.query('muller'))).toEqual(['Jürgen Müller']);
    expect(names(search.query('jurgen'))).toEqual(['Jürgen Müller']);
  });

  it('survives a misheard name', () => {
    // Schmidt and Schmitt are indistinguishable when spoken across a foyer.
    const search = createDoorSearch([person({ firstName: 'Eva', lastName: 'Schmidt' })]);
    expect(names(search.query('schmitt'))).toEqual(['Eva Schmidt']);
  });

  it('finds a person from the forename when the surname was misheard', () => {
    // OR, not AND: getting nothing back is the worst outcome at a door.
    const search = createDoorSearch([person({ firstName: 'Grace', lastName: 'Hopper' })]);
    expect(names(search.query('grace hoppa'))).toContain('Grace Hopper');
  });

  it('ranks the exact surname above a fuzzy neighbour', () => {
    const search = createDoorSearch([
      person({ subjectId: 'a', firstName: 'Lara', lastName: 'Meier' }),
      person({ subjectId: 'b', firstName: 'Sara', lastName: 'Weber' }),
    ]);

    expect(names(search.query('sara'))[0]).toBe('Sara Weber');
  });

  it('finds someone by company, the usual second guess', () => {
    const search = createDoorSearch([
      person({ subjectId: 'a', lastName: 'Frei', company: 'Migros' }),
      person({ subjectId: 'b', lastName: 'Keller', company: 'Coop' }),
    ]);

    expect(names(search.query('migros'))).toEqual(['Ada Frei']);
  });

  it('finds someone by the local part of their email', () => {
    const search = createDoorSearch([
      person({ firstName: null, lastName: null, email: 'tiborsimon@example.com' }),
    ]);

    expect(search.query('tiborsimon')).toHaveLength(1);
  });

  it('does not return the whole roster for a shared email domain', () => {
    // Indexed whole, every attendee on gmail matches "gmail" and the desk gets
    // 200 results. The domain is indexed weakly, and a name beats it.
    const search = createDoorSearch([
      person({ subjectId: 'a', firstName: 'Ann', lastName: 'Gmailer', email: 'a@example.com' }),
      person({ subjectId: 'b', firstName: 'Bo', lastName: 'Other', email: 'b@gmail.com' }),
      person({ subjectId: 'c', firstName: 'Cy', lastName: 'Third', email: 'c@gmail.com' }),
    ]);

    expect(names(search.query('gmailer'))[0]).toBe('Ann Gmailer');
  });

  it('returns nothing for a query too short to narrow anything', () => {
    // On prefix alone a single letter matches most of the roster.
    const search = createDoorSearch([person(), person({ subjectId: 'b', lastName: 'Turing' })]);

    expect(search.query('a')).toEqual([]);
    expect(search.query(' ')).toEqual([]);
    expect(search.query('')).toEqual([]);
    expect(DOOR_SEARCH_MIN_LENGTH).toBe(2);
  });

  it('caps the result list', () => {
    const records = Array.from({ length: 40 }, (_, i) =>
      person({ subjectId: `id-${i}`, firstName: 'Sam', lastName: `Sampleton${i}` })
    );
    const search = createDoorSearch(records);

    expect(search.query('sam').length).toBeLessThanOrEqual(DOOR_SEARCH_LIMIT);
    expect(search.query('sam', 3)).toHaveLength(3);
  });

  it('finds a workshop-only attendee with no ticket', () => {
    // The population most likely to need the desk on workshop day.
    const search = createDoorSearch([
      person({
        subjectId: 'seat-1',
        subjectKind: 'workshop_registration',
        firstName: 'Alan',
        lastName: 'Turing',
        ticketCategory: null,
      }),
    ]);

    const hit = search.query('turing')[0];
    expect(hit?.record.subjectKind).toBe('workshop_registration');
  });

  it('still finds someone who is already checked in', () => {
    // Hiding them would make a duplicate arrival look like a stranger, and the
    // remedy for "not found" is to issue a ticket.
    const search = createDoorSearch([
      person({ lastName: 'Babbage', checkedInAt: '2026-09-11T07:14:00.000Z' }),
    ]);

    const hit = search.query('babbage')[0];
    expect(hit?.record.checkedInAt).toBe('2026-09-11T07:14:00.000Z');
  });

  it('handles records with nothing but a company', () => {
    // An unnamed workshop seat bought on a B2B invoice. Company is the only
    // identifying detail it carries.
    const search = createDoorSearch([
      person({ firstName: null, lastName: null, email: null, company: 'Ergon' }),
    ]);

    expect(search.query('ergon')).toHaveLength(1);
  });

  it('handles an empty roster', () => {
    const search = createDoorSearch([]);
    expect(search.size).toBe(0);
    expect(search.query('anything')).toEqual([]);
  });
});
