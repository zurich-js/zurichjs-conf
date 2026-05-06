import { clientEnv } from '@/config/env';

export function getSupabaseServerUrl(): string {
  const url = clientEnv.supabase.url;

  if (process.env.IN_DOCKER === '1') {
    return url
      .replace('http://127.0.0.1:', 'http://host.docker.internal:')
      .replace('http://localhost:', 'http://host.docker.internal:');
  }

  return url;
}
