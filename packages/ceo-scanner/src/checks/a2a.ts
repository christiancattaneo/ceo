import type { CheckResult } from '../types.js';

export async function checkA2a(baseUrl: string): Promise<CheckResult> {
  const url = new URL('/.well-known/agent.json', baseUrl).href;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
    });

    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      const name = (data.name as string) || '';
      const detail = name
        ? `found — "${name}"`
        : 'found at /.well-known/agent.json';

      return {
        name: 'a2a',
        passed: true,
        label: 'A2A endpoint',
        detail,
        weight: 20,
      };
    }

    return {
      name: 'a2a',
      passed: false,
      label: 'A2A endpoint',
      detail: `not found (HTTP ${res.status})`,
      recommendation: 'Add /.well-known/agent.json for A2A discoverability',
      weight: 20,
    };
  } catch (err) {
    return {
      name: 'a2a',
      passed: false,
      label: 'A2A endpoint',
      detail: `error — ${err instanceof Error ? err.message : 'unknown'}`,
      recommendation: 'Add /.well-known/agent.json for A2A discoverability',
      weight: 20,
    };
  }
}
