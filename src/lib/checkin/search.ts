/**
 * The lookup desk's search.
 *
 * WHY THIS EXISTS AT ALL
 * The badge print run happens before ticket sales close, so everyone who buys
 * after it has a blank badge with no machine-readable code. There is no scan to
 * make for those people, and they are disproportionately likely to be the ones
 * arriving late and in a hurry. Finding them by name is not a fallback — it is a
 * primary path for a known slice of the audience.
 *
 * WHY IT IS FUZZY, PREFIX, AND DIACRITIC-INSENSITIVE
 * The volunteer is typing a name they just HEARD, in a noisy foyer, with one
 * thumb. Three things follow directly:
 *
 *  - Prefix, because they type three characters and expect a shortlist.
 *  - Fuzzy, because Schmidt/Schmitt, Stephen/Steven and Sara/Sarah are
 *    indistinguishable when spoken.
 *  - Diacritic-folded, because "Müller" gets typed "Muller" and "José" gets
 *    typed "Jose" every single time. At a Zurich conference that is not an edge
 *    case; a strict match would fail on a large fraction of the roster.
 *
 * Everything here is synchronous and in-memory. It searches the roster the
 * station already holds, so a lookup costs no network request either.
 */

import MiniSearch from 'minisearch';
import type { DoorSearchableRecord } from './roster-index';

/**
 * Below this the query matches nearly everyone on prefix alone, so the result
 * list is noise. Answering with nothing is more useful than answering with 300.
 */
export const DOOR_SEARCH_MIN_LENGTH = 2;

/** A phone shows about five. More than this means the query needs another letter. */
export const DOOR_SEARCH_LIMIT = 8;

/**
 * Letters Unicode normalisation does NOT fix.
 *
 * NFD only helps where the accent is a separate combining mark. In these the
 * mark is part of the glyph, so `ł` stays `ł` however it is normalised — and
 * "Łukasz" is a name this conference will see. Every entry here is a name a
 * volunteer would type in plain ascii: Łukasz, Søren, Đorđe, Weiß, Æsa.
 *
 * `ß` folds to `ss` rather than `s` because that is how it is written in
 * Switzerland, so it is what a Swiss volunteer will type.
 */
const UNFOLDABLE: Record<string, string> = {
  ł: 'l',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ı: 'i',
  ħ: 'h',
  ŋ: 'n',
};

/**
 * Fold a term to what the volunteer will actually type.
 *
 * NFD splits an accented character into its base plus a combining mark and the
 * range strip removes the marks, so "Müller"/"Muller" and "José"/"Jose" collapse
 * together. The map above covers what that cannot reach.
 */
export function foldTerm(term: string): string {
  const stripped = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Lowercased first, so the map only needs lowercase keys.
  return stripped.replace(/[łøđðþßæœıħŋ]/g, (char) => UNFOLDABLE[char] ?? char);
}

interface SearchDocument {
  id: string;
  firstName: string;
  lastName: string;
  /** Local part of the address, which is where a name usually hides. */
  emailLocal: string;
  /** Domain, indexed weakly: it is how a company is found, and it is also noise. */
  emailDomain: string;
  company: string;
}

function toDocument(record: DoorSearchableRecord): SearchDocument {
  const email = record.email ?? '';
  const at = email.lastIndexOf('@');

  return {
    id: record.subjectId,
    firstName: record.firstName ?? '',
    lastName: record.lastName ?? '',
    // Splitting the address matters: indexed whole, every attendee on gmail
    // matches a search for "gmail", and the desk gets 200 results.
    emailLocal: at === -1 ? email : email.slice(0, at),
    emailDomain: at === -1 ? '' : email.slice(at + 1),
    company: record.company ?? '',
  };
}

export interface DoorSearchHit {
  record: DoorSearchableRecord;
  score: number;
}

export interface DoorSearch {
  query(text: string, limit?: number): DoorSearchHit[];
  readonly size: number;
}

/**
 * Build the search over a roster's flattened records.
 *
 * Boosts read as the order a volunteer thinks in: they were told a name, so
 * surname and forename dominate; a company is the usual second guess ("she said
 * she's from Migros"); an email domain is a last resort.
 */
export function createDoorSearch(records: readonly DoorSearchableRecord[]): DoorSearch {
  const byId = new Map(records.map((record) => [record.subjectId, record]));

  const index = new MiniSearch<SearchDocument>({
    fields: ['firstName', 'lastName', 'emailLocal', 'emailDomain', 'company'],
    storeFields: ['id'],
    processTerm: (term) => {
      const folded = foldTerm(term);
      return folded.length > 0 ? folded : null;
    },
    searchOptions: {
      boost: { lastName: 4, firstName: 3, emailLocal: 2, company: 2, emailDomain: 0.5 },
      prefix: true,
      // 0.2 tolerates one edit in a five-letter name — enough for Schmidt/Schmitt,
      // tight enough that "Sara" does not pull in "Lara", "Mara" and "Sarah's"
      // entire cohort ahead of the exact match.
      fuzzy: 0.2,
      // OR, not AND: a volunteer who mishears the surname should still find the
      // person from the forename rather than getting nothing.
      combineWith: 'OR',
    },
  });

  index.addAll(records.map(toDocument));

  return {
    size: byId.size,
    query(text, limit = DOOR_SEARCH_LIMIT) {
      const trimmed = text.trim();
      if (trimmed.length < DOOR_SEARCH_MIN_LENGTH) return [];

      const hits: DoorSearchHit[] = [];
      for (const result of index.search(trimmed)) {
        const record = byId.get(String(result.id));
        if (record) hits.push({ record, score: result.score });
        if (hits.length >= limit) break;
      }
      return hits;
    },
  };
}
