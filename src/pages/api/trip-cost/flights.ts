/**
 * Kiwi Tequila API proxy for flight price estimates.
 *
 * Only active when KIWI_API_KEY env var is set.
 * GET /api/trip-cost/flights?from=LHR&to=ZRH&dateFrom=09/09/2026&dateTo=12/09/2026
 *
 * Returns cheapest 3 flight options. Responses are cached for 1 hour.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface KiwiItinerary {
  price: number;
  airlines: string[];
  flyFrom: string;
  flyTo: string;
  dTime: number;
  aTime: number;
  fly_duration: string;
  deep_link: string;
}

interface KiwiSearchResponse {
  data: KiwiItinerary[];
  currency: string;
}

interface FlightResult {
  price: number;
  currency: string;
  airlines: string[];
  from: string;
  to: string;
  duration: string;
  deepLink: string;
}

interface ApiResponse {
  flights: FlightResult[];
  cached: boolean;
  error?: string;
}

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: ApiResponse; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ flights: [], cached: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.KIWI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      flights: [],
      cached: false,
      error: 'Flight search not configured',
    });
  }

  const { from, to = 'ZRH', dateFrom = '09/09/2026', dateTo = '12/09/2026' } = req.query;

  if (!from || typeof from !== 'string') {
    return res.status(400).json({ flights: [], cached: false, error: 'Missing "from" parameter' });
  }

  const cacheKey = `${from}-${to}-${dateFrom}-${dateTo}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.status(200).json({ ...cached.data, cached: true });
  }

  try {
    const params = new URLSearchParams({
      fly_from: from.toUpperCase(),
      fly_to: String(to),
      date_from: String(dateFrom),
      date_to: String(dateTo),
      curr: 'CHF',
      sort: 'price',
      limit: '3',
      max_stopovers: '1',
    });

    const response = await fetch(
      `https://tequila-api.kiwi.com/v2/search?${params.toString()}`,
      {
        headers: { apikey: apiKey },
      }
    );

    if (!response.ok) {
      throw new Error(`Kiwi API error: ${response.status}`);
    }

    const data: KiwiSearchResponse = await response.json();

    const flights: FlightResult[] = (data.data || []).slice(0, 3).map((f) => ({
      price: f.price,
      currency: data.currency || 'CHF',
      airlines: f.airlines,
      from: f.flyFrom,
      to: f.flyTo,
      duration: f.fly_duration,
      deepLink: f.deep_link,
    }));

    const result: ApiResponse = { flights, cached: false };

    // Store in cache
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(502).json({ flights: [], cached: false, error: message });
  }
}
