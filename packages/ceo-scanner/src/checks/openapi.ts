import type { CheckResult } from '../types.js';

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

export async function checkOpenApi(baseUrl: string, homepageHtml?: string): Promise<CheckResult> {
  // Check common paths
  for (const path of OPENAPI_PATHS) {
    try {
      const url = new URL(path, baseUrl).href;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
        redirect: 'follow',
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        // Verify it's actually an API spec, not an HTML error page
        if (
          contentType.includes('json') ||
          contentType.includes('yaml') ||
          contentType.includes('text/plain')
        ) {
          return {
            name: 'openapi',
            passed: true,
            label: 'OpenAPI',
            detail: `found at ${path}`,
            weight: 10,
          };
        }
      }
    } catch {
      // continue to next path
    }
  }

  // Check homepage HTML for linked OpenAPI spec
  if (homepageHtml) {
    const specLink = homepageHtml.match(
      /<link[^>]*href=["']([^"']*(?:openapi|swagger)[^"']*)["'][^>]*>/i
    );
    if (specLink) {
      return {
        name: 'openapi',
        passed: true,
        label: 'OpenAPI',
        detail: `linked in HTML → ${specLink[1]}`,
        weight: 10,
      };
    }
  }

  return {
    name: 'openapi',
    passed: false,
    label: 'OpenAPI',
    detail: 'not found',
    recommendation: 'Publish an OpenAPI spec at /openapi.json for API discoverability',
    weight: 10,
  };
}
