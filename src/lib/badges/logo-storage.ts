export const BADGE_LOGO_BUCKET = 'sponsorship-assets';

export function badgeLogoDirectory(badgeId: string): string {
  return `badge-logos/${badgeId}`;
}
