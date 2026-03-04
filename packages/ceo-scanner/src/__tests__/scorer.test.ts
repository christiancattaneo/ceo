import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, gradeFromScore } from '../scorer.js';
import type { CheckResult } from '../types.js';

function makeCheck(overrides: Partial<CheckResult>): CheckResult {
  return {
    name: 'test',
    category: 'discovery',
    label: 'Test',
    score: 0,
    maxScore: 100,
    weight: 10,
    subScores: [],
    recommendations: [],
    ...overrides,
  };
}

describe('gradeFromScore', () => {
  it('returns A+ for 90+', () => {
    assert.equal(gradeFromScore(90), 'A+');
    assert.equal(gradeFromScore(100), 'A+');
  });

  it('returns A for 80-89', () => {
    assert.equal(gradeFromScore(80), 'A');
    assert.equal(gradeFromScore(89), 'A');
  });

  it('returns B for 70-79', () => {
    assert.equal(gradeFromScore(70), 'B');
    assert.equal(gradeFromScore(79), 'B');
  });

  it('returns C for 50-69', () => {
    assert.equal(gradeFromScore(50), 'C');
    assert.equal(gradeFromScore(69), 'C');
  });

  it('returns D for 30-49', () => {
    assert.equal(gradeFromScore(30), 'D');
    assert.equal(gradeFromScore(49), 'D');
  });

  it('returns F for <30', () => {
    assert.equal(gradeFromScore(0), 'F');
    assert.equal(gradeFromScore(29), 'F');
  });
});

describe('calculateScore', () => {
  it('returns 0 for all-zero checks', () => {
    const checks = [
      makeCheck({ score: 0, weight: 10, category: 'discovery' }),
      makeCheck({ score: 0, weight: 10, category: 'integration' }),
    ];
    const result = calculateScore('https://example.com', checks, 100);
    assert.equal(result.score, 0);
    assert.equal(result.grade, 'F');
  });

  it('returns 100 for all-perfect checks', () => {
    const checks = [
      makeCheck({ score: 100, weight: 10, category: 'discovery' }),
      makeCheck({ score: 100, weight: 15, category: 'integration' }),
      makeCheck({ score: 100, weight: 10, category: 'transaction' }),
    ];
    const result = calculateScore('https://example.com', checks, 100);
    assert.equal(result.score, 100);
    assert.equal(result.grade, 'A+');
  });

  it('calculates weighted average correctly', () => {
    const checks = [
      makeCheck({ score: 100, weight: 10, category: 'discovery' }),
      makeCheck({ score: 0, weight: 10, category: 'integration' }),
    ];
    const result = calculateScore('https://example.com', checks, 50);
    assert.equal(result.score, 50);
  });

  it('puts checks into correct categories', () => {
    const checks = [
      makeCheck({ name: 'a', category: 'discovery' }),
      makeCheck({ name: 'b', category: 'integration' }),
      makeCheck({ name: 'c', category: 'transaction' }),
    ];
    const result = calculateScore('https://example.com', checks, 50);
    assert.equal(result.categories.discovery.checks.length, 1);
    assert.equal(result.categories.integration.checks.length, 1);
    assert.equal(result.categories.transaction.checks.length, 1);
  });

  it('calculates category scores from check weights and scores', () => {
    const checks = [
      makeCheck({ score: 80, weight: 15, category: 'discovery' }),
      makeCheck({ score: 60, weight: 10, category: 'discovery' }),
    ];
    const result = calculateScore('https://example.com', checks, 50);
    // earned = (80/100)*15 + (60/100)*10 = 12 + 6 = 18
    // maxScore = 15 + 10 = 25
    assert.equal(result.categories.discovery.score, 18);
    assert.equal(result.categories.discovery.maxScore, 25);
  });

  it('returns top 5 recommendations sorted by weight', () => {
    const checks = [
      makeCheck({ weight: 5, recommendations: ['low-weight rec'] }),
      makeCheck({ weight: 15, recommendations: ['high-weight rec 1', 'high-weight rec 2'] }),
      makeCheck({ weight: 10, recommendations: ['mid 1', 'mid 2', 'mid 3', 'mid 4'] }),
    ];
    const result = calculateScore('https://example.com', checks, 50);
    assert.equal(result.recommendations.length, 5);
    assert.equal(result.recommendations[0], 'high-weight rec 1');
    assert.equal(result.recommendations[1], 'high-weight rec 2');
  });

  it('preserves url and scanDurationMs', () => {
    const result = calculateScore('https://test.com', [], 1234);
    assert.equal(result.url, 'https://test.com');
    assert.equal(result.scanDurationMs, 1234);
  });

  it('has a valid ISO timestamp', () => {
    const result = calculateScore('https://test.com', [], 0);
    assert.ok(result.timestamp.match(/^\d{4}-\d{2}-\d{2}T/));
  });

  it('handles empty checks array', () => {
    const result = calculateScore('https://test.com', [], 0);
    assert.equal(result.score, 0);
    assert.equal(result.grade, 'F');
    assert.equal(result.recommendations.length, 0);
  });
});
