import type { CheckResult } from '../types.js';

export async function checkPerformance(baseUrl: string): Promise<CheckResult> {
  const start = performance.now();

  try {
    const res = await fetch(baseUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
      redirect: 'follow',
    });

    const elapsed = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        name: 'performance',
        passed: false,
        label: 'Performance',
        detail: `HTTP ${res.status} — ${elapsed}ms`,
        recommendation: 'Ensure your homepage returns HTTP 200 with reasonable latency',
        weight: 20,
      };
    }

    // Consume body to get full response time
    await res.text();
    const totalMs = Math.round(performance.now() - start);

    const rating =
      totalMs < 1000 ? 'fast' : totalMs < 2000 ? 'acceptable' : 'slow';
    const passed = totalMs < 2000;

    return {
      name: 'performance',
      passed,
      label: 'Performance',
      detail: `${totalMs}ms (${rating})`,
      recommendation: passed
        ? undefined
        : `Homepage took ${totalMs}ms — aim for <2000ms for AI agent access`,
      weight: 20,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return {
      name: 'performance',
      passed: false,
      label: 'Performance',
      detail: `failed after ${elapsed}ms — ${err instanceof Error ? err.message : 'unknown'}`,
      recommendation: 'Ensure your homepage is accessible and responds within 2 seconds',
      weight: 20,
    };
  }
}
