import { removeNetworkingUtm } from '@/lib/networking/links';
import { describe, expect, it, vi } from 'vitest';
import type { PublicNetworkingProfile } from '@/lib/types/networking';
import {
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
  it('removes UTM parameters from social and website URLs, preserving functional parameters and hashes', () => {
    expect(removeNetworkingUtm('https://linkedin.com/in/ada?utm_source=share&team=dev&utm_campaign=conf&UTM_medium=social#hello'))
      .toBe('https://linkedin.com/in/ada?team=dev#hello');
    expect(removeNetworkingUtm('https://conf.zurichjs.com/?utm_source=share')).toBe('https://conf.zurichjs.com/');
  });

  it.each(['mailto:partners@example.com', 'tel:+41441234567', 'invalid', 'https://example.com/?team=dev#hello'])(
    'preserves untracked or non-HTTP link %s', (href) => {
      expect(removeNetworkingUtm(href)).toBe(href);
    }
  );

  it('removes tracking from shared contact links and the source page', () => {
    const text = formatNetworkingShareText({ ...profile, links: [
      { kind: 'website', label: 'Website', href: 'https://example.com/?utm_source=share' },
    ] }, 'https://conf.zurichjs.com/share/sponsor-example?utm_medium=qr');
    expect(text).not.toContain('utm_');
  });

  it('formats labeled semantic contact details and the source page URL', () => {
    const text = formatNetworkingShareText(
      profile,
      'https://conf.zurichjs.com/share/sponsor-example'
    );

    expect(text).toContain('Example AG\nTalk to Partnerships');
    expect(text).toContain('Email: partners@example.com');
    expect(text).toContain('Website: https://example.com/contact?team=dev#hello');
    expect(text).not.toContain('utm_');
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
