import type { CheckResult, ScanContext, SubScore } from '../types.js';

export async function checkPerformance(baseUrl: string, context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const { responseTime, headers, homepageHtml } = context;

  // Response time scoring
  if (responseTime > 0 && responseTime < 500) {
    subs.push({ name: 'Response time', points: 30, maxPoints: 30, detail: `${responseTime}ms (fast)` });
  } else if (responseTime > 0 && responseTime < 1000) {
    subs.push({ name: 'Response time', points: 20, maxPoints: 30, detail: `${responseTime}ms (good)` });
  } else if (responseTime > 0 && responseTime < 2000) {
    subs.push({ name: 'Response time', points: 10, maxPoints: 30, detail: `${responseTime}ms (acceptable)` });
  } else {
    subs.push({ name: 'Response time', points: 0, maxPoints: 30, detail: responseTime > 0 ? `${responseTime}ms (slow)` : 'could not measure' });
    recs.push(`Response time is ${responseTime}ms -- aim for <500ms for AI agents`);
  }

  // Returns 200 OK?
  const status = headers['x-status-code'];
  if (status === '200' || (homepageHtml !== undefined && !status)) {
    subs.push({ name: 'HTTP 200 OK', points: 20, maxPoints: 20, detail: 'homepage returns 200' });
  } else {
    subs.push({ name: 'HTTP 200 OK', points: 0, maxPoints: 20, detail: status ? `HTTP ${status}` : 'homepage unreachable' });
    recs.push('Ensure your homepage returns HTTP 200');
  }

  // CORS headers?
  const cors = headers['access-control-allow-origin'];
  if (cors) {
    subs.push({ name: 'CORS headers', points: 15, maxPoints: 15, detail: `Access-Control-Allow-Origin: ${cors}` });
  } else {
    subs.push({ name: 'CORS headers', points: 0, maxPoints: 15, detail: 'no CORS headers' });
    recs.push('Add Access-Control-Allow-Origin header for cross-origin agent access');
  }

  // Cache headers?
  const cacheControl = headers['cache-control'];
  const etag = headers['etag'];
  const lastModified = headers['last-modified'];
  if (cacheControl || etag || lastModified) {
    const found = [cacheControl ? 'Cache-Control' : '', etag ? 'ETag' : '', lastModified ? 'Last-Modified' : ''].filter(Boolean);
    subs.push({ name: 'Cache headers', points: 10, maxPoints: 10, detail: found.join(', ') });
  } else {
    subs.push({ name: 'Cache headers', points: 0, maxPoints: 10, detail: 'no cache headers' });
    recs.push('Add cache headers (Cache-Control, ETag) for efficient agent re-fetching');
  }

  // Content-Type correct?
  const ct = headers['content-type'] ?? '';
  if (ct.includes('text/html')) {
    subs.push({ name: 'Content-Type', points: 10, maxPoints: 10, detail: ct.split(';')[0] });
  } else if (ct) {
    subs.push({ name: 'Content-Type', points: 5, maxPoints: 10, detail: ct.split(';')[0] });
  } else {
    subs.push({ name: 'Content-Type', points: 0, maxPoints: 10, detail: 'no Content-Type header' });
  }

  // Response size reasonable?
  const contentLength = headers['content-length'];
  const bodySize = homepageHtml ? new TextEncoder().encode(homepageHtml).length : 0;
  const size = contentLength ? parseInt(contentLength, 10) : bodySize;
  if (size > 0 && size <= 512000) {
    subs.push({ name: 'Response size', points: 15, maxPoints: 15, detail: `${(size / 1024).toFixed(0)}KB` });
  } else if (size > 512000) {
    subs.push({ name: 'Response size', points: 5, maxPoints: 15, detail: `${(size / 1024).toFixed(0)}KB (large)` });
    recs.push('Reduce homepage size to <500KB for faster agent processing');
  } else {
    subs.push({ name: 'Response size', points: 0, maxPoints: 15, detail: 'could not determine size' });
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'performance',
    category: 'integration',
    label: 'Performance',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
