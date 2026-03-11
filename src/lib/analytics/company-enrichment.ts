/**
 * Company Enrichment via Claude API
 * Classifies company names into size buckets and industry sectors
 * Results are cached in-memory to avoid repeated API calls
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';

const log = logger.scope('Company Enrichment');

export interface CompanyProfile {
  name: string;
  size: 'startup' | 'scaleup' | 'sme' | 'enterprise';
  sector: string;
  /** Confidence: high if well-known, low if obscure */
  confidence: 'high' | 'medium' | 'low';
}

export interface CompanyInsights {
  enrichedCompanies: CompanyProfile[];
  /** Breakdown by company size bucket */
  bySize: Record<string, number>;
  /** Breakdown by industry sector */
  bySector: Array<{ sector: string; count: number }>;
  /** How many companies were enriched vs total */
  enrichedCount: number;
  totalCompanies: number;
}

// In-memory cache to avoid repeated API calls within the same deployment
let cachedResult: { companies: string[]; profiles: CompanyProfile[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function enrichCompanies(
  companyNames: Array<{ company: string; count: number }>,
  apiKey: string | null
): Promise<CompanyInsights | null> {
  if (!apiKey || companyNames.length === 0) return null;

  const names = companyNames.map((c) => c.company);
  const countMap = new Map(companyNames.map((c) => [c.company, c.count]));

  // Check cache
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL_MS) {
    const cachedNames = cachedResult.companies.join(',');
    const currentNames = names.join(',');
    if (cachedNames === currentNames) {
      return buildInsights(cachedResult.profiles, countMap);
    }
  }

  try {
    const profiles = await classifyCompanies(names, apiKey);
    cachedResult = { companies: names, profiles, timestamp: Date.now() };
    return buildInsights(profiles, countMap);
  } catch (error) {
    log.error('Company enrichment failed', error);
    return null;
  }
}

async function classifyCompanies(companies: string[], apiKey: string): Promise<CompanyProfile[]> {
  const client = new Anthropic({ apiKey });

  const companiesList = companies.map((c, i) => `${i + 1}. ${c}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Classify each company below by size and industry sector. Return ONLY valid JSON — no markdown, no code fences.

Companies:
${companiesList}

Return a JSON array where each item has:
- "name": exact company name as given
- "size": one of "startup" (1-50 employees), "scaleup" (51-500), "sme" (501-5000), "enterprise" (5000+)
- "sector": short industry label (e.g. "Fintech", "SaaS", "Consulting", "Banking", "E-commerce", "Healthcare", "Telecom", "Insurance", "Crypto/Web3", "Developer Tools", "Media", "Education", "Government", "Manufacturing", "Retail", "Other")
- "confidence": "high" if you recognize the company well, "medium" if you can make a reasonable guess, "low" if you're mostly guessing

Be accurate. For Swiss/European tech companies, use your knowledge. If you truly don't know a company, use your best guess from the name and mark confidence as "low".`,
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse the JSON response, handling potential markdown fences
  const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(jsonStr) as Array<{
    name: string;
    size: string;
    sector: string;
    confidence: string;
  }>;

  return parsed.map((p) => ({
    name: p.name,
    size: (['startup', 'scaleup', 'sme', 'enterprise'].includes(p.size) ? p.size : 'sme') as CompanyProfile['size'],
    sector: p.sector || 'Other',
    confidence: (['high', 'medium', 'low'].includes(p.confidence) ? p.confidence : 'low') as CompanyProfile['confidence'],
  }));
}

function buildInsights(
  profiles: CompanyProfile[],
  countMap: Map<string, number>
): CompanyInsights {
  const bySize: Record<string, number> = { startup: 0, scaleup: 0, sme: 0, enterprise: 0 };
  const sectorCounts = new Map<string, number>();

  for (const p of profiles) {
    const attendeeCount = countMap.get(p.name) || 1;
    bySize[p.size] = (bySize[p.size] || 0) + attendeeCount;

    const sector = p.sector;
    sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + attendeeCount);
  }

  const bySector = [...sectorCounts.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  return {
    enrichedCompanies: profiles,
    bySize,
    bySector,
    enrichedCount: profiles.length,
    totalCompanies: profiles.length,
  };
}
