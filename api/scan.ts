import type { IncomingMessage, ServerResponse } from 'node:http';

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, resets on cold start)
// ---------------------------------------------------------------------------
const RATE_LIMIT = 10; // scans per hour per IP
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ---------------------------------------------------------------------------
// Inline scanner (same logic as the package, self-contained for Vercel)
// ---------------------------------------------------------------------------

interface SubScore {
  name: string;
  points: number;
  maxPoints: number;
  detail: string;
}

interface CheckResult {
  name: string;
  category: 'discovery' | 'integration' | 'transaction';
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  subScores: SubScore[];
  recommendations: string[];
}

interface CategoryResult {
  score: number;
  maxScore: number;
  checks: CheckResult[];
}

interface ScanResult {
  url: string;
  score: number;
  grade: string;
  categories: {
    discovery: CategoryResult;
    integration: CategoryResult;
    transaction: CategoryResult;
  };
  recommendations: string[];
  timestamp: string;
  scanDurationMs: number;
}

const UA = 'ceo-scanner/1.0.0 (api)';

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

function gradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

function buildCheck(
  name: string,
  category: CheckResult['category'],
  label: string,
  weight: number,
  subs: SubScore[],
  recs: string[],
): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;
  return { name, category, label, score, maxScore: 100, weight, subScores: subs, recommendations: recs };
}

async function safeFetch(url: string, timeout = 10000): Promise<Response | null> {
  try {
    return await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
  } catch {
    return null;
  }
}

// -- checks --

async function checkLlmsTxt(baseUrl: string): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const res = await safeFetch(`${baseUrl}/llms.txt`);
  if (!res?.ok) {
    subs.push({ name: 'Exists', points: 0, maxPoints: 20, detail: 'not found' });
    recs.push('Add /llms.txt');
    return buildCheck('llms-txt', 'discovery', 'llms.txt', 15, subs, recs);
  }

  const text = await res.text();
  subs.push({ name: 'Exists', points: 20, maxPoints: 20, detail: 'found' });

  const hasTitle = /^#\s+.+/m.test(text);
  subs.push({ name: 'Has title', points: hasTitle ? 10 : 0, maxPoints: 10, detail: hasTitle ? 'title found' : 'no title' });

  const hasCaps = /\b(capabilities?|actions?|tools?|endpoints?|features?)\b/i.test(text);
  subs.push({ name: 'Capabilities', points: hasCaps ? 20 : 0, maxPoints: 20, detail: hasCaps ? 'described' : 'missing' });
  if (!hasCaps) recs.push('Describe capabilities in llms.txt');

  const hasPrice = /\b(pric|cost|free|\$\d|USD)\b/i.test(text);
  subs.push({ name: 'Pricing', points: hasPrice ? 10 : 0, maxPoints: 10, detail: hasPrice ? 'found' : 'missing' });

  const hasLinks = /https?:\/\/\S+/.test(text) && /\b(api|docs?)\b/i.test(text);
  subs.push({ name: 'API links', points: hasLinks ? 10 : 0, maxPoints: 10, detail: hasLinks ? 'found' : 'missing' });

  const fullRes = await safeFetch(`${baseUrl}/llms-full.txt`);
  subs.push({ name: 'llms-full.txt', points: fullRes?.ok ? 10 : 0, maxPoints: 10, detail: fullRes?.ok ? 'found' : 'missing' });

  const size = new TextEncoder().encode(text).length;
  subs.push({ name: 'Size', points: size <= 10240 ? 10 : 0, maxPoints: 10, detail: `${(size / 1024).toFixed(1)}KB` });

  const fmt = [/^#\s+/m.test(text), /^>\s+/m.test(text), /^##\s+/m.test(text)].filter(Boolean).length;
  subs.push({ name: 'Format', points: fmt >= 2 ? 10 : fmt === 1 ? 5 : 0, maxPoints: 10, detail: `${fmt}/3 format elements` });

  return buildCheck('llms-txt', 'discovery', 'llms.txt', 15, subs, recs);
}

