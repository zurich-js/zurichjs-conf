import { z } from 'zod';

function emptyStringToNull(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeHttpUrl(value: unknown): unknown {
  const normalized = emptyStringToNull(value);
  if (typeof normalized !== 'string' || /^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

function normalizeProfileUrl(value: unknown, host: string, pathPrefix = ''): unknown {
  const normalized = emptyStringToNull(value);
  if (typeof normalized !== 'string') return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return normalized;
  const withoutWww = normalized.replace(/^www\./i, '');
  if (withoutWww.toLowerCase().startsWith(`${host}/`)) {
    return `https://${withoutWww}`;
  }
  const handle = normalized.replace(/^@+/, '').replace(/^\/+|\/+$/g, '');
  return handle ? `https://${host}/${pathPrefix}${handle}` : null;
}

function normalizeHandle(value: unknown, hosts: string[]): unknown {
  const normalized = emptyStringToNull(value);
  if (typeof normalized !== 'string') return normalized;

  let handle = normalized;
  if (/^https?:\/\//i.test(handle)) {
    try {
      const url = new URL(handle);
      if (hosts.includes(url.hostname.replace(/^www\./, ''))) {
        handle = url.pathname.replace(/^\/+(?:profile\/)?/, '');
      } else {
        return normalized;
      }
    } catch {
      return normalized;
    }
  }

  handle = handle.replace(/^@+/, '').replace(/\/+$/, '');
  return handle ? `@${handle}` : null;
}

const MASTODON_USERNAME_PATTERN = /^[a-z0-9_][a-z0-9_.-]{0,63}$/i;

function isSafeFederatedHost(value: string): boolean {
  const host = value.toLowerCase().replace(/\.$/, '');
  if (host.length > 253 || !host.includes('.')) return false;

  const labels = host.split('.');
  const topLevelDomain = labels.at(-1);
  return Boolean(
    topLevelDomain &&
    /[a-z]/i.test(topLevelDomain) &&
    labels.every((label) =>
      label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    )
  );
}

function canonicalMastodonHandle(username: string, host: string): string | null {
  if (!MASTODON_USERNAME_PATTERN.test(username) || !isSafeFederatedHost(host)) return null;
  return `@${username.toLowerCase()}@${host.toLowerCase().replace(/\.$/, '')}`;
}

function normalizeMastodonHandle(value: unknown): unknown {
  const normalized = emptyStringToNull(value);
  if (typeof normalized !== 'string') return normalized;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const profileMatch = url.pathname.match(/^\/@([^/]+)\/?$/);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.port ||
        !profileMatch
      ) {
        return normalized;
      }
      return canonicalMastodonHandle(profileMatch[1], url.hostname) ?? normalized;
    } catch {
      return normalized;
    }
  }

  const handleMatch = normalized.match(/^@?([^@\s/]+)@([^@\s/:]+)$/);
  if (!handleMatch) return normalized;
  return canonicalMastodonHandle(handleMatch[1], handleMatch[2]) ?? normalized;
}

function isCanonicalMastodonHandle(value: string | null): boolean {
  if (value === null) return true;
  const match = value.match(/^@([^@]+)@([^@]+)$/);
  return Boolean(match && canonicalMastodonHandle(match[1], match[2]) === value);
}

const httpUrlSchema = z
  .preprocess(normalizeHttpUrl, z.string().url('Enter a valid URL').nullable())
  .refine((value) => value === null || /^https?:\/\//i.test(value), 'Only HTTP or HTTPS URLs are supported');

function hasExpectedHost(value: string | null, expectedHost: string): boolean {
  if (value === null) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.replace(/^www\./, '') === expectedHost;
  } catch {
    return false;
  }
}

const linkedinUrlSchema = z
  .preprocess(
    (value) => normalizeProfileUrl(value, 'linkedin.com', 'in/'),
    z.string().url('Enter a valid LinkedIn URL').nullable()
  )
  .refine((value) => hasExpectedHost(value, 'linkedin.com'), 'Use a linkedin.com profile URL');

const githubUrlSchema = z
  .preprocess(
    (value) => normalizeProfileUrl(value, 'github.com'),
    z.string().url('Enter a valid GitHub URL').nullable()
  )
  .refine((value) => hasExpectedHost(value, 'github.com'), 'Use a github.com profile URL');

const socialHandleSchema = (hosts: string[], max: number) =>
  z.preprocess(
    (value) => normalizeHandle(value, hosts),
    z
      .string()
      .max(max)
      .regex(/^@[^\s/:]+$/, 'Enter a handle or a supported profile URL')
      .nullable()
  );

const mastodonHandleSchema = z.preprocess(
  normalizeMastodonHandle,
  z
    .string()
    .max(320)
    .refine(isCanonicalMastodonHandle, 'Enter @username@server or a valid Mastodon profile URL')
    .nullable()
);

const nullableTrimmedString = (max: number) =>
  z.preprocess(emptyStringToNull, z.string().trim().max(max).nullable());

const emailSchema = z
  .preprocess(emptyStringToNull, z.string().trim().email('Enter a valid email').max(254).nullable())
  .transform((value) => value?.toLowerCase() ?? null);

const phoneSchema = nullableTrimmedString(40).refine((value) => {
  if (value === null || !/^[+()\d\s.-]+$/.test(value)) return value === null;
  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 6 && digitCount <= 15;
}, 'Enter a valid phone number');

export const attendeeNetworkingProfileSchema = z
  .object({
    email: emailSchema.default(null),
    linkedinUrl: linkedinUrlSchema.default(null),
    githubUrl: githubUrlSchema.default(null),
    xHandle: socialHandleSchema(['x.com', 'twitter.com'], 100).default(null),
    blueskyHandle: socialHandleSchema(['bsky.app'], 255).default(null),
    mastodonHandle: mastodonHandleSchema.default(null),
    websiteUrl: httpUrlSchema.default(null),
  })
  .strict();

export const attendeeNetworkingUpdateSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    enabled: z.boolean(),
    profile: attendeeNetworkingProfileSchema,
  })
  .strict()
  .superRefine(({ enabled, profile }, ctx) => {
    if (enabled && !Object.values(profile).some(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Add at least one networking link before enabling your profile',
        path: ['profile'],
      });
    }
  });

export const sponsorNetworkingProfileSchema = z
  .object({
    contactName: nullableTrimmedString(120).default(null),
    email: emailSchema.default(null),
    phone: phoneSchema.default(null),
    websiteUrl: httpUrlSchema.default(null),
    linkedinUrl: linkedinUrlSchema.default(null),
    preferredMethod: z.enum(['email', 'phone', 'website', 'linkedin']).nullable().default(null),
  })
  .strict();

export const sponsorNetworkingUpdateSchema = z
  .object({
    enabled: z.boolean(),
    profile: sponsorNetworkingProfileSchema,
  })
  .strict()
  .superRefine(({ enabled, profile }, ctx) => {
    const methods = {
      email: profile.email,
      phone: profile.phone,
      website: profile.websiteUrl,
      linkedin: profile.linkedinUrl,
    } as const;

    if (enabled && !Object.values(methods).some(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Add at least one contact method before enabling this profile',
        path: ['profile'],
      });
    }

    if (profile.preferredMethod && !methods[profile.preferredMethod]) {
      ctx.addIssue({
        code: 'custom',
        message: 'The preferred contact method must have a value',
        path: ['profile', 'preferredMethod'],
      });
    }
  });
