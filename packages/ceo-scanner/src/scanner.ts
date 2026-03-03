import { checkLlmsTxt } from './checks/llms-txt.js';
import { checkMcp } from './checks/mcp.js';
import { checkA2a } from './checks/a2a.js';
import { checkOpenApi } from './checks/openapi.js';
import { checkStructuredData } from './checks/structured-data.js';
import { checkPerformance } from './checks/performance.js';
import { calculateScore } from './scorer.js';
import type { ScanResult } from './types.js';

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  // Remove trailing slash for consistency
  return url.replace(/\/+$/, '');
}

async function fetchHomepage(baseUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(baseUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
      redirect: 'follow',
    });
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // swallow — individual checks handle their own errors
  }
  return undefined;
}

export async function scan(rawUrl: string): Promise<ScanResult> {
  const baseUrl = normalizeUrl(rawUrl);

  // Fetch homepage HTML once for checks that need it
  const homepageHtml = await fetchHomepage(baseUrl);

  // Run all checks in parallel
  const checks = await Promise.all([
    checkLlmsTxt(baseUrl),
    checkMcp(baseUrl, homepageHtml),
    checkA2a(baseUrl),
    checkOpenApi(baseUrl, homepageHtml),
    checkStructuredData(baseUrl, homepageHtml),
    checkPerformance(baseUrl),
  ]);

  return calculateScore(baseUrl, checks);
}
