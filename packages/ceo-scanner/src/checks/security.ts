import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

export async function checkSecurity(baseUrl: string, context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const { headers } = context;

  // HTTPS?
  const isHttps = baseUrl.startsWith('https://');
  if (isHttps) {
    subs.push({ name: 'HTTPS', points: 20, maxPoints: 20, detail: 'site uses HTTPS' });
  } else {
    subs.push({ name: 'HTTPS', points: 0, maxPoints: 20, detail: 'not using HTTPS' });
    recs.push('Serve your site over HTTPS');
  }

  // security.txt?
  let hasSecurityTxt = false;
  try {
    const res = await fetch(new URL('/.well-known/security.txt', baseUrl).href, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': UA },
    });
    if (res.ok) {
      const text = await res.text();
      if (text.length > 10) {
        hasSecurityTxt = true;
      }
    }
  } catch {
    // ignore
  }
  if (hasSecurityTxt) {
    subs.push({ name: 'security.txt', points: 20, maxPoints: 20, detail: 'found at /.well-known/security.txt' });
  } else {
    subs.push({ name: 'security.txt', points: 0, maxPoints: 20, detail: 'not found' });
    recs.push('Add /.well-known/security.txt (RFC 9116)');
  }

  // CORS headers?
  const cors = headers['access-control-allow-origin'];
  if (cors) {
    subs.push({ name: 'CORS headers', points: 15, maxPoints: 15, detail: `ACAO: ${cors}` });
  } else {
    subs.push({ name: 'CORS headers', points: 0, maxPoints: 15, detail: 'no CORS headers' });
    recs.push('Add CORS headers so browser-based agents can call your API');
  }

  // Rate limit headers?
  const rateLimitKeys = Object.keys(headers).filter(k =>
    k.startsWith('x-ratelimit') || k.startsWith('ratelimit') || k === 'retry-after'
  );
  if (rateLimitKeys.length > 0) {
    subs.push({ name: 'Rate limit headers', points: 15, maxPoints: 15, detail: rateLimitKeys.join(', ') });
  } else {
    subs.push({ name: 'Rate limit headers', points: 0, maxPoints: 15, detail: 'no rate limit headers' });
    recs.push('Add rate-limit headers (X-RateLimit-*) to API responses');
  }

  // Authentication documented?
  const html = context.homepageHtml ?? '';
  const authKeywords = /\b(api[_-]?key|bearer|oauth|jwt|auth(entication|orization)?[_-]?token|api[_-]?token)\b/i;
  const authInHtml = authKeywords.test(html);
  const authInHeaders = headers['www-authenticate'] !== undefined;
  if (authInHtml || authInHeaders) {
    subs.push({ name: 'Auth documented', points: 15, maxPoints: 15, detail: 'authentication references found' });
  } else {
    subs.push({ name: 'Auth documented', points: 0, maxPoints: 15, detail: 'no auth documentation detected' });
    recs.push('Document your authentication method (API key, OAuth, etc.)');
  }

  // Content-Security-Policy?
  const csp = headers['content-security-policy'];
  if (csp) {
    subs.push({ name: 'CSP header', points: 15, maxPoints: 15, detail: 'Content-Security-Policy present' });
  } else {
    subs.push({ name: 'CSP header', points: 0, maxPoints: 15, detail: 'no Content-Security-Policy' });
    recs.push('Add Content-Security-Policy header');
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'security',
    category: 'transaction',
    label: 'Trust signals',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
