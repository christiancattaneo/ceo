import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

export async function checkLlmsTxt(baseUrl: string, _context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  let text: string | null = null;
  let fullText: string | null = null;

  // Fetch llms.txt
  try {
    const res = await fetch(new URL('/llms.txt', baseUrl).href, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': UA },
    });
    if (res.ok) {
      text = await res.text();
    }
  } catch {
    // network error
  }

  // Exists?
  if (text !== null) {
    subs.push({ name: 'Exists', points: 20, maxPoints: 20, detail: 'found at /llms.txt' });
  } else {
    subs.push({ name: 'Exists', points: 0, maxPoints: 20, detail: 'not found' });
    recs.push('Add /llms.txt to describe your product for LLM consumption');
    return buildResult(subs, recs);
  }

  // Has title? (first line starting with #)
  const lines = text.split('\n');
  const titleLine = lines.find(l => l.trim().startsWith('#'));
  if (titleLine && titleLine.replace(/^#+\s*/, '').trim().length > 0) {
    subs.push({ name: 'Has title', points: 10, maxPoints: 10, detail: titleLine.trim() });
  } else {
    subs.push({ name: 'Has title', points: 0, maxPoints: 10, detail: 'no title found' });
    recs.push('Add a # Title as the first line of llms.txt');
  }

  // Describes capabilities/actions?
  const capKeywords = /\b(capabilities?|actions?|tools?|endpoints?|can\s|provides?\s|supports?\s|features?)\b/i;
  if (capKeywords.test(text)) {
    subs.push({ name: 'Describes capabilities', points: 20, maxPoints: 20, detail: 'capabilities/actions described' });
  } else {
    subs.push({ name: 'Describes capabilities', points: 0, maxPoints: 20, detail: 'no capabilities described' });
    recs.push('Describe what your product can do (capabilities, tools, actions) in llms.txt');
  }

  // Includes pricing info?
  const pricingKeywords = /\b(pric(e|ing|es)|cost|free|per\s+(request|token|call|month)|\$\d|USD|EUR)\b/i;
  if (pricingKeywords.test(text)) {
    subs.push({ name: 'Pricing info', points: 10, maxPoints: 10, detail: 'pricing information found' });
  } else {
    subs.push({ name: 'Pricing info', points: 0, maxPoints: 10, detail: 'no pricing info' });
    recs.push('Add pricing information to llms.txt so agents can evaluate cost');
  }

  // Links to API docs?
  const apiDocPattern = /\b(api|docs?|documentation|reference|swagger|openapi)\b/i;
  const urlPattern = /https?:\/\/\S+/;
  if (apiDocPattern.test(text) && urlPattern.test(text)) {
    subs.push({ name: 'API doc links', points: 10, maxPoints: 10, detail: 'links to API docs' });
  } else {
    subs.push({ name: 'API doc links', points: 0, maxPoints: 10, detail: 'no API doc links' });
    recs.push('Link to your API documentation from llms.txt');
  }

  // llms-full.txt?
  try {
    const fullRes = await fetch(new URL('/llms-full.txt', baseUrl).href, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': UA },
    });
    if (fullRes.ok) {
      fullText = await fullRes.text();
      subs.push({ name: 'llms-full.txt', points: 10, maxPoints: 10, detail: 'found' });
    } else {
      subs.push({ name: 'llms-full.txt', points: 0, maxPoints: 10, detail: 'not found' });
      recs.push('Add /llms-full.txt with comprehensive product details');
    }
  } catch {
    subs.push({ name: 'llms-full.txt', points: 0, maxPoints: 10, detail: 'not found' });
    recs.push('Add /llms-full.txt with comprehensive product details');
  }

  // Under 10KB?
  const sizeBytes = new TextEncoder().encode(text).length;
  const fullSizeBytes = fullText ? new TextEncoder().encode(fullText).length : 0;
  const totalSize = sizeBytes + fullSizeBytes;
  if (sizeBytes <= 10240) {
    subs.push({ name: 'Size (agent-friendly)', points: 10, maxPoints: 10, detail: `${(sizeBytes / 1024).toFixed(1)}KB` });
  } else {
    subs.push({ name: 'Size (agent-friendly)', points: 0, maxPoints: 10, detail: `${(sizeBytes / 1024).toFixed(1)}KB (over 10KB)` });
    recs.push('Keep llms.txt under 10KB for agent-friendly consumption; use llms-full.txt for details');
  }

  // Standard format? (# Title, > description, ## sections)
  const hasTitle = /^#\s+.+/m.test(text);
  const hasBlockquote = /^>\s+.+/m.test(text);
  const hasSections = /^##\s+.+/m.test(text);
  const formatParts = [hasTitle, hasBlockquote, hasSections].filter(Boolean).length;
  if (formatParts >= 2) {
    subs.push({ name: 'Standard format', points: 10, maxPoints: 10, detail: 'follows # Title, > description, ## sections format' });
  } else if (formatParts === 1) {
    subs.push({ name: 'Standard format', points: 5, maxPoints: 10, detail: 'partially follows standard format' });
  } else {
    subs.push({ name: 'Standard format', points: 0, maxPoints: 10, detail: 'does not follow standard format' });
    recs.push('Use standard llms.txt format: # Title, > description, ## Sections');
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'llms-txt',
    category: 'discovery',
    label: 'llms.txt',
    score,
    maxScore: 100,
    weight: 15,
    subScores: subs,
    recommendations: recs,
  };
}
