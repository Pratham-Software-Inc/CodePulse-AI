// Utility to build test connection payload for Azure OpenAI
export function buildTestConnectionPayload(model: string): any {
  const testPrompt = 'Reply with a short greeting for test connection.';
  if (model === 'o3-mini') {
    return {
      model: 'o3-mini',
      messages: [{ role: 'user', content: testPrompt }],
      reasoning_effort: 'low',
      max_completion_tokens: 100
    };
  }
  // Default to gpt-4o
  return {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: testPrompt }],
    max_tokens: 100
  };
}
import { OpenAI } from 'openai';
import type { HarEntry, TestPlan, GenerationType } from '../types';
import { fetchConfig } from './configService';


let openai: OpenAI | null = null;

// Function to chunk array into smaller batches
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Function to merge test plans
const mergeTestPlans = (testPlans: TestPlan[]): TestPlan => {
  if (testPlans.length === 0) return {} as TestPlan;

  const merged: TestPlan = {
    ...testPlans[0],
    stories: [], riskAssessment: [], deliverables: [], successCriteria: [],
    rolesAndResponsibility: [], entryCriteria: [], exitCriteria: [],
    references: [], testItems: [], featuresToBeTested: [],
    featuresNotToBeTested: [], testDataRequirements: [],
    environmentRequirements: testPlans[0].environmentRequirements || {
      hardware: [], software: [], network: ''
    },
    staffingAndTraining: [], testExecutionStrategy: [],
    testSchedule: [], toolsAndAutomationStrategy: [],
    approvalsAndSignoffs: [], passCriteria: [],
    failCriteria: [], suspensionCriteria: [],
    negativeScenarios: [], traceabilityMatrix: {}
  };

  for (const plan of testPlans) {
    merged.stories.push(...(plan.stories || []));
    merged.riskAssessment.push(...(plan.riskAssessment || []));
    merged.deliverables.push(...(plan.deliverables || []));
    merged.successCriteria.push(...(plan.successCriteria || []));
    merged.rolesAndResponsibility.push(...(plan.rolesAndResponsibility || []));
    merged.entryCriteria.push(...(plan.entryCriteria || []));
    merged.exitCriteria.push(...(plan.exitCriteria || []));
    merged.references!.push(...(plan.references || []));
    merged.testItems!.push(...(plan.testItems || []));
    merged.featuresToBeTested!.push(...(plan.featuresToBeTested || []));
    merged.featuresNotToBeTested!.push(...(plan.featuresNotToBeTested || []));
    merged.testDataRequirements!.push(...(plan.testDataRequirements || []));
    if (plan.environmentRequirements) {
      merged.environmentRequirements = plan.environmentRequirements;
    }
    merged.staffingAndTraining!.push(...(plan.staffingAndTraining || []));
    merged.testExecutionStrategy!.push(...(plan.testExecutionStrategy || []));
    merged.testSchedule!.push(...(plan.testSchedule || []));
    merged.toolsAndAutomationStrategy!.push(...(plan.toolsAndAutomationStrategy || []));
    merged.approvalsAndSignoffs!.push(...(plan.approvalsAndSignoffs || []));
    merged.passCriteria!.push(...(plan.passCriteria || []));
    merged.failCriteria!.push(...(plan.failCriteria || []));
    merged.suspensionCriteria!.push(...(plan.suspensionCriteria || []));
    merged.negativeScenarios!.push(...(plan.negativeScenarios || []));

    const matrix: Record<string, string[]> = plan.traceabilityMatrix || {};
    for (const reqId in matrix) {
      const existing = merged.traceabilityMatrix![reqId] || [];
      merged.traceabilityMatrix![reqId] = [...existing, ...matrix[reqId]];
    }
  }
  return merged;
};

