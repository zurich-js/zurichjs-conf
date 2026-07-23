/**
 * Country flag helper for verification rows
 */

const COUNTRY_FLAGS: Record<string, string> = {
  CH: '🇨🇭', DE: '🇩🇪', AT: '🇦🇹', FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱', BE: '🇧🇪',
  GB: '🇬🇧', US: '🇺🇸', IE: '🇮🇪', PT: '🇵🇹', GR: '🇬🇷', FI: '🇫🇮', SE: '🇸🇪', NO: '🇳🇴',
  DK: '🇩🇰', PL: '🇵🇱', CZ: '🇨🇿', HR: '🇭🇷', SK: '🇸🇰', SI: '🇸🇮', LT: '🇱🇹', LV: '🇱🇻',
  EE: '🇪🇪', LU: '🇱🇺', MT: '🇲🇹', CY: '🇨🇾', RO: '🇷🇴', BG: '🇧🇬', HU: '🇭🇺',
};

export function countryFlag(code: string | null): string {
  if (!code) return '';
  return COUNTRY_FLAGS[code] || code;
}
