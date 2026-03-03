import type { CheckResult, ScanResult } from './types.js';

export function calculateScore(url: string, checks: CheckResult[]): ScanResult {
  const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);

  // Normalize to 0-100
  const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    url,
    checks,
    score: normalizedScore,
    maxScore: 100,
    timestamp: new Date(),
  };
}
