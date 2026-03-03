import type { CheckResult } from '../types.js';

export async function checkMcp(baseUrl: string, homepageHtml?: string): Promise<CheckResult> {
  const wellKnownUrl = new URL('/.well-known/mcp.json', baseUrl).href;

  try {
    // Check /.well-known/mcp.json
    const res = await fetch(wellKnownUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'ceo-scanner/1.0.0' },
    });

    if (res.ok) {
      return {
        name: 'mcp',
        passed: true,
        label: 'MCP endpoint',
        detail: 'found at /.well-known/mcp.json',
        weight: 20,
      };
    }
  } catch {
    // fall through to HTML check
  }

  // Check homepage HTML for <link rel="mcp">
  if (homepageHtml) {
    const mcpLinkMatch = homepageHtml.match(/<link[^>]*rel=["']mcp["'][^>]*>/i);
    if (mcpLinkMatch) {
      const hrefMatch = mcpLinkMatch[0].match(/href=["']([^"']+)["']/i);
      const href = hrefMatch ? hrefMatch[1] : 'unknown';
      return {
        name: 'mcp',
        passed: true,
        label: 'MCP endpoint',
        detail: `found via <link rel="mcp"> → ${href}`,
        weight: 20,
      };
    }
  }

  return {
    name: 'mcp',
    passed: false,
    label: 'MCP endpoint',
    detail: 'not found',
    recommendation: 'Add /.well-known/mcp.json to advertise your MCP server',
    weight: 20,
  };
}
