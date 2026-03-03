import chalk from 'chalk';
import type { ScanResult } from './types.js';

function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 50) return chalk.yellow;
  return chalk.red;
}

function gradeLabel(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

export function formatReport(result: ScanResult): string {
  const lines: string[] = [];
  const colorFn = scoreColor(result.score);
  const grade = gradeLabel(result.score);

  // Header
  lines.push('');
  lines.push(
    `${colorFn(`CEO Score: ${result.score}/100`)} ${chalk.dim(`(${grade})`)} for ${chalk.cyan(result.url)}`
  );
  lines.push('');

  // Check results
  const maxLabelLen = Math.max(...result.checks.map(c => c.label.length));

  for (const check of result.checks) {
    const icon = check.passed ? chalk.green('✅') : chalk.red('❌');
    const label = check.label.padEnd(maxLabelLen);
    const detail = check.passed
      ? chalk.white(check.detail)
      : chalk.dim(check.detail);

    lines.push(`  ${icon} ${chalk.bold(label)}  ${detail}`);
  }

  // Recommendations
  const recommendations = result.checks
    .filter(c => !c.passed && c.recommendation)
    .map(c => c.recommendation!);

  if (recommendations.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Recommendations:'));
    for (const rec of recommendations) {
      lines.push(`  ${chalk.dim('•')} ${rec}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
