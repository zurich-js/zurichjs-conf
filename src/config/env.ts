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
 * Client-safe environment variables (exposed to the browser)
 * These must be prefixed with NEXT_PUBLIC_ and directly referenced
 */
export const clientEnv = {
  baseUrl: getOptionalEnv(
    process.env.NEXT_PUBLIC_BASE_URL,
    'http://localhost:3000'
  ),
  supabase: {
    url: getRequiredEnv(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_URL'
    ),
    anonKey: getRequiredEnv(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
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
    serviceRoleKey: string;
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

      supabase: {
        serviceRoleKey: getRequiredEnv(
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          'SUPABASE_SERVICE_ROLE_KEY'
        ),
      },

      stripe: {
        secretKey: getRequiredEnv(
          process.env.STRIPE_SECRET_KEY,
          'STRIPE_SECRET_KEY'
        ),
        webhookSecret: getRequiredEnv(
          process.env.STRIPE_WEBHOOK_SECRET,
          'STRIPE_WEBHOOK_SECRET'
        ),
      },

      email: {
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
      },

      admin: {
        password: getRequiredEnv(
          process.env.ADMIN_PASSWORD,
          'ADMIN_PASSWORD'
        ),
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
