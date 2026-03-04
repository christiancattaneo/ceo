import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ScanContext } from '../types.js';

// Import all checks to verify they handle errors gracefully
import { checkLlmsTxt } from '../checks/llms-txt.js';
import { checkMcp } from '../checks/mcp.js';
import { checkA2a } from '../checks/a2a.js';
import { checkOpenApi } from '../checks/openapi.js';
import { checkStructuredData } from '../checks/structured-data.js';
import { checkPerformance } from '../checks/performance.js';
import { checkRegistry } from '../checks/registry.js';
import { checkPayment } from '../checks/payment.js';
import { checkSecurity } from '../checks/security.js';

const INVALID_URL = 'https://this-domain-definitely-does-not-exist-12345.invalid';

const emptyContext: ScanContext = {
  homepageHtml: undefined,
  headers: {},
  responseTime: 0,
};

const htmlContext: ScanContext = {
  homepageHtml: '<html><head></head><body>Hello</body></html>',
  headers: { 'x-status-code': '200', 'content-type': 'text/html' },
  responseTime: 100,
};

describe('checks handle network errors gracefully', () => {
  it('checkLlmsTxt returns score 0 on invalid URL', async () => {
    const result = await checkLlmsTxt(INVALID_URL, emptyContext);
    assert.equal(result.name, 'llms-txt');
    assert.equal(result.category, 'discovery');
    assert.ok(result.score >= 0);
    assert.ok(result.score <= 100);
    assert.ok(Array.isArray(result.subScores));
    assert.ok(Array.isArray(result.recommendations));
  });

  it('checkMcp returns score 0 on invalid URL', async () => {
    const result = await checkMcp(INVALID_URL, emptyContext);
    assert.equal(result.name, 'mcp');
    assert.equal(result.category, 'integration');
    assert.ok(result.score >= 0);
  });

  it('checkA2a returns score 0 on invalid URL', async () => {
    const result = await checkA2a(INVALID_URL, emptyContext);
    assert.equal(result.name, 'a2a');
    assert.ok(result.score >= 0);
  });

  it('checkOpenApi returns score 0 on invalid URL', async () => {
    const result = await checkOpenApi(INVALID_URL, emptyContext);
    assert.equal(result.name, 'openapi');
    assert.ok(result.score >= 0);
  });

  it('checkRegistry returns score 0-100 on invalid URL', async () => {
    const result = await checkRegistry(INVALID_URL, emptyContext);
    assert.equal(result.name, 'registry');
    assert.equal(result.category, 'discovery');
    assert.ok(result.score >= 0 && result.score <= 100);
  });

  it('checkPayment returns score 0 on invalid URL', async () => {
    const result = await checkPayment(INVALID_URL, emptyContext);
    assert.equal(result.name, 'payment');
    assert.equal(result.category, 'transaction');
    assert.ok(result.score >= 0);
  });

  it('checkSecurity returns valid result on invalid URL', async () => {
    const result = await checkSecurity(INVALID_URL, emptyContext);
    assert.equal(result.name, 'security');
    assert.equal(result.category, 'transaction');
    assert.ok(result.score >= 0);
  });
});

describe('checks return correct structure', () => {
  it('checkStructuredData finds JSON-LD in HTML', async () => {
    const ctx: ScanContext = {
      homepageHtml: `<html><head>
        <script type="application/ld+json">{"@type":"SoftwareApplication","name":"Test","description":"A test app"}</script>
      </head><body></body></html>`,
      headers: {},
      responseTime: 100,
    };
    const result = await checkStructuredData('https://example.com', ctx);
    assert.equal(result.name, 'structured-data');
    assert.ok(result.score > 0, 'should score > 0 when JSON-LD is present');
    assert.ok(result.subScores.some(s => s.name === 'JSON-LD present' && s.points > 0));
  });

  it('checkStructuredData returns 0 with no HTML', async () => {
    const result = await checkStructuredData('https://example.com', emptyContext);
    assert.equal(result.score, 0);
  });

  it('checkPerformance scores response time', async () => {
    const fastCtx: ScanContext = {
      homepageHtml: '<html></html>',
      headers: { 'x-status-code': '200', 'content-type': 'text/html', 'cache-control': 'max-age=300' },
      responseTime: 200,
    };
    const result = await checkPerformance('https://example.com', fastCtx);
    assert.ok(result.score > 0);
    assert.ok(result.subScores.some(s => s.name === 'Response time' && s.points > 0));
  });

  it('all checks have maxScore 100', async () => {
    const checks = [
      await checkLlmsTxt(INVALID_URL, emptyContext),
      await checkMcp(INVALID_URL, emptyContext),
      await checkA2a(INVALID_URL, emptyContext),
      await checkOpenApi(INVALID_URL, emptyContext),
      await checkStructuredData(INVALID_URL, emptyContext),
      await checkPerformance(INVALID_URL, emptyContext),
      await checkPayment(INVALID_URL, emptyContext),
      await checkSecurity(INVALID_URL, emptyContext),
    ];
    for (const check of checks) {
      assert.equal(check.maxScore, 100, `${check.name} should have maxScore 100`);
    }
  });
});
