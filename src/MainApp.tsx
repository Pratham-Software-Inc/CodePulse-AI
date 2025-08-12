  // Revert retryCount logic
import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileUp, CheckCircle, AlertCircle, FileCode, FileText, ListTodo, TestTube, ArrowLeft } from 'lucide-react';
import { parseHarFile } from './utils/harParser';
import { generateTestPlan } from './services/openaiService';
import type { TestPlan, GenerationType } from './types';
import * as XLSX from 'xlsx';
import {Document, Packer, Paragraph, TextRun,} from 'docx';
import jsPDF from 'jspdf';
import ReactMarkdown from 'react-markdown';
import { fetchConfig } from '../src/services/configService';
import { useNavigate, useNavigationType, useLocation } from 'react-router-dom';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [selectedType, setSelectedType] = useState<GenerationType | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<{ method: string, url: string, payload?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [history, setHistory] = useState<any[]>([]);
  const [funnyMessage, setFunnyMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [selectedFormat, setSelectedFormat] = useState('md');
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  // Removed unused location
  const [showApiDrawer, setShowApiDrawer] = useState(false);


  useEffect(() => {
    const splashSeen = localStorage.getItem('splashSeen');
    if (!splashSeen) {
      setShowSplash(true);
      setTimeout(() => {
        localStorage.setItem('splashSeen', 'true');
        setShowSplash(false);
      }, 10000); // splash visible for 3 seconds
    }
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    const fileName = selectedFile.name.toLowerCase();
    const isHar = fileName.endsWith('.har');
    const isPostmanJson = fileName.endsWith('.json');
    if (isHar || isPostmanJson) {
      setHistory(prevHistory => [...prevHistory, { file, testPlan, selectedType, apiEndpoints, status }]);
      setFile(selectedFile);
      setStatus('idle');
      setErrorMessage('');
      setTestPlan(null);
      setSelectedType(null);
      setApiEndpoints([]);
    } else {
      setErrorMessage('Please select a valid .har file or Postman Collection file.');
      setStatus('error');
    }
  };

  const handleBack = () => {
    if (history.length > 0) {
      // Restore the last state from history
      const previousState = history[history.length - 1]; // Get the last state
      setFile(previousState.file);
      setTestPlan(previousState.testPlan);
      setSelectedType(previousState.selectedType);
      setApiEndpoints(previousState.apiEndpoints);
      setStatus(previousState.status);
      setSelectedFormat(''); // Clear format selection to force user to pick again
      // Update history by removing the last state
      setHistory(prevHistory => prevHistory.slice(0, -1));
    } else if (window.history.length > 1 && navigationType !== 'POP') {
      setSelectedFormat(''); // Clear format selection
      navigate(-1);
    } else {
      setSelectedFormat(''); // Clear format selection
      navigate('/');
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];

    if (!droppedFile) return;

    const fileName = droppedFile.name.toLowerCase();
    const isHar = fileName.endsWith('.har');
    const isPostmanJson = fileName.endsWith('.json');

    if (isHar || isPostmanJson) {
      setHistory(prevHistory => [...prevHistory, { file, testPlan, selectedType, apiEndpoints, status }]);
      setFile(droppedFile);
      setStatus('idle');
      setErrorMessage('');
      setTestPlan(null);
      setSelectedType(null);
      setApiEndpoints([]);
    } else {
      setErrorMessage('Please drop a valid .har or Postman .json file');
      setStatus('error');
    }
  };


  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const getFunnyMessage = (percent: number) => {
  if (percent < 5) return '🙏 Thanks for waiting! Complex inputs or large endpoints may take 5–10 minutes to analyze. Hang tight — AI is still working!';
  if (percent < 10) return '📡 Connecting neural circuits… and maybe the coffee machine ☕';
  if (percent < 15) return '🔍 Parsing your HAR like Sherlock Holmes 🕵️';
  if (percent < 20) return '🐛 Finding bugs before they find us';
  if (percent < 25) return '📝 Drafting test ideas like a QA poet';
  if (percent < 30) return '🇬🇧 Writing tests... in perfect English';
  if (percent < 35) return '😎 Trying to impress QA leads';
  if (percent < 40) return '🤖 Teaching AI to test better than humans';
  if (percent < 45) return '🚀 Pretending this is rocket science';
  if (percent < 50) return '🧣 Wrapping logic in warm blankets of assertions';
  if (percent < 55) return '🎭 Dramatic pause... the AI is still working';
  if (percent < 60) return '✅ Running partial validations';
  if (percent < 65) return '🧠 Thinking deeply... like Socrates on a deadline';
  if (percent < 70) return '🤖 Synthesizing intelligence from HAR galaxy';
  if (percent < 75) return '⚛️ Spinning quantum loops to create test reality';
  if (percent < 80) return '💫 AI is in hyperspace writing validations across timelines';
  if (percent < 85) return '📊 Compiling your test stories and cases';
  if (percent < 90) return '🔐 Ensuring everything passes validation';
  if (percent < 95) return '📦 Packaging up your test artifacts';
  if (percent < 100) return '🎯 Final review underway… almost there!';
  return '🎉 Mission accomplished. Your artifacts are ready!';
};


  const handleGenerate = async () => {
    if (!file || !selectedType || !selectedFormat) return;

    setStatus('processing');
    setFunnyMessage('Grab a cup of tea or coffee and relax while we prepare your file. This might take a moment! ☕😊');

    try {
      const fileContent = await file.text();
      const harEntries = parseHarFile(fileContent);

      // 🚀 Pass in the progress callback
      const generatedTestPlan = await generateTestPlan(harEntries, selectedType, (percent) => {
        setProgress(percent);
        setFunnyMessage(getFunnyMessage(percent));
      });

      // If config is missing or response is invalid, show generic config error
      if (!generatedTestPlan || !generatedTestPlan.stories || !Array.isArray(generatedTestPlan.stories)) {
        setStatus('error');
        setErrorMessage('There seems to be an OpenAI configuration or model setup issue. Please check your settings and try again.');
        setShowErrorModal(true);
        return;
      }

      setTestPlan(generatedTestPlan);
      setProgress(100);

      const content = generateContent(selectedType, generatedTestPlan);
      let extension;
      let filename = `generated-${selectedType}`;
      let fileBlob: Blob;

      // ...existing code...
      if (selectedType === 'code') {
        fileBlob = new Blob([content], { type: 'text/typescript' });
        extension = '.spec.ts';
        filename += extension;
      } else if (selectedFormat === 'md') {
        const markdownContent = content;
        fileBlob = new Blob([markdownContent], { type: 'text/markdown' });
        extension = '.md';
        filename += extension;
      } else if (selectedFormat === 'txt') {
        fileBlob = new Blob([content], { type: 'text/plain' });
        extension = '.txt';
        filename += extension;
      }  else if (selectedFormat === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const lines: string[] = pdf.splitTextToSize(content, 180);
        let y = 10;

        lines.forEach((line: string) => {
          if (y > 280) {
            pdf.addPage();
            y = 10;
          }
          pdf.text(line, 10, y);
          y += 7;
        });

        // 🚨 Important: get the blob using async/await!
        fileBlob = await pdf.output('blob');
        filename += '.pdf';
      } else if (selectedFormat === 'xlsx') {
        const lines = content.split('\n');

        // Each line will be one row with one cell
        const worksheet = XLSX.utils.aoa_to_sheet(lines.map(line => [line]));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'TestArtifact');

        const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        fileBlob = new Blob([xlsxBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        extension = '.xlsx';
        filename += extension;
      } else if (selectedFormat === 'docx') {
        // Create Paragraphs from each line of content
        const lines = content.split('\n').map(line => 
          new Paragraph({
            children: [new TextRun(line)],
          })
        );

        const doc = new Document({
          sections: [{
            properties: {},
            children: lines,
          }],
        });

        const docBuffer = await Packer.toBlob(doc);
        fileBlob = docBuffer;
        extension = '.docx';
        filename += extension;
      } else {
        throw new Error('Invalid selected format.');
      }

      // Create a download link and trigger the download
      //const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save to history
      setHistory(prevHistory => [...prevHistory, { file, testPlan, selectedType, apiEndpoints, status }]);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage('There seems to be an OpenAI configuration or model setup issue. Please check your settings and try again.');
      setShowErrorModal(true);
    }
  };

  const generateContent = (type: GenerationType, testPlan: TestPlan): string => {
    switch (type) {
      case 'testPlan':
        return `# Test Plan: ${testPlan.title}

## Overview
${testPlan.description}

## Test Objectives and Scope
${testPlan.stories.map(story => `- ${story.title}`).join('\n')}

## End Points
${Array.from(new Set(
  testPlan.stories.flatMap(story =>
    story.testCases.flatMap(testCase => {
      const endpoint = testCase.apiDetails?.endpoint;
      if (!endpoint) return [];

      // ✅ Return only the trimmed full endpoint — never split on comma
      return [endpoint.trim()];
    })
  )
)).map(endpoint => `- ${endpoint}`).join('\n')}

## Stories
${testPlan.stories.map(story => `
### ${story.title}
- ID: ${story.id}
- Description: ${story.description}
${story.testCases.map(tc => `
#### Test Case: ${tc.title}
- ID: ${tc.id}
- Description: ${tc.description}
- Steps:
${tc.steps.map((step, i) => `  ${i + 1}. ${step}`).join('\n')}
- Expected Result: ${tc.expectedResult}
- API Details:
  - Method: ${tc.apiDetails.method}
  - Endpoint: ${tc.apiDetails.endpoint}
  - Headers: ${JSON.stringify(tc.apiDetails.headers || {}, null, 2)}
  - Body: ${tc.apiDetails.body || 'N/A'}
  - Expected Status: ${tc.apiDetails.expectedStatus}
- Severity: ${tc.severity}
- Priority: ${tc.priority}
- ReqId: ${tc.reqId}
`).join('\n')}
`).join('\n')}

## Risk Assessment
${testPlan.riskAssessment?.[0]
  ? `
### ${testPlan.riskAssessment[0].category}
- Description: ${testPlan.riskAssessment[0].description}
- Mitigation: ${testPlan.riskAssessment[0].mitigation}
- Impact: ${testPlan.riskAssessment[0].impact}
`
  : "No risk assessments available"}

## Deliverables
${testPlan.deliverables?.[0]
  ? `
### ${testPlan.deliverables[0].title}
- Description: ${testPlan.deliverables[0].description}
- Format: ${testPlan.deliverables[0].format}
- Frequency: ${testPlan.deliverables[0].frequency}
`
  : "No test deliverables available"}

## Success Criteria
${testPlan.successCriteria?.[0]
  ? `
### ${testPlan.successCriteria[0].category}
- Criteria: ${testPlan.successCriteria[0].criteria}
- Threshold: ${testPlan.successCriteria[0].threshold}
`
  : "No success criteria available"}

## Roles and Responsibilities
${testPlan.rolesAndResponsibility?.[0]
  ? `- Role: ${testPlan.rolesAndResponsibility[0].role}
- Responsibility: ${testPlan.rolesAndResponsibility[0].responsibility}`
  : "No roles and responsibilities available"}

## Entry Criteria
${testPlan.entryCriteria?.[0]
  ? `- Description: ${testPlan.entryCriteria[0].description}`
  : 'No entry criteria available'}

## Exit Criteria
${testPlan.exitCriteria?.[0]
  ? `- Description: ${testPlan.exitCriteria[0].description}`
  : 'No exit criteria available'}

## Test Execution Strategy
${testPlan.testExecutionStrategy?.[0]
  ? `- Description: ${testPlan.testExecutionStrategy[0].description}`
  : 'No test execution strategy available'}

## Test Schedule
${testPlan.testSchedule?.[0]
  ? `- Description: ${testPlan.testSchedule[0].description}`
  : 'No test schedule available'}

## Tools and Automation Strategy
${testPlan.toolsAndAutomationStrategy?.[0]
  ? `- Description: ${testPlan.toolsAndAutomationStrategy[0].description}`
  : 'No tools and automation strategy available'}

## Approvals and Sign-offs
${testPlan.approvalsAndSignoffs?.[0]
  ? `- Description: ${testPlan.approvalsAndSignoffs[0].description}`
  : 'No approvals and signoffs available'}

## References
${testPlan.references?.[0]
  ? `- Title: ${testPlan.references[0].title}, URL: ${testPlan.references[0].url}`
  : 'No references available'}

## Test Items
${testPlan.testItems?.map(item => `
- ID: ${item.id}-${String(Math.floor(100000 + Math.random() * 900000))}
- Description: ${item.description}
- Endpoint: ${item.endpoint}
- Method: ${item.method}
`).join('\n') || 'No test items available'}

## Features To Be Tested
${testPlan.featuresToBeTested?.map(f => `- ${f}`).join('\n') || 'None'}

## Features Not To Be Tested
${testPlan.featuresNotToBeTested?.map(f => `- ${f}`).join('\n') || 'None'}

## Staffing And Training
${testPlan.staffingAndTraining?.[0]
  ? `
- Role: ${testPlan.staffingAndTraining[0].role}
- Skills: ${testPlan.staffingAndTraining[0].skills.join(', ')}
`
  : 'None'}

## Pass Criteria
${testPlan.passCriteria?.[0]
  ? `- ${testPlan.passCriteria[0]}`
  : 'None'}

## Fail Criteria
${testPlan.failCriteria?.[0]
  ? `- ${testPlan.failCriteria[0]}`
  : 'None'}

## Suspension Criteria
${testPlan.suspensionCriteria?.[0]
  ? `- ${testPlan.suspensionCriteria[0]}`
  : 'None'}

## Environment Requirements
- Hardware: ${testPlan.environmentRequirements?.hardware?.[0] || 'None'}
- Software: ${testPlan.environmentRequirements?.software?.[0] || 'None'}
- Network: ${testPlan.environmentRequirements?.network || 'None'}

## Test Data Requirements
${testPlan.testDataRequirements?.[0]
  ? `- ${testPlan.testDataRequirements[0]}`
  : 'None'}

## Traceability Matrix
${testPlan.traceabilityMatrix
  ? Object.entries(testPlan.traceabilityMatrix)
      .map(([reqId, tcIds]) => `- ${reqId}: ${tcIds.join(', ')}`)
      .join('\n')
  : 'None'}

## Negative Scenarios
${testPlan.negativeScenarios?.map(s => `- ${s}`).join('\n') || 'None'}
`;
      case 'testScenario':
        return testPlan.stories.map(story => `
# Test Scenario: ${story.title}

## Overview
${story.description}

## Scenarios
${story.testCases.map(tc => `
### ${tc.title}
${tc.description}

#### Prerequisites
- Valid API endpoints
- Required authentication
- Test data available

#### Steps
${tc.steps.join('\n')}

#### Expected Outcome
${tc.expectedResult}

#### API Details
- Method: ${tc.apiDetails.method}
- Endpoint: ${tc.apiDetails.endpoint}
- Expected Status: ${tc.apiDetails.expectedStatus}

#### Validation Criteria
- Response status matches expected status
- Response format is valid
- Data integrity is maintained
- Error handling works as expected
`).join('\n')}`).join('\n');

      case 'testCases':
        return testPlan.stories.map(story => story.testCases.map(tc => `
# Test Case: ${tc.title}

## ID: ${tc.id}
## Description: ${tc.description}

### Prerequisites
- API endpoint: ${tc.apiDetails.endpoint}
- Method: ${tc.apiDetails.method}
- Authentication: Required

### Steps
${tc.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### Expected Result
${tc.expectedResult}

### API Details
- Method: ${tc.apiDetails.method}
- Endpoint: ${tc.apiDetails.endpoint}
- Headers: ${JSON.stringify(tc.apiDetails.headers || {}, null, 2)}
- Body: ${tc.apiDetails.body || 'N/A'}
- Expected Status: ${tc.apiDetails.expectedStatus}

### Validation Points
- Status code should be ${tc.apiDetails.expectedStatus}
- Response format should match API specification
- Error handling should be implemented
- Data integrity should be maintained
`).join('\n\n---\n\n')).join('\n\n');

      case 'code':
        return generatePlaywrightTests(testPlan);

      default:
        return '';
    }
  };

  function generatePlaywrightTests(testPlan: TestPlan): string {
    return `import { test, expect } from '@playwright/test'; // Import Playwright's test and assertion tools
 
  ${testPlan.stories
    .map(
      (story) =>
        story.testCases
          .map((testCase) => {
            const api = testCase.apiDetails || {};
            const method = (api.method || 'get').toLowerCase();
            const endpoint = api.endpoint || '/missing-endpoint';
            const headers = JSON.stringify(api.headers || {}, null, 2);
            const body = api.body ? JSON.stringify(api.body, null, 2) : 'undefined';
            const expectedStatus = api.expectedStatus || 200;
 
            return `
  // Test: ${testCase.title}
  // Description: ${testCase.description}
  test(${JSON.stringify(testCase.title)}, async ({ request }) => {
    // Send ${testCase.apiDetails.method} request to ${endpoint}
    const response = await request.${method}(
      '${endpoint}', // API endpoint
      {
        headers: ${headers}, // Request headers
        data: ${body} // Request payload
      }
    );
 
    // Assert that the response status is ${expectedStatus}
    expect(response.status()).toBe(${expectedStatus});
  });`;
          })
          .join('\n\n')
    )
    .join('\n\n')}`;
  }

  const extractApiEndpoints = (harEntries: any[]) => {
    return harEntries
      .filter((entry: any) => entry.request && entry.request.url && entry.request.method)
      .map((entry: any) => ({
        method: entry.request.method,
        url: entry.request.url,
        payload: entry.request.postData ? formatPayload(entry.request.postData.text) : undefined,
      }));
  };

  const formatPayload = (payload: string) => {
    try {
      const parsedPayload = JSON.parse(payload);
      return JSON.stringify(parsedPayload, null, 2);
    } catch (e) {
      return payload;
    }
  };

  const generationOptions = [
    { type: 'testPlan', label: 'Test Plan', icon: FileText, description: 'Generate a comprehensive test plan document' },
    { type: 'testScenario', label: 'Test Scenarios', icon: ListTodo, description: 'Create detailed test scenarios' },
    { type: 'testCases', label: 'Test Cases', icon: TestTube, description: 'Generate individual test cases' },
    { type: 'code', label: 'Code Generator', icon: FileCode, description: 'Generate Playwright test code' },
  ] as const;

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-green-100 text-green-800';
      case 'POST':
        return 'bg-blue-100 text-blue-800';
      case 'PUT':
        return 'bg-yellow-100 text-yellow-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'PATCH':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
  
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4 overflow-auto" style={{ backgroundColor: 'rgb(85 125 165)', maxHeight: '100vh' }}>
  {showSplash ? (
  <div className="flex justify-center items-center h-screen w-screen" style={{ backgroundColor: '#5b84a3' }}>
    <div className="text-center p-8 bg-white rounded-3xl shadow-2xl max-w-xl animate-fade-in-up border border-blue-200">
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-blue-100 rounded-full p-3 shadow-md">
          <span className="text-4xl">🧪</span>
        </div>

        <h1 className="text-4xl font-extrabold text-blue-800 tracking-wide drop-shadow-sm">
          Welcome to <span className="text-indigo-600">CodePulse AI</span>
        </h1>

        <p className="text-base text-gray-600 leading-relaxed mt-2">
          Turn your HAR or Postman files into <strong>Production-grade Test Plans, <br></br>Test Scenarios, Test Cases, and Playwright code </strong>instantly.  <br />
          Let AI do the heavy lifting for your QA workflows.
        </p>

        <p className="text-sm text-gray-700">
          👋 First time here? Please{' '}
          <button
            onClick={() => navigate('/config')}
            className="text-indigo-600 font-medium underline hover:text-indigo-800 transition-colors"
          >
            configure your OpenAI settings
          </button>.
        </p>

        <button
          onClick={() => setShowSplash(false)}
          className="mt-3 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition duration-300 shadow-sm"
        >
          🚀 Continue to App
        </button>
      </div>
    </div>
  </div>
) :  (
        <div className="w-2/3 max-w-3xl bg-white shadow-lg rounded-lg p-4 mt-8" style={{ backgroundColor: 'rgb(244 246 248)' }}>
        <div className="text-center">
          <FileCode className="mx-auto h-12 w-12 text-indigo-600" />
          <h1 className="mt-6 text-4xl font-extrabold text-blue-500">CodePulse AI</h1>
          <h2 className="mt-4 text-2xl font-semibold text-gray-600">From Test Plan to Automation-Instantly</h2>
          <p className="mt-4 text-base text-gray-600">Upload your HAR or Postman Collection file and select the type of test artifact to generate</p>
        </div>

        <div className="mt-2">
          <div
            className={`w-full max-w-2xl mx-auto px-3 py-4 border-2 border-dashed rounded-lg text-center
              ${isDragging ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-white'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".har,.json"
              className="hidden"
            />
            {status === 'idle' && !file && (
              <div>
                <Upload className="mx-auto h-16 w-16 text-gray-400" />
                <p className="mt-4 text-sm text-gray-600">
                  Drag and drop your HAR or Postman Collection file here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    browse
                  </button>
                </p>
              </div>
            )}

            {file && status !== 'processing' && !testPlan && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4 w-full">
                  <button onClick={handleBack} className="flex items-center text-gray-600 hover:text-indigo-600 font-medium">
                    <ArrowLeft className="h-5 w-5 mr-1" />Back
                  </button>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-8 w-8 text-indigo-600" />
                      <span className="text-sm text-gray-900 font-medium">{file.name}</span>
                    </div>
                  </div>
                  <div style={{ width: '60px' }} /> {/* Spacer for symmetry */}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-full">
                  {generationOptions.map(({ type, label, icon: Icon, description }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        // For code, always .spec.ts, for others default to md
                        if (type === 'code') {
                          setSelectedFormat('spec');
                        } else {
                          setSelectedFormat('md');
                        }
                      }}
                      className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all w-full
                        ${selectedType === type
                          ? 'border-indigo-600 bg-indigo-100 text-indigo-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                    >
                      <Icon className={`h-5 w-5 ${selectedType === type ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className={`mt-1 font-medium text-center text-xs ${selectedType === type ? 'text-indigo-600' : 'text-gray-900'}`}>
                        {label}
                      </span>
                      <span className="mt-1 text-xs text-gray-500 text-center px-1 leading-tight">{description}</span>
                    </button>
                  ))}
                </div>

                {/* Format Selection for Download */}
                <label className="block text-xs font-medium text-gray-700">Select File Format:</label>
                {selectedType === 'code' ? (
                  <select
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    value={selectedFormat}
                    className="mt-1 p-1 border border-gray-300 rounded-md w-full text-xs"
                  >
                    <option value="spec">Spec File (.spec.ts)</option>
                  </select>
                ) : (
                  <select
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    value={selectedFormat}
                    className="mt-1 p-1 border border-gray-300 rounded-md w-full text-xs"
                  >
                    <option value="md">Markdown (.md)</option>
                    <option value="txt">Text (.txt)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                )}

                {/* Buttons Row: Generate + Download */}
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={handleGenerate}
                    disabled={!(selectedType && selectedFormat)}
                    className={`flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${selectedType && selectedFormat ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}`}
                  >
                    {selectedType === 'testPlan' && 'Generate Test Plan'}
                    {selectedType === 'testScenario' && 'Generate Test Scenarios'}
                    {selectedType === 'testCases' && 'Generate Test Cases'}
                    {selectedType === 'code' && 'Generate Code Generator'}
                    {!selectedType && 'Generate Selected Artifact'}
                  </button>
                  <button
                    onClick={() => {
                      const sampleFrameworkPath = '/Playwright_/playwright_framework.zip';
                      const a = document.createElement('a');
                      a.href = sampleFrameworkPath;
                      a.download = 'sample-playwright-framework.zip';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Download Sample Playwright Framework
                  </button>
                </div>
              </div>
            )}

            {status === 'processing' && (
              <div className="text-center space-y-4">
                <div className="w-full mt-4">
                  <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300 ease-in-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-center mt-2 text-gray-600">
                    {progress}% - {funnyMessage || `Generating ${selectedType}...`}
                  </div>
                </div>
              </div>
            )}

            {status === 'success' && testPlan && (
              <div className="space-y-4">
                <div>
                  <button onClick={handleBack} className="flex items-center mt-4 text-gray-600 hover:text-indigo-600 font-medium">
                    <ArrowLeft className="h-5 w-5 mr-2" />Back
                  </button>
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <p className="mt-2 text-sm text-gray-900">
                    {generationOptions.find(opt => opt.type === selectedType)?.label} generated successfully!
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Your file has been downloaded.</p>
                  <div className="mt-2 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <span className="font-semibold text-yellow-700">Note:</span>
                    <span className="text-yellow-800 text-sm ml-2">
                      While generating test artifacts, some endpoints might be skipped if the token size limit is exceeded due to large payloads. To avoid this, we recommend reducing the request body size by filtering out unnecessary fields or data.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setTestPlan(null);
                    setSelectedType(null);
                    setApiEndpoints([]);
                    window.location.reload();
                  }}
                  className="text-sm text-gray-600 hover:text-indigo-600 font-medium"
                >
                  Upload new HAR or Postman Collection file
                </button>
                {/* Button for Downloading Sample Playwright Framework */}
                {selectedType === 'code' && (
                  <div>
                    <button
                      onClick={() => {
                        const sampleFrameworkPath = '/Playwright_/playwright_framework.zip';
                        const a = document.createElement('a');
                        a.href = sampleFrameworkPath;
                        a.download = 'sample-playwright-framework.zip';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="w-full px-4 py-2 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Download Sample Playwright Framework
                    </button>
                    {/* Note after the download button, visible only when generating code */}
                    <p className="mt-2 text-base font-semibold" style={{ color: 'rgb(242, 101, 148)' }}>
                      Note: Refer to the downloaded Playwright framework README file to seamlessly integrate the generated code.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Error Modal Popup */}
            {showErrorModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowErrorModal(false)} />
                <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 flex flex-col items-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                  <p className="mt-4 text-base text-red-700 font-semibold text-center">{errorMessage}</p>
                  <button
                    className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 focus:outline-none"
                    onClick={() => setShowErrorModal(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {file && status !== 'processing' && (
          <button
            onClick={async () => {
              if (file) {
                const fileContent = await file.text();
                const harEntries = parseHarFile(fileContent);
                const apiDetails = extractApiEndpoints(harEntries);
                setApiEndpoints(apiDetails);
                setShowApiDrawer(true);
              }
            }}
            className="w-full max-w-2xl mx-auto block px-4 py-2 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            List All APIs
          </button>
        )}

        {/* Centered Popup Modal for API List */}
        {showApiDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowApiDrawer(false)} />
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl w-2/3 max-w-6xl max-h-[80vh]">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold z-20 bg-white px-2 py-1 rounded shadow-sm"
                onClick={() => setShowApiDrawer(false)}
                aria-label="Close"
              >
                ×
              </button>
              <div className="p-6 overflow-y-auto max-h-[80vh]">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">API Endpoints</h3>
                {apiEndpoints.length === 0 ? (
                  <div className="text-gray-500">No API endpoints found.</div>
                ) : (
                  <div className="space-y-4">
                    {apiEndpoints.map((api, index) => (
                      <div key={index} className={`p-4 rounded-md shadow-md ${getMethodColor(api.method)}`}> 
                        <div className="font-medium">API Endpoint {index + 1}</div>
                        <p className="text-sm">Method: {api.method}</p>
                        <p className="text-sm break-words whitespace-pre-wrap">URL: {api.url}</p>
                        {api.payload && (
                          <div className="mt-2">
                            <p className="text-sm">Payload:</p>
                            <pre className="bg-gray-200 p-2 rounded text-xs break-words whitespace-pre-wrap">{api.payload}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      <Chatbot />

    </div>
  );
}

// Chatbot with API key (place this at the end of App.tsx)
const Chatbot = () => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Track if the chatbot is minimized

  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;

  // Keywords related to software/API testing
  const testingKeywords = [
     // Software Testing Concepts
  "software testing",
  "test automation",
  "unit testing",
  "integration testing",
  "system testing",
  "acceptance testing",
  "manual testing",
  "automated testing",
  "test case",
  "test cases",
  "test plan",
  "test strategy",
  "test script",
  "test scenario",
  "test coverage",
  "bug report",
  "defect tracking",
  "test management",
  "qa process",
  "test life cycle",
  "quality assurance",
  "functional testing",
  "non-functional testing",
  "regression testing",
  "smoke testing",
  "sanity testing",
  "performance testing",
  "load testing",
  "stress testing",
  "security testing",
  "usability testing",
  "compatibility testing",
  "exploratory testing",

  // API Testing Specific
  "api testing",
  "TDD",
  "BDD",
  "rest api testing",
  "soap api testing",
  "rest api",
  "soap api",
  "postman",
  "swagger",
  "openapi",
  "har file",
  "endpoint testing",
  "http methods",
  "get request",
  "post request",
  "put request",
  "delete request",
  "status code",
  "json response",
  "xml response",
  "wsdl",
  "soap envelope",
  "api response validation",
  "api contract",
  "api automation",
  "api mocking",
  "api error handling",
  "api security",
  "oauth2",
  "jwt token",
  "api authentication",
  "api authorization",

  // Tools
  "playwright",
  "selenium",
  "cypress",
  "junit",
  "pytest",
  "jest",
  "mocha",
  "karma",
  "restassured",
  "soapui",
  "katalon",
  "testng",
  "postman scripts",
  "newman",
  "cucumber",
  "burp suite",
  ];

  const isCodePulseQuestion = (message: string): boolean => {
    const codepulseKeywords = ["codepulse", "har file"," upload postman collection", "upload har", "test plan", "test cases", 
                               "test scenarios", "playwright", "download", "generate sample playwright framework"];
    const lowerMsg = message.toLowerCase().replace(/[^\w\s]/gi, "");

    return codepulseKeywords.some((keyword) => lowerMsg.includes(keyword));
  };


  const isTestingQuestion = (message: string): boolean => {
    const lowerMsg = message
      .toLowerCase()
      .replace(/[^\w\s]/gi, ""); // remove punctuation
  
    return testingKeywords.some((keyword) => {
      const fuzzyKeyword = keyword
        .replace(/[-\s]/g, "\\s*")   // allow optional spaces/hyphens
        .replace(/s$/, "s?");       // optional plural 's'
  
      const pattern = new RegExp(`\\b${fuzzyKeyword}\\b`, "i");
      return pattern.test(lowerMsg);
    });
  };
  const getCodePulseAnswer = (message: string): string | null => {
    const msg = message.toLowerCase();
    
    if (msg.includes("upload har") || msg.includes("how to upload har")) {
      return `To upload a HAR file:\n1. Go to https://app-codepulseai.thepsi.com/\n2. Click "Upload HAR File"\n3. Select the .har file from your system.\nOnce uploaded, you can list APIs and generate test artifacts.`;
    }
    if (msg.includes("upload postmancollection") || msg.includes("how to upload postman collection ")) {
      return `To upload a Postman Collection file:\n1. Go to https://app-codepulseai.thepsi.com/\n2. Click "Upload Postman collection File"\n3. Select the .json file from your system.\nOnce uploaded, you can list APIs and generate test artifacts.`;
    }
    if (msg.includes("what is codepulse ai")) {
      return `CodePulse AI is an intelligent platform designed to automate and streamline the process of generating essential test artifacts for software and API testing. It supports both HAR (HTTP Archive) files and Postman Collection files as input sources. CodePulse AI simplifies test generation by analyzing network traffic from HAR files or API request definitions from Postman Collections, and creates test plans, test scenarios, test cases, and automation code tailored to the captured API endpoints.`;
    }    
  
    if (msg.includes("generate test plan")) {
      return `Click on the "Test Plan" button in the app. A file containing your test plan in the selected format will be downloaded automatically.`;
    }
    if (msg.includes("generate test scenario")) {
      return `Click on the "Test Scenario" button in the app. A file containing your test scenarios in the selected format will be downloaded automatically.`;
    }
    if (msg.includes("generate test cases")) {
      return `Click on the "Test Cases" button in the app. A file containing your test cases in the selected format will be downloaded automatically.`;
    }
  
    if (msg.includes("playwright") && msg.includes("test code")) {
      return `Click the "Code Generator" button to generate Playwright test scripts (.spec.ts) for all your API endpoints.`;
    }
    if (msg.includes("download playwright sample framework")) {
      return `After uploading a .har or Postman collection file, the "Download Playwright Sample Framework" option will become available in the UI.`;
    }
  
    if (msg.includes("back to options")) {
      return `When you click the back icon in CodePulse AI, you’ll return to the options screen where you can reuse your uploaded HAR file and generate additional test artifacts.`;
    }
  
    return null;
  };
let reply: { role: string; content: string } | null = null;

  const handleSend = async () => {
    const config = await fetchConfig();

    if (!input.trim()) return;
   
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
   
    // Check if the message is related to software or API testing
    if (!isTestingQuestion(input)&& !isCodePulseQuestion(input)) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I only respond to software testing or API testing related questions.",
        },
      ]);
      setLoading(false);
      return;
    }
     // Provide a CodePulse AI-specific response if applicable
     const codePulseReply = getCodePulseAnswer(input);
     if (codePulseReply) {
       setMessages([...newMessages, { role: "assistant", content: codePulseReply }]);
       setLoading(false);
       return;
     }
   
    // Ensure the endpoint is defined
    if (!endpoint) {
      console.error("Endpoint is not defined!");
      setMessages([
        ...newMessages,
        { role: "assistant", content: "AI connection failed. Please check your OpenAI configuration.  " },
      ]);
      setLoading(false);
      return;
    }
   

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey || "", // Handle case where apiKey might be undefined
        },
        body: JSON.stringify({
          messages: newMessages,
          reasoning_effort: "low"
         // temperature: 0.7,
        }),
      });
   
if (config.VITE_AZURE_OPENAI_MODEL === 'gpt-4o') {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey || "", // Handle case where apiKey might be undefined
      },
      body: JSON.stringify({
        messages: newMessages,
        model: 'gpt-4o',
        max_tokens: Number(config.VITE_AZURE_OPENAI_API_TOKEN_SIZE),
        temperature: 0.7,
      }),
    });
 const data = await response.json();
       reply = data.choices?.[0]?.message;
    // handle response here
  } catch (error) {
    console.error("GPT-4o error:", error);
  }
}
else {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey || "", // Handle case where apiKey might be undefined
      },
      body: JSON.stringify({
        messages: newMessages,
        model: 'o3-mini',
        reasoning_effort: "low",
        // temperature: 0.7, // Uncomment if supported
      }),
    });
 const data = await response.json();
       reply = data.choices?.[0]?.message;
    // handle response here
  } catch (error) {
    console.error("o3-mini error:", error);
  }
}

if (reply) {
        setMessages([...newMessages, reply]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "No reply received from the server. Please check your OpenAI Config." },
        ]);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "AI connection failed. Please check your OpenAI configuration." },
      ]);
    } finally {
      setLoading(false);
    }
  };
  // Helper to send quick-reply value immediately
  const handleSendQuickReply = async (value: string) => {
    if (!value.trim()) return;
    const newMessages = [...messages, { role: "user", content: value }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    if (!isTestingQuestion(value) && !isCodePulseQuestion(value)) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I only respond to software testing or API testing related questions.",
        },
      ]);
      setLoading(false);
      return;
    }
    const codePulseReply = getCodePulseAnswer(value);
    if (codePulseReply) {
      setMessages([...newMessages, { role: "assistant", content: codePulseReply }]);
      setLoading(false);
      return;
    }
    if (!endpoint) {
      console.error("Endpoint is not defined!");
      setMessages([
        ...newMessages,
        { role: "assistant", content: "AI connection failed. Please check your OpenAI configuration.  " },
      ]);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey || "",
        },
        body: JSON.stringify({
          messages: newMessages,
          reasoning_effort: "low"
        }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message;
      if (reply) {
        setMessages([...newMessages, reply]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: "No reply received from the server." },
        ]);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "AI connection failed. Please check your OpenAI configuration." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    { label: "What is CodePulse AI?", value: "What is CodePulse AI?" },
    { label: "How to upload HAR file?", value: "How to upload HAR file?" },
    { label: "How to upload Postman Collection file?", value: "How to upload Postman Collection file" },
    { label: "Generate Test Plan", value: "Generate test plan" },
    { label: "Generate Test Scenarios", value: "Generate test scenario" },
    { label: "Generate Test Cases", value: "Generate test cases" },
    { label: "Generate Playwright Test Code", value: "Generate Playwright test code" },
    { label: "Download Playwright Sample Framework" , value: "Download Playwright Sample Framework" },
  ];
  

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-xl rounded-2xl p-4 border z-50">
      <h3 className="text-lg font-semibold mb-2 flex justify-between items-center">
        🤖 CodePulse Chatbot
        <button
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => setIsMinimized(!isMinimized)}
        >
          {isMinimized ? "🔽" : "🔼"} {/* Toggle button */}
        </button>
      </h3>
  
      {!isMinimized && (
        <>
         <div className="h-[25rem] overflow-y-auto border p-2 rounded bg-gray-50 text-sm">
         {messages.map((msg, i) => (
              <div key={i} className="mb-2">
                <strong>{msg.role === "user" ? "You" : "AI"}:</strong>
                {msg.role === "assistant" ? (
                  <div className="mt-1 p-2 bg-gray-100 rounded">
                    <ReactMarkdown>{msg.content}</ReactMarkdown> {/* formatted markdown */}
                  </div>
                ) : 
                (
                  <div className="mt-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown> {/* user message plain */}</div>
                )}
              </div>
            ))}
            {loading && <div className="text-gray-500">AI is thinking...</div>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {quickReplies.map((item, index) => (
              <button
                key={index}
                className={`bg-gray-200 text-sm px-3 py-1 rounded hover:bg-gray-300 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (loading) return;
                  setInput("");
                  handleSendQuickReply(item.value);
                }}
                disabled={loading}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex mt-2">
            <input
              className="flex-1 border rounded-l px-2 py-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder="Ask me anything..."
            />
            <button
              className="bg-blue-500 text-white px-3 rounded-r text-sm"
              onClick={handleSend}
              disabled={loading}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
  
};

export default App;