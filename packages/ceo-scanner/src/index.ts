#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { Command } from 'commander';
import chalk from 'chalk';
import { scan } from './scanner.js';
import { formatReport, formatJson, formatHtml } from './reporter.js';

const program = new Command();

program
  .name('ceo-scanner')
  .description('Scan any URL for CEO (Claw Engine Optimization) readiness')
  .version('1.0.0')
  .argument('<url>', 'URL to scan (e.g. https://example.com)')
  .option('--json', 'Output results as JSON')
  .option('--html [file]', 'Generate HTML report (default: ceo-report.html)')
  .option('--no-color', 'Disable colored output')
  .action(async (url: string, options: { json?: boolean; html?: boolean | string }) => {
    try {
      console.log(chalk.dim(`\nScanning ${url}...\n`));

      const result = await scan(url);

      if (options.json) {
        console.log(formatJson(result));
      } else if (options.html !== undefined && options.html !== false) {
        const filename = typeof options.html === 'string' ? options.html : 'ceo-report.html';
        writeFileSync(filename, formatHtml(result), 'utf-8');
        console.log(`HTML report written to ${filename}`);
        console.log(formatReport(result));
      } else {
        console.log(formatReport(result));
      }

      process.exit(result.score < 50 ? 1 : 0);
    } catch (err) {
      console.error(
        chalk.red(`\nError scanning ${url}: ${err instanceof Error ? err.message : 'unknown error'}\n`)
      );
      process.exit(2);
    }
  });

program.parse();