async function checkStructuredData(html: string | undefined): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  if (!html) {
    subs.push({ name: 'JSON-LD', points: 0, maxPoints: 20, detail: 'no HTML' });
    recs.push('Add JSON-LD structured data');
    return buildCheck('structured-data', 'discovery', 'Structured data', 10, subs, recs);
  }

  const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(ldRegex)];

  if (matches.length === 0) {
    subs.push({ name: 'JSON-LD', points: 0, maxPoints: 20, detail: 'none found' });
    recs.push('Add JSON-LD structured data');
    return buildCheck('structured-data', 'discovery', 'Structured data', 10, subs, recs);
  }

  subs.push({ name: 'JSON-LD', points: 20, maxPoints: 20, detail: `${matches.length} block(s)` });

  const items: Record<string, unknown>[] = [];
  for (const m of matches) {
    try {
      const p = JSON.parse(m[1]) as Record<string, unknown>;
      if (Array.isArray(p['@graph'])) items.push(...(p['@graph'] as Record<string, unknown>[]));
      else items.push(p);
    } catch { /* skip */ }
  }

  const types = items.flatMap(i => {
    const t = i['@type'];
    return typeof t === 'string' ? [t] : Array.isArray(t) ? t.map(String) : [];
  });
  const relevant = ['SoftwareApplication', 'Product', 'WebAPI', 'Service'];
  const found = types.filter(t => relevant.some(r => t.includes(r)));
  subs.push({ name: '@type', points: found.length > 0 ? 20 : types.length > 0 ? 10 : 0, maxPoints: 20, detail: types.slice(0, 3).join(', ') || 'none' });

  subs.push({ name: 'Name/desc', points: items.some(i => i['name'] && i['description']) ? 15 : 0, maxPoints: 15, detail: items.some(i => i['name']) ? 'present' : 'missing' });
  subs.push({ name: 'Offers', points: items.some(i => i['offers'] || i['price']) ? 15 : 0, maxPoints: 15, detail: items.some(i => i['offers']) ? 'found' : 'none' });
  subs.push({ name: 'Provider', points: items.some(i => i['provider'] || i['author']) ? 10 : 0, maxPoints: 10, detail: items.some(i => i['provider']) ? 'found' : 'none' });
  subs.push({ name: 'Features', points: items.some(i => i['featureList'] || i['potentialAction']) ? 20 : 0, maxPoints: 20, detail: items.some(i => i['featureList']) ? 'found' : 'none' });

  return buildCheck('structured-data', 'discovery', 'Structured data', 10, subs, recs);
}

