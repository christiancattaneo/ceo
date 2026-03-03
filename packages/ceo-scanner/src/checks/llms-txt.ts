import type { CheckResult } from '../types.js';

export async function checkLlmsTxt(baseUrl: string): Promise<CheckResult> {
  const url = new URL('/llms.txt', baseUrl).href;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
    });

    if (res.ok) {
      const text = await res.text();
      // Parse title: first non-empty line, often starts with "# "
      const firstLine = text.split('\n').find(l => l.trim().length > 0) ?? '';
      const title = firstLine.replace(/^#\s*/, '').trim();
      const displayTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;

      return {
        name: 'llms-txt',
        passed: true,
        label: 'llms.txt',
        detail: title ? `found — "${displayTitle}"` : 'found (no title parsed)',
        weight: 20,
      };
    }

    return {
      name: 'llms-txt',
      passed: false,
      label: 'llms.txt',
      detail: `not found (HTTP ${res.status})`,
      recommendation: 'Add /llms.txt to describe your product for LLM consumption',
      weight: 20,
    };
  } catch (err) {
    return {
      name: 'llms-txt',
      passed: false,
      label: 'llms.txt',
      detail: `error — ${err instanceof Error ? err.message : 'unknown'}`,
      recommendation: 'Add /llms.txt to describe your product for LLM consumption',
      weight: 20,
    };
  }
}
