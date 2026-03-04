import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

const OPENAPI_PATHS = [
  '/openapi.json',
  '/openapi.yaml',
  '/swagger.json',
  '/swagger.yaml',
  '/api-docs',
  '/api-docs.json',
  '/docs/openapi.json',
  '/.well-known/openapi.json',
];

export async function checkOpenApi(baseUrl: string, context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  let specText: string | null = null;
  let spec: Record<string, unknown> | null = null;
  let foundAt = '';

  // Try standard paths
  for (const path of OPENAPI_PATHS) {
    try {
      const res = await fetch(new URL(path, baseUrl).href, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': UA },
        redirect: 'follow',
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('json') || ct.includes('yaml') || ct.includes('text/plain')) {
          specText = await res.text();
          foundAt = path;
          break;
        }
      }
    } catch {
      // continue
    }
  }

  // Also check HTML for linked spec
  if (!specText && context.homepageHtml) {
    const link = context.homepageHtml.match(
      /<link[^>]*href=["']([^"']*(?:openapi|swagger)[^"']*)["'][^>]*>/i
    );
    if (link) {
      try {
        const specUrl = new URL(link[1], baseUrl).href;
        const res = await fetch(specUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': UA },
        });
        if (res.ok) {
          specText = await res.text();
          foundAt = link[1];
        }
      } catch {
        // ignore
      }
    }
  }

  // Spec found?
  if (specText) {
    subs.push({ name: 'Spec found', points: 25, maxPoints: 25, detail: `found at ${foundAt}` });
  } else {
    subs.push({ name: 'Spec found', points: 0, maxPoints: 25, detail: 'not found at any standard path' });
    recs.push('Publish an OpenAPI spec at /openapi.json for API discoverability');
    return buildResult(subs, recs);
  }

  // Try to parse as JSON
  try {
    spec = JSON.parse(specText) as Record<string, unknown>;
  } catch {
    // YAML or invalid — give partial credit
    subs.push({ name: 'Valid OpenAPI 3.x', points: 5, maxPoints: 15, detail: 'could not parse as JSON (may be YAML)' });
    return buildResult(subs, recs);
  }

  // Valid OpenAPI 3.x?
  const version = spec['openapi'] ?? spec['swagger'];
  const isV3 = typeof version === 'string' && version.startsWith('3');
  if (isV3) {
    subs.push({ name: 'Valid OpenAPI 3.x', points: 15, maxPoints: 15, detail: `OpenAPI ${version}` });
  } else if (version) {
    subs.push({ name: 'Valid OpenAPI 3.x', points: 8, maxPoints: 15, detail: `version ${version} (not 3.x)` });
    recs.push('Upgrade to OpenAPI 3.x for best AI agent compatibility');
  } else {
    subs.push({ name: 'Valid OpenAPI 3.x', points: 0, maxPoints: 15, detail: 'no version field found' });
    recs.push('Add openapi version field to your spec');
  }

  // Has operation descriptions?
  const paths = spec['paths'] as Record<string, Record<string, unknown>> | undefined;
  let opsTotal = 0;
  let opsWithDesc = 0;
  if (paths && typeof paths === 'object') {
    for (const pathObj of Object.values(paths)) {
      if (typeof pathObj !== 'object' || pathObj === null) continue;
      for (const [method, op] of Object.entries(pathObj)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          opsTotal++;
          const operation = op as Record<string, unknown>;
          if (typeof operation['description'] === 'string' || typeof operation['summary'] === 'string') {
            opsWithDesc++;
          }
        }
      }
    }
  }
  if (opsTotal > 0 && opsWithDesc === opsTotal) {
    subs.push({ name: 'Operation descriptions', points: 15, maxPoints: 15, detail: `${opsTotal} operations, all described` });
  } else if (opsWithDesc > 0) {
    subs.push({ name: 'Operation descriptions', points: 8, maxPoints: 15, detail: `${opsWithDesc}/${opsTotal} operations described` });
    recs.push(`Add descriptions to all OpenAPI operations (${opsTotal - opsWithDesc} missing)`);
  } else {
    subs.push({ name: 'Operation descriptions', points: 0, maxPoints: 15, detail: opsTotal > 0 ? 'no operation descriptions' : 'no operations found' });
    if (opsTotal > 0) recs.push('Add descriptions to your OpenAPI operations');
  }

  // Has request/response schemas?
  let hasSchemas = false;
  if (paths && typeof paths === 'object') {
    outer: for (const pathObj of Object.values(paths)) {
      if (typeof pathObj !== 'object' || pathObj === null) continue;
      for (const [method, op] of Object.entries(pathObj)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const operation = op as Record<string, unknown>;
          if (operation['requestBody'] || operation['responses']) {
            hasSchemas = true;
            break outer;
          }
        }
      }
    }
  }
  if (hasSchemas) {
    subs.push({ name: 'Request/response schemas', points: 15, maxPoints: 15, detail: 'schemas defined' });
  } else {
    subs.push({ name: 'Request/response schemas', points: 0, maxPoints: 15, detail: 'no schemas found' });
    recs.push('Add request/response schemas to your OpenAPI operations');
  }

  // Has authentication defined?
  const components = spec['components'] as Record<string, unknown> | undefined;
  const securitySchemes = components?.['securitySchemes'] ?? spec['securityDefinitions'];
  const hasSecurity = securitySchemes !== undefined && securitySchemes !== null;
  if (hasSecurity) {
    subs.push({ name: 'Authentication defined', points: 15, maxPoints: 15, detail: 'security schemes present' });
  } else {
    subs.push({ name: 'Authentication defined', points: 0, maxPoints: 15, detail: 'no security schemes' });
    recs.push('Define authentication in your OpenAPI spec (securitySchemes)');
  }

  // Has example values?
  let hasExamples = false;
  const specStr = JSON.stringify(spec);
  if (specStr.includes('"example"') || specStr.includes('"examples"')) {
    hasExamples = true;
  }
  if (hasExamples) {
    subs.push({ name: 'Example values', points: 15, maxPoints: 15, detail: 'examples included' });
  } else {
    subs.push({ name: 'Example values', points: 0, maxPoints: 15, detail: 'no examples found' });
    recs.push('Add example values to OpenAPI schemas so agents can construct valid requests');
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'openapi',
    category: 'integration',
    label: 'OpenAPI',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