async function checkMcp(baseUrl: string, html: string | undefined): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const res = await safeFetch(`${baseUrl}/.well-known/mcp.json`);
  if (!res?.ok) {
    subs.push({ name: 'Exists', points: 0, maxPoints: 20, detail: 'not found' });
    const hasLink = html ? /<link[^>]*rel=["']mcp["']/i.test(html) : false;
    subs.push({ name: 'HTML link', points: hasLink ? 10 : 0, maxPoints: 10, detail: hasLink ? 'found' : 'none' });
    recs.push('Add /.well-known/mcp.json');
    return buildCheck('mcp', 'integration', 'MCP endpoint', 15, subs, recs);
  }

  subs.push({ name: 'Exists', points: 20, maxPoints: 20, detail: 'found' });

  let data: Record<string, unknown> = {};
  try { data = await res.json() as Record<string, unknown>; } catch { /* */ }

  const tools = Array.isArray(data['tools']) ? data['tools'] as Record<string, unknown>[] : [];
  subs.push({ name: 'Structure', points: data['name'] && tools.length > 0 ? 15 : 0, maxPoints: 15, detail: `${tools.length} tools` });
  const described = tools.filter(t => typeof t['description'] === 'string' && (t['description'] as string).length > 0);
  subs.push({ name: 'Descriptions', points: described.length === tools.length && tools.length > 0 ? 15 : 0, maxPoints: 15, detail: `${described.length}/${tools.length}` });
  const detailed = described.filter(t => (t['description'] as string).length > 20);
  subs.push({ name: 'Detailed', points: detailed.length === described.length && described.length > 0 ? 15 : 0, maxPoints: 15, detail: `${detailed.length} detailed` });
  subs.push({ name: 'Auth', points: data['authentication'] ? 10 : 0, maxPoints: 10, detail: data['authentication'] ? 'present' : 'none' });
  subs.push({ name: 'HTML link', points: html && /<link[^>]*rel=["']mcp["']/i.test(html) ? 10 : 0, maxPoints: 10, detail: 'checked' });
  subs.push({ name: 'Transport', points: data['transport'] || data['transportType'] ? 15 : 0, maxPoints: 15, detail: String(data['transport'] ?? data['transportType'] ?? 'none') });

  return buildCheck('mcp', 'integration', 'MCP endpoint', 15, subs, recs);
}

async function checkA2a(baseUrl: string): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const res = await safeFetch(`${baseUrl}/.well-known/agent.json`);
  if (!res?.ok) {
    subs.push({ name: 'Exists', points: 0, maxPoints: 25, detail: 'not found' });
    recs.push('Add /.well-known/agent.json');
    return buildCheck('a2a', 'integration', 'A2A endpoint', 10, subs, recs);
  }

  subs.push({ name: 'Exists', points: 25, maxPoints: 25, detail: 'found' });
  let data: Record<string, unknown> = {};
  try { data = await res.json() as Record<string, unknown>; } catch { /* */ }

  subs.push({ name: 'Name/desc', points: data['name'] && data['description'] ? 15 : 0, maxPoints: 15, detail: String(data['name'] ?? 'none') });
  const caps = Array.isArray(data['capabilities']) ? data['capabilities'] : [];
  subs.push({ name: 'Capabilities', points: caps.length > 0 ? 20 : 0, maxPoints: 20, detail: `${caps.length}` });
  subs.push({ name: 'Auth', points: data['authentication'] ? 15 : 0, maxPoints: 15, detail: data['authentication'] ? 'present' : 'none' });
  subs.push({ name: 'Endpoint', points: data['endpoint'] || data['url'] ? 15 : 0, maxPoints: 15, detail: String(data['endpoint'] ?? data['url'] ?? 'none') });
  const fields = ['name', 'description', 'capabilities', 'endpoint'].filter(f => data[f] !== undefined);
  subs.push({ name: 'Spec', points: fields.length >= 3 ? 10 : fields.length >= 1 ? 5 : 0, maxPoints: 10, detail: `${fields.length}/4 fields` });

  return buildCheck('a2a', 'integration', 'A2A endpoint', 10, subs, recs);
}

async function checkOpenApi(baseUrl: string): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];
  const paths = ['/openapi.json', '/openapi.yaml', '/swagger.json', '/swagger.yaml', '/api-docs', '/.well-known/openapi.json'];

  let spec: Record<string, unknown> | null = null;
  let foundAt = '';

  for (const p of paths) {
    const res = await safeFetch(`${baseUrl}${p}`, 5000);
    if (res?.ok) {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('json') || ct.includes('yaml') || ct.includes('text/plain')) {
        try { spec = await res.json() as Record<string, unknown>; foundAt = p; } catch { /* */ }
        break;
      }
    }
  }

  if (!spec) {
    subs.push({ name: 'Found', points: 0, maxPoints: 25, detail: 'not found' });
    recs.push('Publish OpenAPI spec at /openapi.json');
    return buildCheck('openapi', 'integration', 'OpenAPI', 10, subs, recs);
  }

  subs.push({ name: 'Found', points: 25, maxPoints: 25, detail: foundAt });
  const v = spec['openapi'] ?? spec['swagger'];
  subs.push({ name: 'Version', points: typeof v === 'string' && v.startsWith('3') ? 15 : v ? 8 : 0, maxPoints: 15, detail: String(v ?? 'unknown') });

  const specStr = JSON.stringify(spec);
  subs.push({ name: 'Descriptions', points: specStr.includes('"description"') ? 15 : 0, maxPoints: 15, detail: specStr.includes('"description"') ? 'found' : 'none' });
  subs.push({ name: 'Schemas', points: specStr.includes('"requestBody"') || specStr.includes('"responses"') ? 15 : 0, maxPoints: 15, detail: 'checked' });
  subs.push({ name: 'Auth', points: specStr.includes('"securitySchemes"') || specStr.includes('"securityDefinitions"') ? 15 : 0, maxPoints: 15, detail: 'checked' });
  subs.push({ name: 'Examples', points: specStr.includes('"example"') ? 15 : 0, maxPoints: 15, detail: 'checked' });

  return buildCheck('openapi', 'integration', 'OpenAPI', 10, subs, recs);
}

