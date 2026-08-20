import { describe, expect, it, vi } from 'vitest';
import type { PublicNetworkingProfile } from '@/lib/types/networking';
import {
  addNetworkingUtm,
  formatNetworkingShareText,
  shareNetworkingProfile,
} from '@/lib/networking/share';

const profile: PublicNetworkingProfile = {
  publicId: 'sponsor-example',
  kind: 'sponsor',
  name: 'Example AG',
  headline: 'Talk to Partnerships',
  imageUrl: null,
  links: [
    { kind: 'email', label: 'Email', href: 'mailto:partners@example.com' },
    { kind: 'website', label: 'Website', href: 'https://example.com/contact?team=dev#hello' },
  ],
  path: '/share/sponsor-example',
};

describe('networking sharing helpers', () => {
  it('adds UTM tags while preserving existing parameters and hashes', () => {
    const result = new URL(
      addNetworkingUtm('https://example.com/contact?team=dev#hello', profile.publicId)
    );

    expect(result.searchParams.get('team')).toBe('dev');
    expect(result.searchParams.get('utm_source')).toBe('zurichjs-conf');
    expect(result.searchParams.get('utm_medium')).toBe('networking');
    expect(result.searchParams.get('utm_campaign')).toBe('connections');
    expect(result.searchParams.get('utm_content')).toBe(profile.publicId);
    expect(result.hash).toBe('#hello');
  });

  it('preserves existing UTM values and leaves non-HTTP links unchanged', () => {
    const existing = addNetworkingUtm(
      'https://example.com/?utm_source=partner&utm_content=original',
      profile.publicId
    );
    const parsed = new URL(existing);

    expect(parsed.searchParams.get('utm_source')).toBe('partner');
    expect(parsed.searchParams.get('utm_content')).toBe('original');
    expect(addNetworkingUtm('mailto:partners@example.com', profile.publicId)).toBe(
      'mailto:partners@example.com'
    );
    expect(addNetworkingUtm('tel:+41441234567', profile.publicId)).toBe('tel:+41441234567');
  });

  it('formats labeled semantic contact details and the source page URL', () => {
    const text = formatNetworkingShareText(
      profile,
      'https://conf.zurichjs.com/share/sponsor-example'
    );

    expect(text).toContain('Example AG\nTalk to Partnerships');
    expect(text).toContain('Email: partners@example.com');
    expect(text).toContain('Website: https://example.com/contact?');
    expect(text).toContain('team=dev');
    expect(text).toContain(
      'ZurichJS networking page: https://conf.zurichjs.com/share/sponsor-example'
    );
  });

  it('treats native-share cancellation as cancellation without copying', async () => {
    const copyText = vi.fn().mockResolvedValue(true);
    const nativeShare = vi.fn().mockRejectedValue({ name: 'AbortError' });

    await expect(
      shareNetworkingProfile(profile, 'https://conf.zurichjs.com/share/sponsor-example', {
        nativeShare,
        copyText,
      })
    ).resolves.toBe('cancelled');
    expect(copyText).not.toHaveBeenCalled();
  });

  it('copies the full formatted text when native sharing fails', async () => {
    const copyText = vi.fn().mockResolvedValue(true);
    const nativeShare = vi.fn().mockRejectedValue(new Error('Unavailable'));

    await expect(
      shareNetworkingProfile(profile, 'https://conf.zurichjs.com/share/sponsor-example', {
        nativeShare,
        copyText,
      })
    ).resolves.toBe('copied');
    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining('ZurichJS networking page: https://conf.zurichjs.com/share/sponsor-example')
    );
  });
});
