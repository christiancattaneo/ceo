#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { scan } from './scanner.js';
import { formatReport } from './reporter.js';

const program = new Command();

program
  .name('ceo-scanner')
  .description('Scan any website for CEO (Claw Engine Optimization) readiness')
  .version('1.0.0')
  .argument('<url>', 'URL to scan (e.g. https://example.com)')
  .option('--json', 'Output results as JSON')
  .option('--no-color', 'Disable colored output')
  .action(async (url: string, options: { json?: boolean }) => {
    try {
      console.log(chalk.dim(`\nScanning ${url}...\n`));

      const result = await scan(url);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatReport(result));
      }

      // Exit with non-zero if score is below 50
      process.exit(result.score < 50 ? 1 : 0);
    } catch (err) {
      console.error(
        chalk.red(`\nError scanning ${url}: ${err instanceof Error ? err.message : 'unknown error'}\n`)
      );
      process.exit(2);
    }
  });

program.parse();
