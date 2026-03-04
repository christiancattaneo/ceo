import { checkLlmsTxt } from './checks/llms-txt.js';
import { checkMcp } from './checks/mcp.js';
import { checkA2a } from './checks/a2a.js';
import { checkOpenApi } from './checks/openapi.js';
import { checkStructuredData } from './checks/structured-data.js';
import { checkPerformance } from './checks/performance.js';
import { checkRegistry } from './checks/registry.js';
import { checkPayment } from './checks/payment.js';
import { checkSecurity } from './checks/security.js';
import { calculateScore } from './scorer.js';
import type { ScanContext, ScanResult } from './types.js';

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

async function fetchHomepage(baseUrl: string): Promise<{
  html: string | undefined;
  headers: Record<string, string>;
  responseTime: number;
}> {
  const start = performance.now();
  try {
    const res = await fetch(baseUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
      redirect: 'follow',
    });

    const html = res.ok ? await res.text() : undefined;
    const elapsed = Math.round(performance.now() - start);

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    headers['x-status-code'] = String(res.status);

    return { html, headers, responseTime: elapsed };
  } catch {
    const elapsed = Math.round(performance.now() - start);
    return { html: undefined, headers: {}, responseTime: elapsed };
  }
}

export async function scan(rawUrl: string): Promise<ScanResult> {
  const scanStart = performance.now();
  const baseUrl = normalizeUrl(rawUrl);

  const { html, headers, responseTime } = await fetchHomepage(baseUrl);

  const context: ScanContext = {
    homepageHtml: html,
    headers,
    responseTime,
  };

  // Run all checks in parallel
  const checks = await Promise.all([
    // Discovery
    checkLlmsTxt(baseUrl, context),
    checkStructuredData(baseUrl, context),
    checkRegistry(baseUrl, context),
    // Integration
    checkMcp(baseUrl, context),
    checkA2a(baseUrl, context),
    checkOpenApi(baseUrl, context),
    checkPerformance(baseUrl, context),
    // Transaction
    checkPayment(baseUrl, context),
    checkSecurity(baseUrl, context),
  ]);

  const scanDurationMs = Math.round(performance.now() - scanStart);
  return calculateScore(baseUrl, checks, scanDurationMs);
}
