import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

export async function checkMcp(baseUrl: string, context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  let data: Record<string, unknown> | null = null;
  let foundAt = '';

  // Check /.well-known/mcp.json
  try {
    const res = await fetch(new URL('/.well-known/mcp.json', baseUrl).href, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': UA },
    });
    if (res.ok) {
      data = await res.json() as Record<string, unknown>;
      foundAt = '/.well-known/mcp.json';
    }
  } catch {
    // fall through
  }

  // Exists?
  if (data) {
    subs.push({ name: 'Exists', points: 20, maxPoints: 20, detail: `found at ${foundAt}` });
  } else {
    subs.push({ name: 'Exists', points: 0, maxPoints: 20, detail: 'not found at /.well-known/mcp.json' });
    recs.push('Add /.well-known/mcp.json to advertise your MCP server');
    // Still check for link tag
    checkHtmlLink(context.homepageHtml, subs, recs);
    return buildResult(subs, recs);
  }

  // Valid JSON with required fields? (name, tools or resources)
  const hasName = typeof data['name'] === 'string' && (data['name'] as string).length > 0;
  const hasTools = Array.isArray(data['tools']);
  const hasResources = Array.isArray(data['resources']);
  if (hasName && (hasTools || hasResources)) {
    subs.push({ name: 'Valid structure', points: 15, maxPoints: 15, detail: 'has name and tools/resources' });
  } else {
    const missing = [];
    if (!hasName) missing.push('name');
    if (!hasTools && !hasResources) missing.push('tools or resources');
    subs.push({ name: 'Valid structure', points: hasName ? 8 : 0, maxPoints: 15, detail: `missing: ${missing.join(', ')}` });
    recs.push('Add name and tools/resources arrays to mcp.json');
  }

  // Has tool descriptions?
  const tools = (hasTools ? data['tools'] : []) as Record<string, unknown>[];
  const toolsWithDesc = tools.filter(t => typeof t['description'] === 'string' && (t['description'] as string).length > 0);
  if (tools.length > 0 && toolsWithDesc.length === tools.length) {
    subs.push({ name: 'Tool descriptions', points: 15, maxPoints: 15, detail: `${tools.length} tool(s), all described` });
  } else if (toolsWithDesc.length > 0) {
    subs.push({ name: 'Tool descriptions', points: 8, maxPoints: 15, detail: `${toolsWithDesc.length}/${tools.length} tools described` });
    recs.push(`Add descriptions to all MCP tools (${tools.length - toolsWithDesc.length} missing)`);
  } else {
    subs.push({ name: 'Tool descriptions', points: 0, maxPoints: 15, detail: 'no tool descriptions' });
    recs.push('Add descriptions to your MCP tools');
  }

  // Tool descriptions are descriptive (>20 chars)?
  const descriptive = toolsWithDesc.filter(t => (t['description'] as string).length > 20);
  if (toolsWithDesc.length > 0 && descriptive.length === toolsWithDesc.length) {
    subs.push({ name: 'Descriptive tools', points: 15, maxPoints: 15, detail: 'all descriptions >20 chars' });
  } else if (descriptive.length > 0) {
    subs.push({ name: 'Descriptive tools', points: 8, maxPoints: 15, detail: `${descriptive.length}/${toolsWithDesc.length} are descriptive` });
    recs.push('Make MCP tool descriptions more detailed (aim for >20 characters each)');
  } else {
    subs.push({ name: 'Descriptive tools', points: 0, maxPoints: 15, detail: 'descriptions too short or missing' });
    if (tools.length > 0) recs.push('Write detailed MCP tool descriptions (>20 characters each)');
  }

  // Has authentication info?
  const hasAuth = data['authentication'] !== undefined || data['auth'] !== undefined;
  if (hasAuth) {
    subs.push({ name: 'Authentication info', points: 10, maxPoints: 10, detail: 'authentication documented' });
  } else {
    subs.push({ name: 'Authentication info', points: 0, maxPoints: 10, detail: 'no authentication info' });
    recs.push('Document authentication requirements in mcp.json');
  }

  // <link rel="mcp"> in HTML?
  checkHtmlLink(context.homepageHtml, subs, recs);

  // Specifies transport?
  const hasTransport = typeof data['transport'] === 'string' || typeof data['transportType'] === 'string';
  if (hasTransport) {
    const transport = (data['transport'] ?? data['transportType']) as string;
    subs.push({ name: 'Transport specified', points: 15, maxPoints: 15, detail: transport });
  } else {
    subs.push({ name: 'Transport specified', points: 0, maxPoints: 15, detail: 'no transport type specified' });
    recs.push('Specify transport type (stdio/sse/streamable-http) in mcp.json');
  }

  return buildResult(subs, recs);
}

function checkHtmlLink(html: string | undefined, subs: SubScore[], recs: string[]): void {
  if (html) {
    const mcpLink = html.match(/<link[^>]*rel=["']mcp["'][^>]*>/i);
    if (mcpLink) {
      subs.push({ name: 'HTML link tag', points: 10, maxPoints: 10, detail: '<link rel="mcp"> found' });
      return;
    }
  }
  subs.push({ name: 'HTML link tag', points: 0, maxPoints: 10, detail: 'no <link rel="mcp"> in HTML' });
  recs.push('Add <link rel="mcp" href="..."> to your homepage HTML');
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'mcp',
    category: 'integration',
    label: 'MCP endpoint',
    score,
    maxScore: 100,
    weight: 15,
    subScores: subs,
    recommendations: recs,
  };
}