async function checkPerformance(
  responseTime: number,
  headers: Record<string, string>,
  html: string | undefined,
): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  if (responseTime < 500) subs.push({ name: 'Speed', points: 30, maxPoints: 30, detail: `${responseTime}ms` });
  else if (responseTime < 1000) subs.push({ name: 'Speed', points: 20, maxPoints: 30, detail: `${responseTime}ms` });
  else if (responseTime < 2000) subs.push({ name: 'Speed', points: 10, maxPoints: 30, detail: `${responseTime}ms` });
  else { subs.push({ name: 'Speed', points: 0, maxPoints: 30, detail: `${responseTime}ms` }); recs.push('Improve response time'); }

  subs.push({ name: 'HTTP 200', points: headers['x-status-code'] === '200' ? 20 : 0, maxPoints: 20, detail: headers['x-status-code'] ?? 'unknown' });
  subs.push({ name: 'CORS', points: headers['access-control-allow-origin'] ? 15 : 0, maxPoints: 15, detail: headers['access-control-allow-origin'] ?? 'none' });
  subs.push({ name: 'Cache', points: headers['cache-control'] || headers['etag'] ? 10 : 0, maxPoints: 10, detail: headers['cache-control'] ? 'present' : 'none' });
  subs.push({ name: 'Content-Type', points: (headers['content-type'] ?? '').includes('text/html') ? 10 : 0, maxPoints: 10, detail: (headers['content-type'] ?? 'none').split(';')[0] });

  const size = html ? new TextEncoder().encode(html).length : 0;
  subs.push({ name: 'Size', points: size > 0 && size <= 512000 ? 15 : size > 512000 ? 5 : 0, maxPoints: 15, detail: size > 0 ? `${(size / 1024).toFixed(0)}KB` : 'unknown' });

  return buildCheck('performance', 'integration', 'Performance', 10, subs, recs);
}

async function checkRegistry(baseUrl: string): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];
  const domain = new URL(baseUrl).hostname.replace(/^www\./, '');
  const name = domain.split('.')[0];

  const ch = await safeFetch(`https://clawhub.ai/skills/${name}`, 8000);
  subs.push({ name: 'ClawHub', points: ch?.ok ? 25 : 0, maxPoints: 25, detail: ch?.ok ? 'listed' : 'not found' });

  const sm = await safeFetch(`https://smithery.ai/search?q=${encodeURIComponent(domain)}`, 8000);
  subs.push({ name: 'Smithery', points: sm?.ok ? 25 : 0, maxPoints: 25, detail: sm?.ok ? 'found' : 'not found' });

  let npmFound = false;
  try {
    const nr = await safeFetch(`https://registry.npmjs.org/-/v1/search?text=mcp+${encodeURIComponent(domain)}&size=3`, 8000);
    if (nr?.ok) {
      const d = await nr.json() as { objects?: Array<{ package: { name: string; description?: string } }> };
      npmFound = (d.objects ?? []).some(o =>
        o.package.name.toLowerCase().includes(name.toLowerCase()) ||
        (o.package.description ?? '').toLowerCase().includes(name.toLowerCase())
      );
    }
  } catch { /* */ }
  subs.push({ name: 'npm', points: npmFound ? 25 : 0, maxPoints: 25, detail: npmFound ? 'found' : 'not found' });

  const total = subs.filter(s => s.points > 0).length;
  subs.push({ name: 'Any', points: total > 0 ? 25 : 0, maxPoints: 25, detail: `${total} registries` });

  if (total === 0) recs.push('List on agent registries (ClawHub, Smithery, npm)');

  return buildCheck('registry', 'discovery', 'Registry', 10, subs, recs);
}

async function checkPayment(baseUrl: string, html: string | undefined): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const h = html ?? '';
  subs.push({ name: 'Stripe', points: /stripe/i.test(h) ? 25 : 0, maxPoints: 25, detail: /stripe/i.test(h) ? 'detected' : 'none' });

  let pricingFound = false;
  for (const p of ['/pricing', '/plans', '/pro']) {
    const r = await safeFetch(`${baseUrl}${p}`, 5000);
    if (r?.ok && (r.headers.get('content-type') ?? '').includes('text/html')) { pricingFound = true; break; }
  }
  subs.push({ name: 'Pricing page', points: pricingFound ? 25 : 0, maxPoints: 25, detail: pricingFound ? 'found' : 'none' });
  if (!pricingFound) recs.push('Add a /pricing page');

  subs.push({ name: 'API pricing', points: /\b(per\s+(request|token|call)|\$\d|free\s+tier)\b/i.test(h) ? 25 : 0, maxPoints: 25, detail: 'checked' });

  const ldCheck = /<script[^>]*ld\+json[^>]*>[^<]*(offers|priceSpec|price)/i.test(h);
  subs.push({ name: 'Structured pricing', points: ldCheck ? 25 : 0, maxPoints: 25, detail: ldCheck ? 'found' : 'none' });

  return buildCheck('payment', 'transaction', 'Payment ready', 10, subs, recs);
}

