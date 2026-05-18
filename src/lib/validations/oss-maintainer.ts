/**
 * OSS Maintainer Verification Validation Schema
 */

import { z } from 'zod';

const repoRefSchema = z
  .string()
  .trim()
  .min(1, 'Repository reference cannot be empty')
  .max(200, 'Repository reference is too long')
  .refine(
    (val) => /^(https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?|[\w.-]+\/[\w.-]+)$/i.test(val),
    'Must be a GitHub URL or "owner/repo" reference'
  );

const npmNameSchema = z
  .string()
  .trim()
  .min(1, 'Package name cannot be empty')
  .max(214, 'npm package names are at most 214 characters')
  .regex(/^@?[\w.-]+(\/[\w.-]+)?$/, 'Must be a valid npm package name');

export const ossMaintainerSubmissionSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    email: z.string().trim().email('Invalid email address'),
    githubUsername: z
      .string()
      .trim()
      .min(1, 'GitHub username is required')
      .max(39, 'GitHub username is too long')
      .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/, 'Invalid GitHub username'),
    repos: z.array(repoRefSchema).min(1, 'Submit at least one repo').max(3, 'Submit at most three repos'),
    npmPackages: z.array(npmNameSchema).max(3, 'Submit at most three npm packages').default([]),
    ticketTier: z.enum(['standard', 'vip']),
    additionalInfo: z.string().trim().max(2000, 'Keep additional notes under 2000 characters').optional().or(z.literal('')),
    // Honeypot — bots that fill every field get a 400.
    website: z.string().max(0, 'Invalid submission').optional(),
  })
  .strict();

export type OssMaintainerSubmissionInput = z.infer<typeof ossMaintainerSubmissionSchema>;
