import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { parseHarFile } from '../utils/harParser';
import { generateTestPlan } from '../services/openaiService';
import chalk from 'chalk';
import type { TestPlan } from '../types';

async function main() {
  try {
    // Read HAR file from command line argument
    const harPath = process.argv[2];
    if (!harPath) {
      process.stdout.write(chalk.yellow('Usage: npm run generate ./path/to/your/file.har') + '\n');
      process.exit(1);
    }

    // Check if file exists
    if (!existsSync(harPath)) {
      process.stderr.write(chalk.red(`Error: File not found: ${harPath}`) + '\n');
      process.exit(1);
    }

    // Validate file extension
    if (!harPath.toLowerCase().endsWith('.har')) {
      process.stderr.write(chalk.red('Error: File must have .har extension') + '\n');
      process.exit(1);
    }

    process.stdout.write(chalk.blue('Reading HAR file...') + '\n');
    const harContent = readFileSync(resolve(harPath), 'utf-8');

    try {
      const harEntries = parseHarFile(harContent);
      process.stdout.write(chalk.green(`✓ Successfully parsed ${harEntries.length} API requests`) + '\n');

      process.stdout.write(chalk.blue('Generating test plan...') + '\n');
      const testPlan = await generateTestPlan(harEntries, 'code');

      // Create tests directory if it doesn't exist
      const testsDir = resolve('tests');
      if (!existsSync(testsDir)) {
        mkdirSync(testsDir, { recursive: true });
      }

      // Generate Playwright test files
      process.stdout.write(chalk.blue('Generating Playwright tests...') + '\n');
      const testContent = generatePlaywrightTests(testPlan);
      
      const outputPath = resolve('tests/generated.spec.ts');
      writeFileSync(outputPath, testContent, 'utf-8');

      process.stdout.write(chalk.green('✓ Test generation completed successfully!') + '\n');
      process.stdout.write(chalk.yellow('Generated files:') + '\n');
      process.stdout.write(`  - ${outputPath}\n`);
    } catch (error) {
      process.stderr.write(chalk.red('Error generating tests:') + '\n');
      process.exit(1);
    }
  } catch (error) {
    process.stderr.write(chalk.red('Error:') + '\n');
    process.exit(1);
  }
}

function generatePlaywrightTests(testPlan: TestPlan): string {
  return `import { test, expect } from '@playwright/test';

/**
 * Test Plan: ${testPlan.title}
 * ${testPlan.description}
 */

${testPlan.stories.map(story => `
/**
 * Story: ${story.title}
 * ${story.description}
 */
${story.testCases.map(testCase => {
  const api = testCase.apiDetails;

  if (!api || !api.method || !api.endpoint) {
    return '';
  }

  const method = typeof api.method === 'string' ? api.method.toLowerCase() : 'get';
  const endpoint = api.endpoint || '/missing-endpoint';
  const headers = JSON.stringify(api.headers || {}, null, 2);
  const body = api.body ? JSON.stringify(api.body, null, 2) : 'undefined';
  const expectedStatus = api.expectedStatus ?? 200;

  return `
test('${testCase.title}', async ({ request }) => {
  // ${testCase.description}
  const response = await request.${method}('${endpoint}', {
    headers: ${headers},
    data: ${body}
  });

  expect(response.status()).toBe(${expectedStatus});
});`;
}).join('\n')}
`).join('\n')}`;
}



main();