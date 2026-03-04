import type { CheckResult, ScanContext, SubScore } from '../types.js';

const RELEVANT_TYPES = [
  'SoftwareApplication', 'Product', 'WebAPI', 'WebApplication',
  'MobileApplication', 'APIReference', 'Service', 'WebSite',
];

export async function checkStructuredData(_baseUrl: string, context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const html = context.homepageHtml;
  if (!html) {
    subs.push({ name: 'JSON-LD present', points: 0, maxPoints: 20, detail: 'could not fetch homepage' });
    recs.push('Add JSON-LD structured data to your homepage');
    return buildResult(subs, recs);
  }

  // Find all JSON-LD blocks
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(jsonLdRegex)];

  if (matches.length === 0) {
    subs.push({ name: 'JSON-LD present', points: 0, maxPoints: 20, detail: 'no JSON-LD found' });
    recs.push('Add JSON-LD structured data to your homepage for rich AI understanding');
    return buildResult(subs, recs);
  }

  subs.push({ name: 'JSON-LD present', points: 20, maxPoints: 20, detail: `${matches.length} block(s) found` });

  // Parse all blocks
  const allItems: Record<string, unknown>[] = [];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      if (Array.isArray(parsed['@graph'])) {
        for (const item of parsed['@graph'] as Record<string, unknown>[]) {
          allItems.push(item);
        }
      } else {
        allItems.push(parsed);
      }
    } catch {
      // malformed, still counted as present above
    }
  }

  // Has relevant @type?
  const types: string[] = [];
  for (const item of allItems) {
    const t = item['@type'];
    if (typeof t === 'string') types.push(t);
    else if (Array.isArray(t)) types.push(...t.map(String));
  }
  const relevantFound = types.filter(t => RELEVANT_TYPES.some(rt => t.includes(rt)));
  if (relevantFound.length > 0) {
    subs.push({ name: 'Relevant @type', points: 20, maxPoints: 20, detail: relevantFound.join(', ') });
  } else if (types.length > 0) {
    subs.push({ name: 'Relevant @type', points: 10, maxPoints: 20, detail: `found: ${types.slice(0, 3).join(', ')} (not product/API type)` });
    recs.push('Use SoftwareApplication, Product, or WebAPI as your JSON-LD @type');
  } else {
    subs.push({ name: 'Relevant @type', points: 0, maxPoints: 20, detail: 'no @type found' });
    recs.push('Add @type to your JSON-LD (SoftwareApplication, Product, or WebAPI)');
  }

  // Has name and description?
  const hasName = allItems.some(i => typeof i['name'] === 'string');
  const hasDescription = allItems.some(i => typeof i['description'] === 'string');
  if (hasName && hasDescription) {
    subs.push({ name: 'Name & description', points: 15, maxPoints: 15, detail: 'both present' });
  } else {
    const missing = [];
    if (!hasName) missing.push('name');
    if (!hasDescription) missing.push('description');
    subs.push({ name: 'Name & description', points: hasName || hasDescription ? 8 : 0, maxPoints: 15, detail: `missing: ${missing.join(', ')}` });
    recs.push('Add name and description to your JSON-LD');
  }

  // Has offers/pricing?
  const hasOffers = allItems.some(i =>
    i['offers'] !== undefined || i['priceSpecification'] !== undefined || i['price'] !== undefined
  );
  if (hasOffers) {
    subs.push({ name: 'Offers/pricing', points: 15, maxPoints: 15, detail: 'pricing data found' });
  } else {
    subs.push({ name: 'Offers/pricing', points: 0, maxPoints: 15, detail: 'no pricing data' });
    recs.push('Add offers/pricing to JSON-LD so agents can evaluate cost');
  }

  // Has provider/author?
  const hasProvider = allItems.some(i =>
    i['provider'] !== undefined || i['author'] !== undefined || i['creator'] !== undefined
  );
  if (hasProvider) {
    subs.push({ name: 'Provider/author', points: 10, maxPoints: 10, detail: 'provider identified' });
  } else {
    subs.push({ name: 'Provider/author', points: 0, maxPoints: 10, detail: 'no provider/author' });
    recs.push('Add provider or author to your JSON-LD');
  }

  // Has featureList or potentialAction?
  const hasFeatures = allItems.some(i =>
    i['featureList'] !== undefined || i['potentialAction'] !== undefined || i['actionableFeedbackPolicy'] !== undefined
  );
  if (hasFeatures) {
    subs.push({ name: 'Features/actions', points: 20, maxPoints: 20, detail: 'featureList or potentialAction found' });
  } else {
    subs.push({ name: 'Features/actions', points: 0, maxPoints: 20, detail: 'no featureList or potentialAction' });
    recs.push('Add featureList or potentialAction to JSON-LD for agent understanding');
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'structured-data',
    category: 'discovery',
    label: 'Structured data',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
