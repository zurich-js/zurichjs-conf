/**
 * Environment Variables Configuration
 * Typed and validated environment variables for the application
 *
 * IMPORTANT: Next.js requires static references to NEXT_PUBLIC_* variables
 * Do not use dynamic string construction like process.env[`NEXT_PUBLIC_${key}`]
 */

/**
 * Validate that a required environment variable is set
 */
function getRequiredEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Hosts where a plain-http Supabase URL is fine: the local Supabase stack */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', 'host.docker.internal']);

/**
 * Validate a required URL that will carry Supabase keys. It must be https
 * everywhere except against a local Supabase instance, so a misconfigured
 * deployment can never send the service-role key in cleartext.
 */
function getRequiredHttpsUrl(value: string | undefined, name: string): string {
  const raw = getRequiredEnv(value, name);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Environment variable ${name} must be a valid URL`);
  }
  if (parsed.protocol !== 'https:' && !LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Environment variable ${name} must use https:// (got ${parsed.protocol}//${parsed.host}) — Supabase keys must never travel in cleartext`
    );
  }
  return raw;
}

/**
 * Get an optional environment variable with a default value
 */
function getOptionalEnv(value: string | undefined, defaultValue: string): string {
  return value || defaultValue;
}

/**
 * Check if we're running on the server
 */
const isServer = typeof window === 'undefined';

/**
 * The URL of the current Vercel PREVIEW deployment, if this is one.
 *
 * Returns null on production and anywhere that is not a Vercel preview, so the
 * ordinary NEXT_PUBLIC_BASE_URL path is untouched where it matters.
 *
 * Both spellings are read because only the NEXT_PUBLIC_ ones exist in the browser
 * bundle and only the bare ones are guaranteed on the server. Next.js inlines
 * NEXT_PUBLIC_* at build time, so these must stay static references.
 */
export function getVercelPreviewUrl(): string | null {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV;
  if (vercelEnv !== 'preview') return null;

  const host = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  // VERCEL_URL is a bare host with no scheme.
  return host ? `https://${host}` : null;
}

/**
 * Client-safe environment variables (exposed to the browser)
 * These must be prefixed with NEXT_PUBLIC_ and directly referenced
 */
export const clientEnv = {
  /**
   * A Vercel preview deployment supplies its OWN url and does not need this set.
   *
   * That is not just convenience. This module throws at import time when a
   * required variable is missing, so without the fallback a preview build fails
   * before it renders anything — and it would fail for a variable whose value is
   * WRONG on a preview anyway, since it names the production domain.
   */
  baseUrl: getVercelPreviewUrl() ??
    getRequiredEnv(process.env.NEXT_PUBLIC_BASE_URL, 'NEXT_PUBLIC_BASE_URL'),
  supabase: {
    url: getRequiredHttpsUrl(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL'
    ),
    // Falls back to the name the Supabase/Vercel integration writes.
    //
    // With Supabase branching, every preview deployment needs the credentials of
    // ITS OWN branch database, which are only known once that branch exists.
    // Nobody can maintain that by hand — a new branch per pull request, each with
    // different keys — so the integration syncs them into Vercel automatically.
    // It writes NEXT_PUBLIC_SUPABASE_ANON_KEY, which is Supabase's older name for
    // this value. Without this fallback the sync silently sets a variable nothing
    // reads, and every preview deployment fails its env check at build time.
    publishableKey: getRequiredEnv(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    ),
  },
  stripe: {
    publishableKey: getRequiredEnv(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
    ),
  },
} as const;

/**
 * Server-only environment variables (NOT exposed to the browser)
 * These are only available in Node.js/API routes
 * Lazy-loaded to prevent client-side errors
 */
let _serverEnv: {
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  supabase: {
    secretKey: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  email: {
    resendApiKey: string;
    from: string;
    replyTo: string;
  };
  admin: {
    password: string;
    readonlyApiKey: string | null;
  };
} | null = null;

function getServerEnv() {
  if (!isServer) {
    throw new Error('Server environment variables can only be accessed on the server side');
  }

  if (!_serverEnv) {
    _serverEnv = {
      nodeEnv: process.env.NODE_ENV || 'development',
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',

      get supabase() {
        return {
          // Same fallback as the publishable key above: the Supabase/Vercel
          // integration writes SUPABASE_SERVICE_ROLE_KEY, Supabase's older name
          // for this value.
          secretKey: getRequiredEnv(
            process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
            'SUPABASE_SECRET_KEY'
          ),
        };
      },

      get stripe() {
        return {
          secretKey: getRequiredEnv(
            process.env.STRIPE_SECRET_KEY,
            'STRIPE_SECRET_KEY'
          ),
          webhookSecret: getRequiredEnv(
            process.env.STRIPE_WEBHOOK_SECRET,
            'STRIPE_WEBHOOK_SECRET'
          ),
        };
      },

      get email() {
        return {
          resendApiKey: getRequiredEnv(
            process.env.RESEND_API_KEY,
            'RESEND_API_KEY'
          ),
          from: getOptionalEnv(
            process.env.EMAIL_FROM,
            'ZurichJS Conference <hello@zurichjs.com>'
          ),
          replyTo: getOptionalEnv(
            process.env.EMAIL_REPLY_TO,
            'hello@zurichjs.com'
          ),
        };
      },

      get admin() {
        return {
          password: getRequiredEnv(
            process.env.ADMIN_PASSWORD,
            'ADMIN_PASSWORD'
          ),
          readonlyApiKey: process.env.ADMIN_READONLY_API_KEY || null,
        };
      },
    };
  }

  return _serverEnv;
}

/**
 * Server environment - use this in API routes and server-side code
 * Will throw an error if accessed on the client
 */
export const serverEnv = new Proxy({} as ReturnType<typeof getServerEnv>, {
  get(target, prop) {
    const env = getServerEnv();
    return env[prop as keyof typeof env];
  },
});

/**
 * Combined environment configuration
 * Use this in server-side code (API routes, getServerSideProps, etc.)
 * DO NOT use this on the client - use clientEnv instead
 */
export const env = new Proxy({} as typeof clientEnv & ReturnType<typeof getServerEnv> & {
  supabase: typeof clientEnv.supabase & ReturnType<typeof getServerEnv>['supabase'];
  stripe: typeof clientEnv.stripe & ReturnType<typeof getServerEnv>['stripe'];
}, {
  get(target, prop) {
    if (prop === 'supabase') {
      return {
        ...clientEnv.supabase,
        ...(isServer ? getServerEnv().supabase : {}),
      };
    }
    if (prop === 'stripe') {
      return {
        ...clientEnv.stripe,
        ...(isServer ? getServerEnv().stripe : {}),
      };
    }

    // Check client env first
    if (prop in clientEnv) {
      return clientEnv[prop as keyof typeof clientEnv];
    }

    // Then check server env (only on server)
    if (isServer) {
      const serverEnvData = getServerEnv();
      if (prop in serverEnvData) {
        return serverEnvData[prop as keyof typeof serverEnvData];
      }
    }

    return undefined;
  },
});
