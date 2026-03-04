import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

export async function checkRegistry(baseUrl: string, _context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const domain = new URL(baseUrl).hostname.replace(/^www\./, '');
  const name = domain.split('.')[0];

  // ClawHub
  const clawhub = await checkUrl(`https://clawhub.ai/skills/${name}`, 'ClawHub');
  if (clawhub) {
    subs.push({ name: 'ClawHub', points: 25, maxPoints: 25, detail: 'listed on ClawHub' });
  } else {
    subs.push({ name: 'ClawHub', points: 0, maxPoints: 25, detail: 'not found on ClawHub' });
    recs.push('List on ClawHub -- run: clawhub publish');
  }

  // Smithery
  const smithery = await checkUrl(`https://smithery.ai/search?q=${encodeURIComponent(domain)}`, 'Smithery');
  if (smithery) {
    subs.push({ name: 'Smithery', points: 25, maxPoints: 25, detail: 'found on Smithery' });
  } else {
    subs.push({ name: 'Smithery', points: 0, maxPoints: 25, detail: 'not found on Smithery' });
    recs.push('List your MCP server on Smithery (smithery.ai)');
  }

  // npm MCP package
  const npm = await checkNpm(domain);
  if (npm) {
    subs.push({ name: 'npm MCP package', points: 25, maxPoints: 25, detail: npm });
  } else {
    subs.push({ name: 'npm MCP package', points: 0, maxPoints: 25, detail: 'no MCP package found on npm' });
    recs.push('Publish an MCP package to npm for easy agent installation');
  }

  // Bonus: any other registry presence (placeholder for future)
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  if (total === 0) {
    subs.push({ name: 'Any registry', points: 0, maxPoints: 25, detail: 'not listed on any agent registry' });
  } else {
    const count = subs.filter(s => s.points > 0).length;
    subs.push({ name: 'Any registry', points: 25, maxPoints: 25, detail: `found on ${count} registry(ies)` });
  }

  return buildResult(subs, recs);
}

async function checkUrl(url: string, _label: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    // For search pages, a 200 doesn't mean "found" -- we'd need to parse.
    // For direct skill pages, 200 means exists. Accept 200 for now.
    return res.ok;
  } catch {
    return false;
  }
}

async function checkNpm(domain: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=mcp+${encodeURIComponent(domain)}&size=3`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': UA },
      }
    );
    if (!res.ok) return null;

    const data = await res.json() as { objects?: Array<{ package: { name: string; description?: string } }> };
    if (data.objects && data.objects.length > 0) {
      // Check if any result actually relates to the domain
      const relevant = data.objects.find(o =>
        o.package.name.toLowerCase().includes(domain.split('.')[0].toLowerCase()) ||
        (o.package.description ?? '').toLowerCase().includes(domain.split('.')[0].toLowerCase())
      );
      if (relevant) {
        return `npm: ${relevant.package.name}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'registry',
    category: 'discovery',
    label: 'Registry',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
