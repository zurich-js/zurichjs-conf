#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadBadgeSources } from '@/lib/badges/data';
import { buildBadgeExportFiles } from '@/lib/badges/files';
import type { SpeakerBadgeSource } from '@/lib/badges/export';

interface CliOptions {
  outputDir: string;
  baseUrl: string;
  provisionShareIds: boolean;
  help: boolean;
}

function loadLocalEnv(): void {
  const nodeProcess = process as NodeJS.Process & { loadEnvFile?: (file: string) => void };
  for (const file of ['.env', '.env.local']) {
    if (existsSync(file)) nodeProcess.loadEnvFile?.(file);
  }
}

function usage(): string {
  return `Export Illustrator-ready badge CSVs and QR images.

Usage:
  pnpm badges:export -- [options]

Options:
  --output <directory>       Output directory (default: badge-export)
  --base-url <url>           URL encoded in QR codes (default: NEXT_PUBLIC_BASE_URL)
  --provision-share-ids      Insert missing disabled attendee/sponsor networking rows
  --help                     Show this help

The command is read-only unless --provision-share-ids is supplied. Provisioning
only inserts missing rows with enabled=false; existing visibility and profiles
are never changed. Speakers come from the exact public lineup query.`;
}

export function parseArgs(argv: string[], defaultBaseUrl = ''): CliOptions {
  const options: CliOptions = {
    outputDir: 'badge-export',
    baseUrl: defaultBaseUrl,
    provisionShareIds: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--') continue;
    if (argument === '--provision-share-ids') options.provisionShareIds = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--output' || argument === '--base-url') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      if (argument === '--output') options.outputDir = value;
      else options.baseUrl = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (!options.help) {
    if (!options.baseUrl) throw new Error('Set NEXT_PUBLIC_BASE_URL or pass --base-url');
    const parsed = new URL(options.baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('--base-url must use http or https');
    }
  }
  return options;
}

async function main(): Promise<void> {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2), process.env.NEXT_PUBLIC_BASE_URL);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY');
  }

  const { getVisibleSpeakersForOg } = await import('@/lib/cfp/speakers');
  const publicSpeakerRows = await getVisibleSpeakersForOg();
  if (publicSpeakerRows.length === 0) {
    throw new Error('The public speaker lineup is empty; refusing to create an incomplete export');
  }
  const publicSpeakers: SpeakerBadgeSource[] = publicSpeakerRows.map((speaker) => ({
    id: speaker.slug,
    slug: speaker.slug,
    first_name: speaker.first_name,
    last_name: speaker.last_name,
    company: speaker.company,
    job_title: speaker.job_title,
  }));

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sources = await loadBadgeSources(client, publicSpeakers, options.provisionShareIds);
  const absoluteOutput = path.resolve(options.outputDir);
  const files = await buildBadgeExportFiles(sources, options.baseUrl, {
    csvPath: (fileName) => path.join(absoluteOutput, fileName),
    onWarning: (message) => process.stderr.write(`${message}\n`),
  });

  await Promise.all(files.map(async (file) => {
    const destination = path.join(absoluteOutput, file.name);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.data);
  }));

  process.stdout.write(`Badge export written to ${absoluteOutput}\n`);
  const manifest = JSON.parse(
    files.find((file) => file.name === 'manifest.json')?.data.toString('utf8') ?? '{}'
  ) as { counts?: Record<string, number> };
  for (const [category, count] of Object.entries(manifest.counts ?? {})) {
    process.stdout.write(`  ${category}: ${count}\n`);
  }
}

if (process.env.NODE_ENV !== 'test') {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