async function checkSecurity(baseUrl: string, headers: Record<string, string>, html: string | undefined): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  subs.push({ name: 'HTTPS', points: baseUrl.startsWith('https') ? 20 : 0, maxPoints: 20, detail: baseUrl.startsWith('https') ? 'yes' : 'no' });

  const sec = await safeFetch(`${baseUrl}/.well-known/security.txt`, 5000);
  subs.push({ name: 'security.txt', points: sec?.ok ? 20 : 0, maxPoints: 20, detail: sec?.ok ? 'found' : 'none' });
  if (!sec?.ok) recs.push('Add /.well-known/security.txt');

  subs.push({ name: 'CORS', points: headers['access-control-allow-origin'] ? 15 : 0, maxPoints: 15, detail: headers['access-control-allow-origin'] ?? 'none' });

  const rl = Object.keys(headers).some(k => k.includes('ratelimit') || k === 'retry-after');
  subs.push({ name: 'Rate limits', points: rl ? 15 : 0, maxPoints: 15, detail: rl ? 'present' : 'none' });
  if (!rl) recs.push('Add rate-limit headers');

  subs.push({ name: 'Auth docs', points: /\b(api[_-]?key|bearer|oauth|jwt)\b/i.test(html ?? '') ? 15 : 0, maxPoints: 15, detail: 'checked' });
  subs.push({ name: 'CSP', points: headers['content-security-policy'] ? 15 : 0, maxPoints: 15, detail: headers['content-security-policy'] ? 'present' : 'none' });

  return buildCheck('security', 'transaction', 'Trust signals', 10, subs, recs);
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

async function runScan(rawUrl: string): Promise<ScanResult> {
  const start = performance.now();
  const baseUrl = normalizeUrl(rawUrl);

  // Fetch homepage once
  let html: string | undefined;
  const headers: Record<string, string> = {};
  let responseTime = 0;

  try {
    const hpStart = performance.now();
    const res = await fetch(baseUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    html = res.ok ? await res.text() : undefined;
    responseTime = Math.round(performance.now() - hpStart);
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
    headers['x-status-code'] = String(res.status);
  } catch {
    responseTime = Math.round(performance.now() - start);
  }

  const checks = await Promise.all([
    checkLlmsTxt(baseUrl),
    checkStructuredData(html),
    checkRegistry(baseUrl),
    checkMcp(baseUrl, html),
    checkA2a(baseUrl),
    checkOpenApi(baseUrl),
    checkPerformance(responseTime, headers, html),
    checkPayment(baseUrl, html),
    checkSecurity(baseUrl, headers, html),
  ]);

  // Build categories
  const cats: Record<string, CheckResult[]> = { discovery: [], integration: [], transaction: [] };
  for (const c of checks) cats[c.category].push(c);

  const buildCat = (arr: CheckResult[]): CategoryResult => {
    const max = arr.reduce((s, c) => s + c.weight, 0);
    const earned = arr.reduce((s, c) => s + (c.score / 100) * c.weight, 0);
    return { score: Math.round(earned), maxScore: max, checks: arr };
  };

  let tw = 0, ts = 0;
  for (const c of checks) { tw += c.weight; ts += c.score * c.weight; }
  const score = tw > 0 ? Math.round(ts / tw) : 0;

  const allRecs = checks.flatMap(c => c.recommendations.map(r => ({ r, w: c.weight })));
  allRecs.sort((a, b) => b.w - a.w);

  return {
    url: baseUrl,
    score,
    grade: gradeFromScore(score),
    categories: {
      discovery: buildCat(cats['discovery']),
      integration: buildCat(cats['integration']),
      transaction: buildCat(cats['transaction']),
    },
    recommendations: allRecs.slice(0, 5).map(x => x.r),
    timestamp: new Date().toISOString(),
    scanDurationMs: Math.round(performance.now() - start),
  };
}

// ---------------------------------------------------------------------------
// Vercel handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse URL param
  const rawUrl = (req.query?.['url'] as string) ?? new URL(req.url ?? '/', `http://${req.headers.host}`).searchParams.get('url');

  if (!rawUrl || typeof rawUrl !== 'string') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
    return;
  }

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? 'unknown';
  if (isRateLimited(ip)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Rate limited. Max 10 scans/hour.' }));
    return;
  }

  try {
    const result = await runScan(rawUrl);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }));
  }
}