const TEST_PLAN_SKELETON = `You MUST respond only with a JSON object matching this exact structure (no markdown or commentary):
{
      "title": "string",
      "description": "string",
      "stories": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "testCases": [
            {
              "id": "string",
              "title": "string",
              "description": "string",
              "steps": ["string"],
              "expectedResult": "string",
              "apiDetails": {
                "method": "string",
                "endpoint": "string",
                "headers": { "string": "string" },
                "body": "string",
                "expectedStatus": 200
              },
              "severity": "High|Medium|Low",
              "priority": 1,
              "reqId": "string"
            }
          ]
        }
      ],
      "riskAssessment": [
        {
          "category": "string",
          "description": "string",
          "mitigation": "string",
          "impact": "Low|Medium|High"
        }
      ],
      "deliverables": [
        {
          "title": "string",
          "description": "string",
          "format": "string",
          "frequency": "string"
        }
      ],
      "successCriteria": [
        {
          "category": "string",
          "criteria": "string",
          "threshold": "string"
        }
      ],
      "rolesAndResponsibility": [
        {
          "role": "string",
          "responsibility": "string"
        }
      ],
      "exitCriteria": [
        {
          "description": "string"
        }
      ],
      "testExecutionStrategy": [
        {
          "description": "string"
        }
      ],
      "entryCriteria": [
        {
          "description": "string"
        }
      ],
      "testSchedule": [
        {
          "description": "string"
        }
      ],
      "toolsAndAutomationStrategy": [
        {
          "description": "string"
        }
      ],
      "approvalsAndSignoffs": [
        {
          "description": "string"
        }
      ],
      "references": [
        {
          "title": "string",
          "url": "string"
        }
      ],
      "testItems": [
        {
          "id": "string",
          "description": "string",
          "endpoint": "string",
          "method": "string"
        }
      ],
      "featuresToBeTested": ["string"],
      "featuresNotToBeTested": ["string"],
      "staffingAndTraining": [
        {
          "role": "string",
          "skills": ["string"]
        }
      ],
      "passCriteria": ["string"],
      "failCriteria": ["string"],
      "suspensionCriteria": ["string"],
      "environmentRequirements": {
        "hardware": ["string"],
        "software": ["string"],
        "network": "string"
      },
      "testDataRequirements": ["string"],
      "traceabilityMatrix": {
        "string": ["string"]
      },
      "negativeScenarios": ["string"]
    }
`;

const TEST_SCENARIO_SKELETON = `You MUST respond only with a JSON array matching this exact structure (no markdown or commentary):
{
  "stories": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "testCases": [
            {
              "id": "string",
              "title": "string",
              "description": "string",
              "steps": ["string"],
              "expectedResult": "string",
              "apiDetails": {
                "method": "string",
                "endpoint": "string",
                "headers": { "string": "string" },
                "body": "string",
                "expectedStatus": 200
              },
              "severity": "High|Medium|Low",
              "priority": 1,
              "reqId": "string"
            }
          ]
        }
      ]
}`;
const TEST_CASES_SKELETON = `You MUST respond only with a JSON array matching this exact structure (no markdown or commentary):
{
"stories": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "testCases": [
            {
              "id": "string",
              "title": "string",
              "description": "string",
              "steps": ["string"],
              "expectedResult": "string",
              "apiDetails": {
                "method": "string",
                "endpoint": "string",
                "headers": { "string": "string" },
                "body": "string",
                "expectedStatus": 200
              },
              "severity": "High|Medium|Low",
              "priority": 1,
              "reqId": "string"
            }
          ]
        }
      ]
}`;
  
