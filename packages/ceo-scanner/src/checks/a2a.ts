import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

export async function checkA2a(baseUrl: string, _context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  let data: Record<string, unknown> | null = null;

  try {
    const res = await fetch(new URL('/.well-known/agent.json', baseUrl).href, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': UA },
    });
    if (res.ok) {
      data = await res.json() as Record<string, unknown>;
    }
  } catch {
    // network error
  }

  // Exists?
  if (data) {
    subs.push({ name: 'Exists', points: 25, maxPoints: 25, detail: 'found at /.well-known/agent.json' });
  } else {
    subs.push({ name: 'Exists', points: 0, maxPoints: 25, detail: 'not found' });
    recs.push('Add /.well-known/agent.json for A2A (Agent-to-Agent) discoverability');
    return buildResult(subs, recs);
  }

  // Has name and description?
  const hasName = typeof data['name'] === 'string' && (data['name'] as string).length > 0;
  const hasDesc = typeof data['description'] === 'string' && (data['description'] as string).length > 0;
  if (hasName && hasDesc) {
    subs.push({ name: 'Name & description', points: 15, maxPoints: 15, detail: `"${data['name']}"` });
  } else {
    const missing = [];
    if (!hasName) missing.push('name');
    if (!hasDesc) missing.push('description');
    subs.push({ name: 'Name & description', points: hasName || hasDesc ? 8 : 0, maxPoints: 15, detail: `missing: ${missing.join(', ')}` });
    recs.push('Add name and description to agent.json');
  }

  // Has capabilities array?
  const caps = data['capabilities'];
  const hasCaps = Array.isArray(caps) && caps.length > 0;
  if (hasCaps) {
    subs.push({ name: 'Capabilities', points: 20, maxPoints: 20, detail: `${(caps as unknown[]).length} capability(ies)` });
  } else {
    subs.push({ name: 'Capabilities', points: 0, maxPoints: 20, detail: 'no capabilities defined' });
    recs.push('Add capabilities array to agent.json describing what your agent can do');
  }

  // Has authentication schemes?
  const auth = data['authentication'] ?? data['auth'] ?? data['securitySchemes'];
  const hasAuth = auth !== undefined && auth !== null;
  if (hasAuth) {
    subs.push({ name: 'Authentication', points: 15, maxPoints: 15, detail: 'authentication schemes defined' });
  } else {
    subs.push({ name: 'Authentication', points: 0, maxPoints: 15, detail: 'no authentication info' });
    recs.push('Document authentication schemes in agent.json');
  }

  // Has endpoint URL?
  const endpoint = data['endpoint'] ?? data['url'] ?? data['service_url'] ?? data['serviceUrl'];
  const hasEndpoint = typeof endpoint === 'string' && (endpoint as string).length > 0;
  if (hasEndpoint) {
    subs.push({ name: 'Endpoint URL', points: 15, maxPoints: 15, detail: endpoint as string });
  } else {
    subs.push({ name: 'Endpoint URL', points: 0, maxPoints: 15, detail: 'no endpoint URL' });
    recs.push('Add an endpoint URL to agent.json so agents know where to connect');
  }

  // Valid against A2A spec? (basic structural check)
  const specFields = ['name', 'description', 'capabilities', 'endpoint'].filter(f => data![f] !== undefined);
  if (specFields.length >= 3) {
    subs.push({ name: 'Spec conformance', points: 10, maxPoints: 10, detail: `${specFields.length}/4 spec fields present` });
  } else if (specFields.length >= 1) {
    subs.push({ name: 'Spec conformance', points: 5, maxPoints: 10, detail: `${specFields.length}/4 spec fields present` });
  } else {
    subs.push({ name: 'Spec conformance', points: 0, maxPoints: 10, detail: 'minimal spec conformance' });
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'a2a',
    category: 'integration',
    label: 'A2A endpoint',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
