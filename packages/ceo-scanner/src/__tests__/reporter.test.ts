import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport, formatJson, formatHtml } from '../reporter.js';
import type { ScanResult } from '../types.js';

function makeScanResult(overrides?: Partial<ScanResult>): ScanResult {
  return {
    url: 'https://example.com',
    score: 50,
    grade: 'C',
    categories: {
      discovery: {
        score: 10,
        maxScore: 35,
        checks: [{
          name: 'llms-txt',
          category: 'discovery',
          label: 'llms.txt',
          score: 60,
          maxScore: 100,
          weight: 15,
          subScores: [{ name: 'Exists', points: 20, maxPoints: 20, detail: 'found' }],
          recommendations: ['Add more detail'],
        }],
      },
      integration: { score: 0, maxScore: 0, checks: [] },
      transaction: { score: 0, maxScore: 0, checks: [] },
    },
    recommendations: ['Add more detail'],
    timestamp: '2024-01-01T00:00:00.000Z',
    scanDurationMs: 1234,
    ...overrides,
  };
}

describe('formatReport', () => {
  it('includes score and grade', () => {
    const output = formatReport(makeScanResult());
    assert.ok(output.includes('50/100'));
    assert.ok(output.includes('(C)'));
  });

  it('includes URL', () => {
    const output = formatReport(makeScanResult());
    assert.ok(output.includes('example.com'));
  });

  it('includes check label', () => {
    const output = formatReport(makeScanResult());
    assert.ok(output.includes('llms.txt'));
  });

  it('includes recommendations', () => {
    const output = formatReport(makeScanResult());
    assert.ok(output.includes('Add more detail'));
  });

  it('includes scan duration', () => {
    const output = formatReport(makeScanResult());
    assert.ok(output.includes('1234ms'));
  });

  it('does not crash on empty categories', () => {
    const result = makeScanResult({
      categories: {
        discovery: { score: 0, maxScore: 0, checks: [] },
        integration: { score: 0, maxScore: 0, checks: [] },
        transaction: { score: 0, maxScore: 0, checks: [] },
      },
      recommendations: [],
    });
    const output = formatReport(result);
    assert.ok(typeof output === 'string');
  });

  it('does not use emojis', () => {
    const output = formatReport(makeScanResult());
    // Check no common emojis present
    assert.ok(!output.match(/[\u{1F600}-\u{1F64F}]/u));
    assert.ok(!output.includes('\u2705')); // no checkmark emoji
    assert.ok(!output.includes('\u274C')); // no X emoji
  });
});

describe('formatJson', () => {
  it('returns valid JSON', () => {
    const json = formatJson(makeScanResult());
    const parsed = JSON.parse(json) as ScanResult;
    assert.equal(parsed.score, 50);
    assert.equal(parsed.grade, 'C');
  });
});

describe('formatHtml', () => {
  it('returns valid HTML', () => {
    const html = formatHtml(makeScanResult());
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('</html>'));
  });

  it('includes score', () => {
    const html = formatHtml(makeScanResult());
    assert.ok(html.includes('50/100'));
  });

  it('escapes HTML entities', () => {
    const result = makeScanResult({ url: 'https://example.com/<script>' });
    const html = formatHtml(result);
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('handles zero-score result', () => {
    const result = makeScanResult({ score: 0, grade: 'F' });
    const html = formatHtml(result);
    assert.ok(html.includes('0/100'));
    assert.ok(html.includes('(F)'));
  });
});
