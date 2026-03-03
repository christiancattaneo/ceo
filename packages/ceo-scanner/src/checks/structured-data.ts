import type { CheckResult } from '../types.js';

export async function checkStructuredData(
  _baseUrl: string,
  homepageHtml?: string
): Promise<CheckResult> {
  if (!homepageHtml) {
    return {
      name: 'structured-data',
      passed: false,
      label: 'Structured data',
      detail: 'could not fetch homepage HTML',
      recommendation: 'Add JSON-LD structured data to your homepage',
      weight: 10,
    };
  }

  // Find all <script type="application/ld+json"> blocks
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...homepageHtml.matchAll(jsonLdRegex)];

  if (matches.length === 0) {
    return {
      name: 'structured-data',
      passed: false,
      label: 'Structured data',
      detail: 'no JSON-LD found',
      recommendation: 'Add JSON-LD structured data to your homepage for rich AI understanding',
      weight: 10,
    };
  }

  // Parse and extract types
  const types: string[] = [];
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]) as Record<string, unknown>;
      if (data['@type']) {
        types.push(String(data['@type']));
      } else if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph'] as Record<string, unknown>[]) {
          if (item['@type']) types.push(String(item['@type']));
        }
      }
    } catch {
      // malformed JSON-LD, still counts as present
    }
  }

  const typeStr = types.length > 0 ? types.join(', ') : `${matches.length} block(s)`;

  return {
    name: 'structured-data',
    passed: true,
    label: 'Structured data',
    detail: `JSON-LD present (${typeStr})`,
    weight: 10,
  };
}
