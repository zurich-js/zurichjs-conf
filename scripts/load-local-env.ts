import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Load `.env.local` / `.env` for local script runs without adding a dependency.
 * On CI the env vars are already in `process.env`, so the files are absent and
 * this is a no-op. Never overrides values already present in the environment.
 */
export function loadLocalEnv(): void {
  for (const file of ['.env.local', '.env']) {
    let content: string;
    try {
      content = readFileSync(path.join(process.cwd(), file), 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const key = match[1];
      if (process.env[key] !== undefined) continue;
      let value = (match[2] ?? '').trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}
