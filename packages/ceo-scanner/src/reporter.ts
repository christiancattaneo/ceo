import chalk from 'chalk';
import type { CategoryResult, ScanResult } from './types.js';

function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 50) return chalk.yellow;
  return chalk.red;
}

const CATEGORY_LABELS: Record<string, string> = {
  discovery: 'DISCOVERY',
  integration: 'INTEGRATION',
  transaction: 'TRANSACTION',
};

export function formatReport(result: ScanResult): string {
  const lines: string[] = [];
  const colorFn = scoreColor(result.score);

  lines.push('');
  lines.push(
    `${colorFn(`CEO Score: ${result.score}/100`)} ${chalk.dim(`(${result.grade})`)} for ${chalk.cyan(result.url)}`
  );
  lines.push('');

  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const cat = result.categories[key as keyof typeof result.categories] as CategoryResult;
    if (cat.checks.length === 0) continue;

    lines.push(`  ${chalk.bold(label)} (${cat.score}/${cat.maxScore})`);

    const maxLabelLen = Math.max(...cat.checks.map(c => c.label.length));

    for (const check of cat.checks) {
      const icon = check.score >= 50
        ? chalk.green('[ok]')
        : chalk.red('[--]');
      const padded = check.label.padEnd(maxLabelLen);
      const scorePart = `${check.score}/100`;

      const detail = buildDetailSummary(check.subScores.map(s => s.detail));

      lines.push(
        `    ${icon} ${chalk.bold(padded)}  ${scoreColor(check.score)(scorePart)} ${chalk.dim('--')} ${chalk.dim(detail)}`
      );
    }

    lines.push('');
  }

  if (result.recommendations.length > 0) {
    lines.push(`  ${chalk.yellow('Recommendations:')}`);
    for (const rec of result.recommendations) {
      lines.push(`    ${chalk.dim('*')} ${rec}`);
    }
    lines.push('');
  }

  lines.push(chalk.dim(`  Scanned in ${result.scanDurationMs}ms`));
  lines.push('');

  return lines.join('\n');
}

function buildDetailSummary(details: string[]): string {
  const meaningful = details.filter(d => d && d !== 'not found' && d !== 'could not measure');
  if (meaningful.length === 0) return details[0] ?? '';
  return meaningful.slice(0, 2).join(', ');
}

export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatHtml(result: ScanResult): string {
  const scoreClass = result.score >= 80 ? 'good' : result.score >= 50 ? 'ok' : 'bad';

  const categorySections = (['discovery', 'integration', 'transaction'] as const).map(key => {
    const cat = result.categories[key];
    if (cat.checks.length === 0) return '';

    const checkRows = cat.checks.map(check => {
      const icon = check.score >= 50 ? '[ok]' : '[--]';
      const iconClass = check.score >= 50 ? 'pass' : 'fail';
      const subDetails = check.subScores.map(s =>
        `<div class="sub"><span class="sub-name">${esc(s.name)}</span> <span class="sub-score">${s.points}/${s.maxPoints}</span> <span class="sub-detail">${esc(s.detail)}</span></div>`
      ).join('\n');

      return `
        <div class="check">
          <div class="check-header">
            <span class="icon ${iconClass}">${icon}</span>
            <span class="check-label">${esc(check.label)}</span>
            <span class="check-score score-${check.score >= 80 ? 'good' : check.score >= 50 ? 'ok' : 'bad'}">${check.score}/100</span>
          </div>
          <div class="sub-scores">${subDetails}</div>
        </div>`;
    }).join('\n');

    return `
      <div class="category">
        <h2>${CATEGORY_LABELS[key]} <span class="cat-score">(${cat.score}/${cat.maxScore})</span></h2>
        ${checkRows}
      </div>`;
  }).join('\n');

  const recsHtml = result.recommendations.length > 0
    ? `<div class="recommendations">
        <h2>Recommendations</h2>
        <ul>${result.recommendations.map(r => `<li>${esc(r)}</li>`).join('\n')}</ul>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CEO Score: ${result.score}/100 (${result.grade}) - ${esc(result.url)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0a0a0a; color: #e0e0e0; padding: 2rem; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 0.8rem; border-bottom: 1px solid #222; padding-bottom: 0.4rem; }
  .header { margin-bottom: 2rem; }
  .score-big { font-size: 2.5rem; font-weight: bold; }
  .score-big.good { color: #4ade80; }
  .score-big.ok { color: #fbbf24; }
  .score-big.bad { color: #f87171; }
  .grade { font-size: 1.2rem; color: #888; margin-left: 0.5rem; }
  .url { color: #67e8f9; font-size: 0.9rem; }
  .category { margin-bottom: 1.5rem; }
  .cat-score { color: #888; font-weight: normal; font-size: 0.85rem; }
  .check { margin-bottom: 1rem; padding: 0.6rem 0.8rem; background: #141414; border-radius: 4px; border-left: 3px solid #333; }
  .check-header { display: flex; align-items: center; gap: 0.6rem; }
  .icon { font-weight: bold; font-size: 0.85rem; }
  .icon.pass { color: #4ade80; }
  .icon.fail { color: #f87171; }
  .check-label { font-weight: 600; flex: 1; }
  .check-score { font-weight: bold; font-size: 0.9rem; }
  .score-good { color: #4ade80; }
  .score-ok { color: #fbbf24; }
  .score-bad { color: #f87171; }
  .sub-scores { margin-top: 0.4rem; padding-left: 2.4rem; }
  .sub { font-size: 0.8rem; color: #888; line-height: 1.6; }
  .sub-name { color: #aaa; }
  .sub-score { color: #67e8f9; }
  .sub-detail { color: #666; }
  .recommendations { margin-top: 1.5rem; }
  .recommendations ul { list-style: none; padding-left: 1rem; }
  .recommendations li { padding: 0.3rem 0; color: #fbbf24; }
  .recommendations li::before { content: "* "; color: #666; }
  .footer { margin-top: 2rem; font-size: 0.75rem; color: #555; }
</style>
</head>
<body>
  <div class="header">
    <div><span class="score-big ${scoreClass}">${result.score}/100</span><span class="grade">(${result.grade})</span></div>
    <div class="url">${esc(result.url)}</div>
  </div>
  ${categorySections}
  ${recsHtml}
  <div class="footer">Scanned in ${result.scanDurationMs}ms | ${result.timestamp} | ceo-scanner</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