// Function to generate the prompt
const generatePrompt = (type: GenerationType, harEntries: HarEntry[]): string => {
  const uniqueEndpoints = Array.from(
    new Set(
      harEntries.map(entry => `${entry.request.method} ${entry.request.url}`)
    )
  );
  const formattedEndpoints = uniqueEndpoints.map(endpoint => `- ${endpoint}`).join("\n");
  const endpointCountNote = `
Generate a comprehensive test suite for the provided unique API endpoints.   
  
Key Instructions:  
1. Treat each endpoint as a UNIQUE combination of METHOD + URL.  
2. Generate test cases independently for each endpoint. DO NOT group or merge endpoints.  
3. Cover **all permutations** of the following:  
   - **Query parameters**: All valid and invalid combinations, edge cases (e.g., boundary values, empty, null).  
   - **Request body**: Valid/invalid key-value pairs, malformed payloads, boundary values.  
   - **Headers**: Valid/invalid headers, missing required headers.  
4. Include:  
   - **Positive test cases**: All valid combinations, including edge cases.  
   - **Negative test cases**: Invalid/missing parameters, wrong types, malformed JSON, boundary violations, invalid HTTP methods, missing/invalid auth, rate-limiting, server errors, etc.  
   - *At least one** negativeScenarios entry _per endpoint_ covering:
      • invalid UUID  
      • missing required parameter  
      • malformed JSON payload  
      • expired or invalid token  
      • unexpected HTTP method
  
Output Requirements:  
- For N unique endpoints, include **all possible test cases** (positive + negative) for each.  
- Each endpoint must have its own independent test cases.  
- Ensure full coverage without skipping endpoints or combinations.  
- Limit test cases per combination to a reasonable number, but ensure all scenarios are covered.  
  
Goal: Exhaustively test each endpoint as a separate entity, ensuring every valid/invalid permutation is addressed.  
TOTAL NUMBER OF ENDPOINTS: ${uniqueEndpoints.length}
`;
 const baseContextForCode= `The dataset includes the following unique API endpoints:
${formattedEndpoints}
Your response MUST return a complete JSON object with this EXACT structure:
${JSON.stringify(harEntries, null, 2)}
You MUST return a complete JSON object with this EXACT structure:
{
  "stories": [
  "id": "unique-id",
  "title": "Story Title",
  "description": "Detailed story description",
  "testCases": [{
      "id": "tc-unique-id",
      "title": "Test Case Title",
      "description": "Detailed test case description",
      "apiDetails": {
        "method": "GET/POST/PUT/DELETE",
        "endpoint": "url/api/endpoint",
        "headers": {"header-name": "value"},
        "body": "request body if applicable",
        "expectedStatus": 200
      }
    }],
  "riskAssessment": [],
  "deliverables": [],
  "successCriteria": [],
  "rolesAndResponsibility": [
   
  ],
  "exitCriteria": [],
  "testExecutionStrategy": [],
  "entryCriteria": [],
  "testSchedule": [],
  "toolsAndAutomationStrategy": [],
  "approvalsAndSignoffs": []
}`;

const baseContext = `Please analyze these API requests and generate a comprehensive test suite that MUST include a **SEPARATE** test case for **EACH unique API endpoint** (including variations in query parameters, request methods, and payload structures) for the specified ${type}.

IMPORTANT: You must ensure that **EVERY distinct API endpoint**  in the provided data is represented in the test suite. **Any missing API endpoint coverage is NOT acceptable.**

The dataset includes the following unique API endpoints:
${formattedEndpoints}
${endpointCountNote}
Your response MUST return a complete JSON object with this EXACT structure:
${JSON.stringify(harEntries, null, 2)}
`; 
  switch (type) {
    case 'testPlan':
      return `${TEST_PLAN_SKELETON}${baseContext}
You are to generate a test plan strictly in valid JSON format based on the structure provided in a separate variable. Do not include any commentary, markdown, or explanation.

Instructions for content generation:

1. Provide a detailed meaningful "title" of the test plan.

2. In the "description", include:
   -  Summarize high-level test objectives inferred from API purpose.”
   -  Summarize high-level Scope of the test plan by understanding the endpoints work.

3. Define multiple "stories". For each story:
   - Use a unique "id" like STORY-<ShortTitle>-<##>
   - Include clear objectives and scope in the "description"
   - Add multiple "testCases". Each test case must contain:
     - Unique "id" like TC-<Positive/Negative ShortTitle>-<##>, "title", and "description"
     - Step-by-step instructions in "steps"
     - "expectedResult"
     - A full "apiDetails" object including method, endpoint, headers, body, and expectedStatus
     - severity (High, Medium, or Low), priority (1–5), and requirement ID (reqId)

4. Ensure all the provided unique METHOD + URL pairs are covered with both positive and negative test cases. Each test case must reference the correct endpoint and clearly distinguish between positive and negative scenarios.

5. Add "riskAssessment" items with category, description, mitigation, and impact (Low | Medium | High).

6. Define all "deliverables" with title, description, format, and frequency.

7. Include detailed measurable "successCriteria" with threshold values.

8. Populate "rolesAndResponsibility" — every role should map to a specific responsibility.

9. Fill "environmentRequirements" with:
   - Hardware (OS, CPU, RAM)
   - Software (browser versions, databases)
   - Network details (e.g., bandwidth, latency)

10. Provide a complete list of required "testDataRequirements".

11. Fill out the following sections (MANDATORY):
   - Detailed "testSchedule" with key dates from current date and milestones
   - Detailed "testExecutionStrategy" with stepwise strategy
   - Detailed "entryCriteria" for when testing can begin
   - Detailed "toolsAndAutomationStrategy" with api testing tools and usage plan
   - Detailed "approvalsAndSignoffs" with roles and responsibilities from different role in team as per agile.
   - Detailed "exitCriteria" for test closure

12. Include top-level arrays:
   - "passCriteria"
   - "failCriteria"
   - "suspensionCriteria"

13. Populate "traceabilityMatrix" by mapping each requirement ID (e.g., REQ-001) to all its related test case IDs (e.g., ["TC-001", "TC-002"]).

14. List both:
   - "featuresToBeTested"
   - "featuresNotToBeTested"

15. Add "staffingAndTraining" section specifying roles and skill needs.
16. Add comprehensive "negativeScenarios" representing invalid input, missing headers, auth failures, etc.

All values must conform to the JSON structure provided in the schema variable. Do not add additional fields or deviate from the required format.

Your output must ONLY be the valid JSON object. No additional explanation or formatting.
`

    case 'testScenario':
      return `${TEST_SCENARIO_SKELETON}${baseContext}

🚨 For each unique METHOD + URL pair:
✅ Include all possible positive and all possible negative test case.
✅ DO NOT group or skip endpoints.

Your response MUST include ONLY test cases with:
1. Detailed scenario title
2. Comprehensive scenario description with Positive and Negative Headline
3. For each story:
   - Specific scenario objectives
   - Preconditions and setup requirements
   - Multiple test cases with detailed steps
   - Dependencies between scenarios
   - Expected outcomes
4. Complete API details for each test case
5. Validation criteria
6. Risk considerations specific to each scenario
7. Success criteria for scenario completion
8. A total of **all possible test cases per unique endpoint** (all possible positive + all possible negative).

Ensure every API endpoint has its all test cases. Do NOT group or skip endpoints.`;

    case 'testCases':
      return `${TEST_CASES_SKELETON}${baseContext}
  🚨 For each unique METHOD + URL pair:
  ✅ Include all possible positive and all possible negative test case.
  ✅ Do not group or skip any.
Your response MUST include ONLY:
1. Clear test case titles
2. Detailed descriptions for each test case
3. For each test case:
   - Unique ID and title with Positive and Negative Type
   - Comprehensive step-by-step instructions
   - Complete API request details for the endpoint
   - Expected results and validation points
   - Error scenarios and edge cases
4. Test data requirements
5. Prerequisites and cleanup steps
6. Risk factors for each test case
7. Success criteria for test case execution
8. A total of **all possible test cases per unique endpoint should be added** (all possible positive + all possible negative).

EVERY API endpoint must have its own all possible test cases. No grouping allowed.`;

    case 'code':
      return `${baseContextForCode}
 
      "Generate separate Playwright test cases for API endpoints with the following requirements:
      
      Each endpoint and HTTP method must have its own test.
      Avoid repeating import { test, expect, request } from '@playwright/test' for every endpoint.;
      Include multiple positive and negative test cases for each endpoint:
      Positive tests: Valid inputs that return successful responses.
      Negative tests: Invalid inputs, missing fields, unauthorized access, wrong HTTP methods, etc.
      Use unique concise and descriptive test names.
      Use proper Playwright syntax (test(), expect()), and keep the logic minimal.Prioritize performance and avoid redundant operations.
      Ensure the script avoids HTTP/2 pseudo-headers (":method", ":path", etc.) and uses Playwright's built-in APIs correctly.
      End with a total test count comment.`
    default:
      throw new Error('Invalid generation type');
  }
};

