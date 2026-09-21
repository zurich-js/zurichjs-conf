import { describe, expect, it } from 'vitest';
import {
  containsEmail,
  describesPiiField,
  getSensitiveColumnIndexes,
  looksLikeName,
} from '../privacy';

describe('admin privacy helpers', () => {
  it('detects email addresses inside rendered text', () => {
    expect(containsEmail('Contact Ada at ada.lovelace@example.com')).toBe(true);
    expect(containsEmail('No contact details here')).toBe(false);
  });

  it('recognises common name and email field descriptors', () => {
    expect(describesPiiField('first_name')).toBe(true);
    expect(describesPiiField('recipientEmail')).toBe(true);
    expect(describesPiiField('Customer')).toBe(true);
    expect(describesPiiField('Ticket status')).toBe(false);
  });

  it('finds sensitive table columns without hiding unrelated values', () => {
    expect(getSensitiveColumnIndexes(['Ticket', 'Name', 'Email', 'Status'])).toEqual([1, 2]);
  });

  it('only treats compact human-looking strings as paired names', () => {
    expect(looksLikeName('Ada Lovelace')).toBe(true);
    expect(looksLikeName('Zoë O’Connor-Smith')).toBe(true);
    expect(looksLikeName('Ticket status')).toBe(false);
    expect(looksLikeName('CHF 699.00')).toBe(false);
  });
});
