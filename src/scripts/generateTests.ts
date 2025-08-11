import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { parseHarFile } from '../utils/harParser';
import { generateTestPlan } from '../services/openaiService';
import chalk from 'chalk';
import type { TestPlan } from '../types';

async function main() {
  try {
    // Read HAR file from command line argument
    const harPath = process.argv[2];
    if (!harPath) {
      console.error(chalk.red('Error: Please provide a path to the HAR file'));
      console.log(chalk.yellow('Usage: npm run generate ./path/to/your/file.har'));
      process.exit(1);
    }

    // Check if file exists
    if (!existsSync(harPath)) {
      console.error(chalk.red(`Error: File not found: ${harPath}`));
      process.exit(1);
    }

    // Validate file extension
    if (!harPath.toLowerCase().endsWith('.har')) {
      console.error(chalk.red('Error: File must have .har extension'));
      process.exit(1);
    }

    console.log(chalk.blue('Reading HAR file...'));
    const harContent = readFileSync(resolve(harPath), 'utf-8');

    try {
      const harEntries = parseHarFile(harContent);
      console.log(chalk.green(`✓ Successfully parsed ${harEntries.length} API requests`));

      console.log(chalk.blue('Generating test plan...'));
      const testPlan = await generateTestPlan(harEntries, 'code');

      // Create tests directory if it doesn't exist
      const testsDir = resolve('tests');
      if (!existsSync(testsDir)) {
        mkdirSync(testsDir, { recursive: true });
      }

      // Generate Playwright test files
      console.log(chalk.blue('Generating Playwright tests...'));
      const testContent = generatePlaywrightTests(testPlan);
      
      const outputPath = resolve('tests/generated.spec.ts');
      writeFileSync(outputPath, testContent, 'utf-8');

      console.log(chalk.green('✓ Test generation completed successfully!'));
      console.log(chalk.yellow('Generated files:'));
      console.log(`  - ${outputPath}`);
    } catch (error) {
      console.error(chalk.red('Error generating tests:'));
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Error:'));
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

  // Log for debugging
  console.log('DEBUG: testCase.title =', testCase.title);
  console.log('DEBUG: testCase.apiDetails =', JSON.stringify(api, null, 2));

  if (!api || !api.method || !api.endpoint) {
    console.warn(`⚠️ Skipping test case "${testCase.title}" due to missing method or endpoint.`);
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