export async function generateTestPlan(
  harEntries: HarEntry[],
  type: GenerationType = 'testPlan',
  onProgress?: (percent: number) => void
): Promise<TestPlan> {
  const config = await fetchConfig();

  if (!openai) {
    openai = new OpenAI({
      apiKey: config.VITE_AZURE_OPENAI_API_KEY,
      baseURL: config.VITE_AZURE_OPENAI_ENDPOINT,
      defaultQuery: { 'api-version': config.VITE_AZURE_OPENAI_API_VERSION },
      defaultHeaders: { 'api-key': config.VITE_AZURE_OPENAI_API_KEY },
      dangerouslyAllowBrowser: true
    });
  }

  const model = config.VITE_AZURE_OPENAI_MODEL || 'gpt-4o';
  let batches;

  if (model === 'gpt-4o') {
    batches = chunkArray(harEntries, config.VITE_AZURE_OPENAI_API_TOKEN_SIZE);
  } else if (model === 'o3-mini') {
    batches = type === 'code' ? chunkArray(harEntries, 2) : chunkArray(harEntries, Number(config.VITE_AZURE_OPENAI_API_BATCH_SIZE));
  } else {
    batches = type === 'code' ? chunkArray(harEntries, 2) : chunkArray(harEntries, Number(config.VITE_AZURE_OPENAI_API_BATCH_SIZE));
  }

  const totalBatches = batches.length;
  const testPlans: TestPlan[] = [];

  if (onProgress) onProgress(0);

  for (let i = 0; i < totalBatches; i++) {
    const batch = batches[i];

    // Ensure endpoint exists
    batch.forEach(entry => {
      entry.request.endpoint = entry.request.url;
    });

    const prompt = generatePrompt(type, batch);

    let completionParams: any = {
      messages: [
        {
          role: 'system',
          content: 'You are a test automation expert. Generate detailed, production-ready test artifacts...'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    };

    if (model === 'gpt-4o') {
      completionParams = {
        ...completionParams,
        model: 'gpt-4',
        max_tokens: Number(config.VITE_AZURE_OPENAI_API_TOKEN_SIZE),
        temperature: 0.3
      };
    } else if (model === 'o3-mini') {
      completionParams = {
        ...completionParams,
        model: 'o3-mini',
        max_completion_tokens: Number(config.VITE_AZURE_OPENAI_API_TOKEN_SIZE),
        reasoning_effort: 'low'
      };
    }

    try {
      const completion = await openai.chat.completions.create(completionParams);
      const response = completion.choices[0].message.content;

      if (!response) {
        console.warn(`⚠️ Empty response from OpenAI for batch ${i + 1}`);
        continue;
      }

      try {
        const testPlan = JSON.parse(response) as TestPlan;
        testPlans.push(testPlan);
      } catch (err) {
        console.warn(`⚠️ Failed to parse JSON for batch ${i + 1}:`, response);
        continue;
      }

    } catch (error) {
      console.warn(`🚨 OpenAI API error on batch ${i + 1}:`, error);
      continue;
    }

    if (onProgress) {
      const percent = Math.floor(((i + 1) / totalBatches) * 100);
      onProgress(percent);
    }
  }

  // Finalize progress after loop
  if (onProgress) onProgress(100);

  return mergeTestPlans(testPlans);
}
