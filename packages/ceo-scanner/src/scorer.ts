import type { Category, CategoryResult, CheckResult, ScanResult } from './types.js';

export function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function calculateScore(
  url: string,
  checks: CheckResult[],
  scanDurationMs: number,
): ScanResult {
  const categories: Record<Category, CheckResult[]> = {
    discovery: [],
    integration: [],
    transaction: [],
  };

  for (const check of checks) {
    categories[check.category].push(check);
  }

  const catResults = {
    discovery: buildCategory(categories.discovery),
    integration: buildCategory(categories.integration),
    transaction: buildCategory(categories.transaction),
  };

  // Weighted average across all checks
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const check of checks) {
    totalWeighted += check.score * check.weight;
    totalWeight += check.weight;
  }
  const score = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : 0;

  // Top 5 recommendations by check weight (highest weight = most impactful)
  const allRecs: Array<{ rec: string; weight: number }> = [];
  for (const check of checks) {
    for (const rec of check.recommendations) {
      allRecs.push({ rec, weight: check.weight });
    }
  }
  allRecs.sort((a, b) => b.weight - a.weight);
  const topRecs = allRecs.slice(0, 5).map(r => r.rec);

  return {
    url,
    score,
    grade: gradeFromScore(score),
    categories: catResults,
    recommendations: topRecs,
    timestamp: new Date().toISOString(),
    scanDurationMs,
  };
}

function buildCategory(checks: CheckResult[]): CategoryResult {
  if (checks.length === 0) {
    return { score: 0, maxScore: 0, checks };
  }

  const maxScore = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.score / 100) * c.weight, 0);

  return {
    score: Math.round(earned),
    maxScore,
    checks,
  };
}
