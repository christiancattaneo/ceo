import type { CheckResult, ScanContext, SubScore } from '../types.js';

const UA = 'ceo-scanner/1.0.0';

export async function checkPayment(baseUrl: string, context: ScanContext): Promise<CheckResult> {
  const subs: SubScore[] = [];
  const recs: string[] = [];

  const html = context.homepageHtml ?? '';

  // Stripe integration?
  const hasStripe = html.includes('stripe.com') || html.includes('Stripe') ||
    html.includes('stripe-') || html.includes('data-stripe');
  if (hasStripe) {
    subs.push({ name: 'Stripe detected', points: 25, maxPoints: 25, detail: 'Stripe integration found' });
  } else {
    subs.push({ name: 'Stripe detected', points: 0, maxPoints: 25, detail: 'no Stripe integration' });
  }

  // Has pricing page?
  const pricingPaths = ['/pricing', '/plans', '/pro'];
  let pricingFound = false;
  for (const path of pricingPaths) {
    try {
      const res = await fetch(new URL(path, baseUrl).href, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': UA },
        redirect: 'follow',
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('text/html')) {
          pricingFound = true;
          subs.push({ name: 'Pricing page', points: 25, maxPoints: 25, detail: `found at ${path}` });
          break;
        }
      }
    } catch {
      // continue
    }
  }
  if (!pricingFound) {
    // Also check if homepage links to pricing
    const hasPricingLink = /href=["'][^"']*pric/i.test(html);
    if (hasPricingLink) {
      subs.push({ name: 'Pricing page', points: 15, maxPoints: 25, detail: 'pricing link in homepage' });
    } else {
      subs.push({ name: 'Pricing page', points: 0, maxPoints: 25, detail: 'no pricing page found' });
      recs.push('Add a /pricing page so agents can evaluate cost');
    }
  }

  // Mentions API pricing?
  const pricingPattern = /\b(per\s+(request|token|call|query|month|api\s+call)|\$\d|USD|free\s+tier|rate\s+limit|quota)\b/i;
  // Check homepage and llms.txt content
  const mentionsPricing = pricingPattern.test(html);
  if (mentionsPricing) {
    subs.push({ name: 'API pricing mentioned', points: 25, maxPoints: 25, detail: 'pricing terms found in content' });
  } else {
    subs.push({ name: 'API pricing mentioned', points: 0, maxPoints: 25, detail: 'no API pricing language found' });
    recs.push('Mention API pricing (per request, free tier, etc.) so agents can budget');
  }

  // Payment-related structured data?
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const ldMatches = [...html.matchAll(jsonLdRegex)];
  let hasPaymentData = false;
  for (const match of ldMatches) {
    const content = match[1];
    if (/offers|priceSpecification|price|priceCurrency/i.test(content)) {
      hasPaymentData = true;
      break;
    }
  }
  if (hasPaymentData) {
    subs.push({ name: 'Structured pricing data', points: 25, maxPoints: 25, detail: 'offers/pricing in JSON-LD' });
  } else {
    subs.push({ name: 'Structured pricing data', points: 0, maxPoints: 25, detail: 'no structured pricing data' });
    recs.push('Add structured pricing data (Schema.org Offer) to your JSON-LD');
  }

  return buildResult(subs, recs);
}

function buildResult(subs: SubScore[], recs: string[]): CheckResult {
  const total = subs.reduce((s, sub) => s + sub.points, 0);
  const max = subs.reduce((s, sub) => s + sub.maxPoints, 0);
  const score = max > 0 ? Math.round((total / max) * 100) : 0;

  return {
    name: 'payment',
    category: 'transaction',
    label: 'Payment ready',
    score,
    maxScore: 100,
    weight: 10,
    subScores: subs,
    recommendations: recs,
  };
}
