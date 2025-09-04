// Required imports
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable, { type RowInput, type UserOptions } from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  TableLayoutType,
} from 'docx';
// Use browser build for xlsx-populate (dynamic import in buildXlsxBlob)
import { FileText, ListTodo, TestTube, FileCode, Upload, ArrowLeft, FileUp, CheckCircle, AlertCircle } from 'lucide-react';
import { parseHarFile } from './utils/harParser';
import { TestPlan, GenerationType } from './types';
import { generateTestPlan } from './services/openaiService';

// Helper for column letter (A, B, ..., Z, AA, AB, ...)
const colLetter = (n: number) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - m) / 26); } return s; };

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [showApiDrawer, setShowApiDrawer] = useState(false);
  // Remove any API Endpoints error modal state (if present)
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



  useEffect(() => {
    const splashSeen = localStorage.getItem('splashSeen');
    if (!splashSeen) {
      setShowSplash(true);
      setTimeout(() => {
        localStorage.setItem('splashSeen', 'true');
        setShowSplash(false);
      }, 10000); // splash visible for 10 seconds
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
// Clear the native file input value so selecting the same file later triggers a change event
      if (fileInputRef.current) {
        try { fileInputRef.current.value = ''; } catch (e) { /* ignore */ }
      }
    } else {
      setErrorMessage('Please select a valid .har file or Postman Collection file.');
      setStatus('error');
    }
  };

  const handleBack = () => {
    if (history.length > 0) {
      // Restore the last state from history
      const previousState = history[history.length - 1]; // Get the last state
      setFile(previousState?.file ?? null);
      setTestPlan(null);
      setSelectedType(null);
      setApiEndpoints(previousState?.apiEndpoints ?? []);
      setStatus('idle');
      setSelectedFormat(''); // Clear format selection to force user to pick again
// Clear native file input so re-selecting the same file will work
      if (fileInputRef.current) {
        try { fileInputRef.current.value = ''; } catch (e) { /* ignore */ }
      }
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
    // Clear the native file input so a subsequent browse+select of the same file will fire change
      if (fileInputRef.current) {
        try { fileInputRef.current.value = ''; } catch (e) { /* ignore */ }
      }
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
}

// ========== FORMATTED EXPORT BUILDERS (DOCX / PDF / XLSX) ==========

// Types helper (already have TestPlan & GenerationType in file)
type ArtifactKind = GenerationType;

// Safe array
const arr = <T,>(x: T[] | undefined | null): T[] => (Array.isArray(x) ? x : []);

// Canonical, sorted uniqueEndpoints
function uniqueEndpoints(plan: TestPlan): string[] {
  const set = new Set<string>();
  (plan.stories ?? []).forEach(s =>
    (s.testCases ?? []).forEach(tc => {
      const ep = tc.apiDetails?.endpoint?.trim();
      if (ep) set.add(ep);
    })
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

// DOCX helpers
const H = (text: string, level: keyof typeof HeadingLevel) =>
  new Paragraph({ text, heading: HeadingLevel[level], spacing: { after: 200 } });
const B = (text: string) => new TextRun({ text, bold: true });

// Remove unused truncation constant: we now preserve full content and insert breaks instead of truncating
// Add global export safety limits (used by PDF/DOCX/XLSX generators)
const EXPORT_MAX_ROWS_PER_TABLE = Number.MAX_SAFE_INTEGER; // was 40
// Avoid splitting Excel sheets into multiple parts for scenarios/test cases
const XLSX_MAX_ROWS_PER_SHEET = 50000; // split sheets at 50k rows for Excel safety

// Add helper to insert line breaks into very long continuous tokens so word-wrapping works in DOCX/Excel/PDF exports
function breakLongSegments(text: string, maxLen: number = 100): string {
  if (text === null || text === undefined) return '';
  const s = String(text);
  // Preserve existing whitespace while breaking up any long continuous non-whitespace tokens
  return s.split(/(\s+)/).map(token => {
    // If token is purely whitespace, keep it as-is
    if (/^\s+$/.test(token)) return token;
    if (token.length <= maxLen) return token;
    const parts: string[] = [];
    for (let i = 0; i < token.length; i += maxLen) {
      parts.push(token.slice(i, i + maxLen));
    }
    // Insert a newline between parts to allow breaking inside table cells (works for Excel, PDF and Word)
    return parts.join('\n');
  }).join('');
}

// Replace truncating safeCellValue with a non-destructive version that preserves full content but inserts breaks
const safeCellValue = (v: any) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    return breakLongSegments(v, 100);
  }
  try {
    const s = JSON.stringify(v, null, 2);
    return breakLongSegments(s, 100);
  } catch (e) {
    const s = String(v);
    return breakLongSegments(s, 100);
  }
};

// Unified spacer helper used by DOCX/PDF/XLSX table renderers
function addTableSpacer(format: 'docx' | 'pdf' | 'xlsx', context?: any) {
  try {
    if (format === 'docx') {
      // Return a blank paragraph with spacing after so callers can push it into children
      return new Paragraph({ spacing: { after: 200 } });
    }
    if (format === 'pdf') {
      const pdf: any = context?.pdf;
      // Prefer last autoTable finalY if available
      const lastY = pdf && pdf.lastAutoTable && typeof pdf.lastAutoTable.finalY === 'number'
        ? pdf.lastAutoTable.finalY
        : (context?.currentY ?? 0);
      // return mm position (finalY + 10mm)
      return lastY + 10;
    }
    if (format === 'xlsx') {
      const sheet = context?.sheet;
      const lastRow = typeof context?.lastRow === 'number' ? context.lastRow : null;
      if (sheet && lastRow !== null) {
        try { sheet.row(lastRow + 1).height(15); } catch (e) { /* ignore */ }
      }
      return;
    }
  } catch (e) {
    // best-effort; ignore failures so exports still succeed
  }
}

// Update tableDocx to apply computed column widths and cell margins so Word wraps inside cells
const tableDocx = (headers: string[], rows: (string | number | undefined)[][]): (Table | Paragraph)[] => {
  const normRows = rows.map(r => r.map(c => c === null || c === undefined ? '' : breakLongSegments(String(c), 100)));
  const tables: (Table | Paragraph)[] = [];

  // Use DXA twips and cap per-cell width to approx 2880 (≈200px)
  const pageWidthTwips = 12240;
  const marginTwips = 1440;
  const availableWidth = pageWidthTwips - marginTwips * 2;
  const MAX_CELL = 2880;
  const MIN_CELL = 800;

  let colWidths: number[] = headers.map(h => {
    const key = String(h || '').toLowerCase();
    if (key.includes('url') || key.includes('endpoint') || key.includes('payload') || key.includes('body') || key.includes('headers') || key.includes('description')) return MAX_CELL;
    return MIN_CELL;
  });

  // Shrink columns proportionally if total width exceeds available page width
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  if (totalWidth > availableWidth) {
    const shrinkFactor = availableWidth / totalWidth;
    colWidths = colWidths.map(w => Math.max(MIN_CELL, Math.floor(w * shrinkFactor)));
  }

  // Final clamp: ensure sum of colWidths <= availableWidth
  const sumWidths = colWidths.reduce((a, b) => a + b, 0);
  if (sumWidths > availableWidth) {
    const scale = availableWidth / sumWidths;
    colWidths = colWidths.map(w => Math.max(MIN_CELL, Math.floor(w * scale)));
  }

  for (let i = 0; i < normRows.length; i += EXPORT_MAX_ROWS_PER_TABLE) {
    const chunk = normRows.slice(i, i + EXPORT_MAX_ROWS_PER_TABLE);
    const table = new Table({
      width: { size: availableWidth, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({ children: headers.map((h, idx) => new TableCell({ width: { size: colWidths[idx] || Math.floor(availableWidth / headers.length), type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [B(h)] })] })) }),
        ...chunk.map(r => new TableRow({ children: r.map((c, idx) => new TableCell({ width: { size: colWidths[idx] || Math.floor(availableWidth / headers.length), type: WidthType.DXA }, verticalAlign: 'top', margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph(String(c ?? ''))] })) }))
      ]
    });
    tables.push(table);
    // add a blank paragraph spacer after each table
    tables.push(addTableSpacer('docx'));
  }

  if (tables.length === 0) {
    const table = new Table({
      width: { size: availableWidth, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [ new TableRow({ children: headers.map((h, idx) => new TableCell({ width: { size: colWidths[idx] || Math.floor(availableWidth / headers.length), type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, children: [new Paragraph({ children: [B(h)] })] })) }) ]
    });
    tables.push(table);
    tables.push(addTableSpacer('docx'));
  }

  return tables;
};

async function buildDocxBlob(kind: ArtifactKind, plan: TestPlan): Promise<Blob> {
  const children: any[] = [];
  let prefix = '';
  if (kind === 'testPlan') prefix = 'Test Plan';
  else if (kind === 'testScenario') prefix = 'Test Scenarios';
  else if (kind === 'testCases') prefix = 'Test Cases';
  const docTitle = plan.title && plan.title.trim() ? `${prefix}: ${plan.title}` : '';
  if (docTitle) children.push(H(docTitle, 'HEADING_1'));
  if (kind === 'testPlan') {
    // 1. Overview
    children.push(H('Overview', 'HEADING_2'));
    children.push(new Paragraph(plan.description || ''));
    children.push(new Paragraph(''));

    // 2. Test Objectives and Scope
    children.push(H('Test Objectives and Scope', 'HEADING_2'));
    if (arr(plan.stories).length) {
      plan.stories.forEach(story => {
        children.push(new Paragraph(`• ${story.title}`));
      });
    } else {
      children.push(new Paragraph('No objectives or scope defined.'));
    }
    children.push(new Paragraph(''));

    // 3. Endpoints
    const eps = uniqueEndpoints(plan);
    if (eps.length) {
      children.push(H('Endpoints', 'HEADING_2'));
      children.push(...tableDocx(['Endpoint'], eps.map(e => [e])));
      children.push(new Paragraph(''));
    }

    // 4. Stories & Test Cases
    if (arr(plan.stories).length) {
      children.push(H('Stories', 'HEADING_2'));
      plan.stories.forEach(story => {
        children.push(H(story.title || 'Story', 'HEADING_3'));
        children.push(new Paragraph({ children: [new TextRun({ text: 'Story ID: ', bold: true }), new TextRun(story.id || '—')] }));
        if (story.description) children.push(new Paragraph(story.description));
        arr(story.testCases).forEach(tc => {
          children.push(H(`Test Case: ${tc.title}`, 'HEADING_4'));
          children.push(new Paragraph({ children: [new TextRun({ text: 'Test Case ID: ', bold: true }), new TextRun(tc.id || '—')] }));
          if (tc.description) children.push(new Paragraph(tc.description));
          children.push(H('Prerequisites', 'HEADING_5'));
          ['Valid API endpoints', 'Required authentication', 'Test data available']
            .forEach(p => children.push(new Paragraph(`• ${p}`)));
          children.push(H('Validation Criteria', 'HEADING_5'));
          [
            'Response status matches expected status',
            'Response format is valid',
            'Data integrity is maintained',
            'Error handling works as expected',
          ].forEach(v => children.push(new Paragraph(`• ${v}`)));
          if (arr(tc.steps).length) {
            children.push(new Paragraph({ children: [B('Steps:')] }));
            tc.steps.forEach((s, i) => children.push(new Paragraph(`${i + 1}. ${s}`)));
          }
          if (tc.expectedResult) {
            children.push(new Paragraph({ children: [B('Expected Result:')] }));
            children.push(new Paragraph(tc.expectedResult));
          }
          const api = tc.apiDetails;
          if (api) {
            children.push(new Paragraph({ children: [B('API Details')] }));
            const headersStr = safeCellValue(JSON.stringify(api.headers || {}, null, 2));
            const bodyStr = safeCellValue(api.body || 'N/A');
            children.push(...tableDocx(
              ['Method', 'Endpoint', 'Headers', 'Body', 'Expected Status'],
              [[
                safeCellValue(api.method),
                safeCellValue(api.endpoint),
                headersStr,
                bodyStr,
                safeCellValue(String(api.expectedStatus ?? '')),
              ]]
            ));
          }
          const meta = [
            tc.severity ? `Severity: ${tc.severity}` : '',
            tc.priority ? `Priority: ${tc.priority}` : '',
          ].filter(Boolean);
          if (meta.length) children.push(new Paragraph(meta.join(' | ')));
        });
      });
      children.push(new Paragraph(''));
    }

    // 5. Risk Assessment
    if (arr(plan.riskAssessment).length) {
      children.push(H('Risk Assessment', 'HEADING_2'));
      children.push(...tableDocx(
        ['Category', 'Description', 'Mitigation', 'Impact'],
        plan.riskAssessment!.map(r => [r.category, r.description, r.mitigation, r.impact])
      ));
      children.push(new Paragraph(''));
    }

    // 6. Deliverables
    if (arr(plan.deliverables).length) {
      children.push(H('Deliverables', 'HEADING_2'));
      children.push(...tableDocx(
        ['Title', 'Description', 'Format', 'Frequency'],
        plan.deliverables!.map(d => [d.title, d.description, d.format, d.frequency])
      ));
      children.push(new Paragraph(''));
    }

    // 7. Success Criteria
    if (arr(plan.successCriteria).length) {
      children.push(H('Success Criteria', 'HEADING_2'));
      children.push(...tableDocx(
        ['Category', 'Criteria', 'Threshold'],
        plan.successCriteria!.map(s => [s.category, s.criteria, s.threshold])
      ));
      children.push(new Paragraph(''));
    }

    // 8. Roles & Responsibilities
    if (arr(plan.rolesAndResponsibility).length) {
      children.push(H('Roles & Responsibilities', 'HEADING_2'));
      children.push(...tableDocx(
        ['Role', 'Responsibility'],
        plan.rolesAndResponsibility!.map(r => [r.role, r.responsibility])
      ));
      children.push(new Paragraph(''));
    }

    // 9. Entry Criteria
    if (arr(plan.entryCriteria).length) {
      children.push(H('Entry Criteria', 'HEADING_2'));
      plan.entryCriteria!.forEach(e => children.push(new Paragraph(`• ${e.description}`)));
      children.push(new Paragraph(''));
    }

    // 10. Exit Criteria
    if (arr(plan.exitCriteria).length) {
      children.push(H('Exit Criteria', 'HEADING_2'));
      plan.exitCriteria!.forEach(e => children.push(new Paragraph(`• ${e.description}`)));
      children.push(new Paragraph(''));
    }

    // 11. Test Execution Strategy
    if (arr(plan.testExecutionStrategy).length) {
      children.push(H('Test Execution Strategy', 'HEADING_2'));
      plan.testExecutionStrategy!.forEach(e => children.push(new Paragraph(`• ${e.description}`)));
      children.push(new Paragraph(''));
    }

    // 12. Test Schedule
    if (arr(plan.testSchedule).length) {
      children.push(H('Test Schedule', 'HEADING_2'));
      plan.testSchedule!.forEach(e => children.push(new Paragraph(`• ${e.description}`)));
      children.push(new Paragraph(''));
    }

    // 13. Tools and Automation Strategy
    if (arr(plan.toolsAndAutomationStrategy).length) {
      children.push(H('Tools and Automation Strategy', 'HEADING_2'));
      plan.toolsAndAutomationStrategy!.forEach(e => children.push(new Paragraph(`• ${e.description}`)));
      children.push(new Paragraph(''));
    }

    // 14. Approvals and Sign-offs
    if (arr(plan.approvalsAndSignoffs).length) {
      children.push(H('Approvals and Sign-offs', 'HEADING_2'));
      plan.approvalsAndSignoffs!.forEach(e => children.push(new Paragraph(`• ${e.description}`)));
      children.push(new Paragraph(''));
    }

    // 15. References
    if (arr(plan.references).length) {
      children.push(H('References', 'HEADING_2'));
      children.push(...tableDocx(
        ['Title', 'URL'],
        plan.references!.map(r => [r.title, r.url])
      ));
      children.push(new Paragraph(''));
    }

    // 16. Test Items
    if (arr(plan.testItems).length) {
      children.push(H('Test Items', 'HEADING_2'));
      children.push(...tableDocx(
        ['ID', 'Description', 'Endpoint', 'Method'],
        plan.testItems!.map(i => [i.id, i.description, i.endpoint, i.method])
      ));
      children.push(new Paragraph(''));
    }

    // 17. Features To Be Tested
    if (arr(plan.featuresToBeTested).length) {
      children.push(H('Features To Be Tested', 'HEADING_2'));
      plan.featuresToBeTested!.forEach(f => children.push(new Paragraph(`• ${f}`)));
      children.push(new Paragraph(''));
    }

    // 18. Features Not To Be Tested
    if (arr(plan.featuresNotToBeTested).length) {
      children.push(H('Features Not To Be Tested', 'HEADING_2'));
      plan.featuresNotToBeTested!.forEach(f => children.push(new Paragraph(`• ${f}`)));
      children.push(new Paragraph(''));
    }

    // 19. Staffing & Training
    if (arr(plan.staffingAndTraining).length) {
      children.push(H('Staffing & Training', 'HEADING_2'));
      children.push(...tableDocx(
        ['Role', 'Skills'],
        plan.staffingAndTraining!.map(s => [s.role, s.skills.join(', ')])
      ));
      children.push(new Paragraph(''));
    }

    // 20. Pass Criteria
    if (arr(plan.passCriteria).length) {
      children.push(H('Pass Criteria', 'HEADING_2'));
      plan.passCriteria!.forEach(p => children.push(new Paragraph(`• ${p}`)));
      children.push(new Paragraph(''));
    }

    // 21. Fail Criteria
    if (arr(plan.failCriteria).length) {
      children.push(H('Fail Criteria', 'HEADING_2'));
      plan.failCriteria!.forEach(f => children.push(new Paragraph(`• ${f}`)));
      children.push(new Paragraph(''));
    }

    // 22. Suspension Criteria
    if (arr(plan.suspensionCriteria).length) {
      children.push(H('Suspension Criteria', 'HEADING_2'));
      plan.suspensionCriteria!.forEach(s => children.push(new Paragraph(`• ${s}`)));
      children.push(new Paragraph(''));
    }

    // 23. Environment Requirements
    if (plan.environmentRequirements) {
      const hw = arr(plan.environmentRequirements.hardware);
      const sw = arr(plan.environmentRequirements.software);
      const max = Math.max(hw.length, sw.length, 1);
      children.push(H('Environment Requirements', 'HEADING_2'));
      children.push(...tableDocx(
        ['Hardware', 'Software', 'Network'],
        Array.from({ length: max }, (_, i) => [
          hw[i] ?? (i === 0 ? '—' : ''),
          sw[i] ?? (i === 0 ? '—' : ''),
          i === 0 ? (plan.environmentRequirements!.network ?? '—') : ''
        ])
      ));
      children.push(new Paragraph(''));
    }

    // 24. Test Data Requirements
    if (arr(plan.testDataRequirements).length) {
      children.push(H('Test Data Requirements', 'HEADING_2'));
      plan.testDataRequirements!.forEach(d => children.push(new Paragraph(`• ${d}`)));
      children.push(new Paragraph(''));
    }

    // 25. Traceability Matrix
    if (plan.traceabilityMatrix && Object.keys(plan.traceabilityMatrix).length) {
      children.push(H('Traceability Matrix', 'HEADING_2'));
      children.push(...tableDocx(
        ['Requirement ID', 'Test Case IDs'],
        Object.entries(plan.traceabilityMatrix).map(([req, tcs]) => [req, tcs.join(', ')])
      ));
      children.push(new Paragraph(''));
    }

    // 26. Negative Scenarios
    if (arr(plan.negativeScenarios).length) {
      children.push(H('Negative Scenarios', 'HEADING_2'));
      plan.negativeScenarios!.forEach(n => children.push(new Paragraph(`• ${n}`)));
      children.push(new Paragraph(''));
    }
  }else if (kind === 'testScenario') {
    // Include Endpoints section for Test Scenarios export (parity with PDF/XLSX)
    const eps = uniqueEndpoints(plan);
    if (eps.length) {
      children.push(H('Endpoints', 'HEADING_2'));
      children.push(...tableDocx(['Endpoint'], eps.map(e => [e])));
      children.push(new Paragraph(''));
    }
    arr(plan.stories).forEach(story => {
      children.push(H(`Test Scenario: ${story.title}`, 'HEADING_2'));
      // Story ID
      children.push(new Paragraph({ children: [new TextRun({ text: 'Story ID: ', bold: true }), new TextRun(story.id || '—')] }));
      if (story.description) children.push(new Paragraph(story.description));

      arr(story.testCases).forEach(tc => {
        children.push(H(tc.title, 'HEADING_3'));
        // Test Case ID and meta
        children.push(new Paragraph({ children: [new TextRun({ text: 'Test Case ID: ', bold: true }), new TextRun(tc.id || '—')] }));
        const meta = [
          tc.severity ? `Severity: ${tc.severity}` : '',
          (tc.priority !== undefined && tc.priority !== null) ? `Priority: ${tc.priority}` : '',
        ].filter(Boolean);
        if (meta.length) children.push(new Paragraph(meta.join(' | ')));
        if (tc.description) children.push(new Paragraph(tc.description));
        // Prerequisites (always above Steps)
        children.push(H('Prerequisites', 'HEADING_4'));
        ['Valid API endpoints', 'Required authentication', 'Test data available']
          .forEach(p => children.push(new Paragraph(`• ${p}`)));
        // Steps
        if (arr(tc.steps).length) {
          children.push(new Paragraph({ children: [B('Steps:')] }));
          tc.steps.forEach((s, i) => children.push(new Paragraph(`${i + 1}. ${s}`)));
        }
        // Expected Outcome
        if (tc.expectedResult) {
          children.push(new Paragraph({ children: [B('Expected Outcome:')] }));
          children.push(new Paragraph(tc.expectedResult));
        }
        // API Details
        if (tc.apiDetails) {
          children.push(new Paragraph({ children: [B('API Details')] }));
          children.push(...tableDocx(
            ['Method', 'Endpoint', 'Headers', 'Body', 'Expected Status'],
            [[
              safeCellValue(tc.apiDetails?.method),
              safeCellValue(tc.apiDetails?.endpoint),
              safeCellValue(JSON.stringify(tc.apiDetails?.headers || {}, null, 2)),
              safeCellValue(tc.apiDetails?.body || 'N/A'),
              safeCellValue(String(tc.apiDetails?.expectedStatus ?? '')),
            ]]
          ));
        }
        // Validation Criteria
        children.push(H('Validation Criteria', 'HEADING_4'));
        [
          'Response status matches expected status',
          'Response format is valid',
          'Data integrity is maintained',
          'Error handling works as expected',
        ].forEach(v => children.push(new Paragraph(`• ${v}`)));
      });
      children.push(new Paragraph(''));
    });
  }else if (kind === 'testCases') {
    const eps = uniqueEndpoints(plan);
    if (eps.length) {
      children.push(H('Endpoints', 'HEADING_2'));
      children.push(...tableDocx(['Endpoint'], eps.map(e => [e])));
      children.push(new Paragraph(''));
    }
    arr(plan.stories).forEach(story => {
      arr(story.testCases).forEach(tc => {
        children.push(H(`Test Case: ${tc.title}`, 'HEADING_2'));
        // Story reference + Test Case ID
        children.push(new Paragraph({ children: [new TextRun({ text: 'Story: ', bold: true }), new TextRun(story.title || '—')] }));
        children.push(new Paragraph({ children: [B('ID: '), new TextRun(tc.id || '—')] }));
        // Severity / Priority
        const meta = [
          tc.severity ? `Severity: ${tc.severity}` : '',
          (tc.priority !== undefined && tc.priority !== null) ? `Priority: ${tc.priority}` : '',
        ].filter(Boolean);
        if (meta.length) children.push(new Paragraph(meta.join(' | ')));
        if (tc.description) children.push(new Paragraph(tc.description));

        // Prerequisites (always above Steps)
        children.push(H('Prerequisites', 'HEADING_4'));
        if (Array.isArray(tc.prerequisites) && tc.prerequisites.length) {
          tc.prerequisites.forEach(p => children.push(new Paragraph(`• ${p}`)));
        } else {
          ['Valid API endpoints', 'Required authentication', 'Test data available']
            .forEach(p => children.push(new Paragraph(`• ${p}`)));
        }

        // Steps
        if (arr(tc.steps).length) {
          children.push(new Paragraph({ children: [B('Steps:')] }));
          tc.steps.forEach((s, i) => children.push(new Paragraph(`${i + 1}. ${s}`)));
        }

        // Validation Criteria
        children.push(H('Validation Criteria', 'HEADING_4'));
        const validationCriteria = Array.isArray(tc.validationCriteria) && tc.validationCriteria.length
          ? tc.validationCriteria
          : [
              'Response status matches expected status',
              'Response format is valid',
              'Data integrity is maintained',
              'Error handling works as expected',
            ];
        validationCriteria.forEach(v => children.push(new Paragraph(`• ${v}`)));

        // Expected Result
        if (tc.expectedResult) {
          children.push(new Paragraph({ children: [B('Expected Result:')] }));
          children.push(new Paragraph(tc.expectedResult));
        }

        // API Details
        if (tc.apiDetails) {
          children.push(...tableDocx(
            ['Method', 'Endpoint', 'Headers', 'Body', 'Expected Status'],
            [[
              safeCellValue(tc.apiDetails?.method),
              safeCellValue(tc.apiDetails?.endpoint),
              safeCellValue(JSON.stringify(tc.apiDetails?.headers || {}, null, 2)),
              safeCellValue(tc.apiDetails?.body || 'N/A'),
              safeCellValue(String(tc.apiDetails?.expectedStatus ?? ''))
            ]]
          ));
        }
        children.push(new Paragraph(''));
      });
    });
  }
  // No page number footer or pagination in Word export (explicitly required)
  const doc = new Document({
    sections: [{
      children
    }]
  });
  return Packer.toBlob(doc);
}

// ---------- PDF (uses jsPDF you already import) ----------
// Draws a styled table in jsPDF with cell borders, word wrapping, header repeat, and page breaks

// PDF Table helper using jsPDF-AutoTable
function renderPdfTable(
  pdf: jsPDF,
  {
    startY,
    head,
    body,
    widths: _widths,
    theme = 'grid',
    fontSize = 10,
    headFontSize = 10,
  }: {
    startY: number;
    head: string[];
    body: RowInput[];
    widths: number[];
    theme?: UserOptions['theme'];
    fontSize?: number;
    headFontSize?: number;
  }
): number {
  // Always preserve full content but break long continuous tokens so autoTable can wrap
  const processCell = (cell: any) => {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'string') return breakLongSegments(cell, 100);
    try {
      return breakLongSegments(JSON.stringify(cell), 100);
    } catch (e) {
      return breakLongSegments(String(cell), 100);
    }
  };

  const processRow = (row: RowInput) => (Array.isArray(row) ? row.map(processCell) : [processCell(row)]);

  // Compute dynamic column widths and shrink-to-fit
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20; // mm
  const maxTableWidth = pageWidth - margin * 2;

  // Prefer explicit widths passed in when valid
  const useProvidedWidths = Array.isArray(_widths) && _widths.length === head.length && _widths.every(n => typeof n === 'number' && !isNaN(n) && n > 0);

  const columns = head.map(h => ({
    header: String(h || '').toLowerCase(),
    isTextHeavy: String(h || '').toLowerCase().includes('url') || String(h || '').toLowerCase().includes('endpoint') || String(h || '').toLowerCase().includes('payload') || String(h || '').toLowerCase().includes('body') || String(h || '').toLowerCase().includes('headers') || String(h || '').toLowerCase().includes('description')
  }));

  // Improved dynamic column widths and shrink-to-fit
  let colWidths: number[] = [];
  const MAX_TEXT_COL = 60; // mm, clamp for text-heavy columns
  const MIN_CELL = 20; // mm, minimum cell width
  if (head.length === 1) {
  // Special case: single-column table should take full width (like DOCX)
  colWidths = [maxTableWidth];
} else if (head.length === 2) {
  // Special case: two-column table, split width 40%/60%
  colWidths = [Math.round(maxTableWidth * 0.4), Math.round(maxTableWidth * 0.6)];
} else if (useProvidedWidths) {
    // Use provided relative weights, scale to fit maxTableWidth
    const totalWeight = _widths.reduce((a, b) => a + b, 0);
    colWidths = _widths.map((w, i) => {
      // Clamp text-heavy columns
      const base = (w / totalWeight) * maxTableWidth;
      return columns[i].isTextHeavy ? Math.min(base, MAX_TEXT_COL) : Math.max(base, MIN_CELL);
    });
    // If sum > maxTableWidth, shrink all proportionally
    const sum = colWidths.reduce((a, b) => a + b, 0);
    if (sum > maxTableWidth) {
      colWidths = colWidths.map(w => Math.max(MIN_CELL, w * (maxTableWidth / sum)));
    }
  } else {
    // Heuristic: give more width to text-heavy columns
    const base = 1;
    const weights = columns.map(col => col.isTextHeavy ? 3 : base);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    colWidths = weights.map((w, i) => {
      const base = (w / totalWeight) * maxTableWidth;
      return columns[i].isTextHeavy ? Math.min(base, MAX_TEXT_COL) : Math.max(base, MIN_CELL);
    });
    // If sum > maxTableWidth, shrink all proportionally
    const sum = colWidths.reduce((a, b) => a + b, 0);
    if (sum > maxTableWidth) {
      colWidths = colWidths.map(w => Math.max(MIN_CELL, w * (maxTableWidth / sum)));
    }
  }

  // Always wrap text, ensure row height adapts
  const columnStyles: any = {};
  columns.forEach((col, i) => {
    columnStyles[i] = {
      cellWidth: colWidths[i],
      minCellWidth: MIN_CELL,
      maxCellWidth: col.isTextHeavy ? MAX_TEXT_COL : colWidths[i],
      valign: 'top',
      halign: 'left',
      cellPadding: 2,
      overflow: 'linebreak', // always wrap
    };
  });

  const runAutoTable = (
    pdfInstance: jsPDF,
    chunkBody: RowInput[],
    startYVal: number,
    usedFontSize: number,
    usedHeadFontSize: number
  ) => {
    autoTable(pdfInstance, {
      startY: startYVal,
      theme,
      head: [head],
      body: chunkBody as RowInput[],
      styles: {
        font: 'courier',
        fontSize: usedFontSize,
        overflow: 'linebreak',
        cellPadding: 4,
        halign: 'left',
        valign: 'top',
      },
      headStyles: {
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: usedHeadFontSize,
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        halign: 'left',
        valign: 'top',
      },
      columnStyles,
      margin: { left: margin / 2, right: margin / 2, top: 10, bottom: 10 },
      didParseCell: (data) => {
        if (data.cell && typeof data.cell.raw === 'string') {
          (data.cell.styles as any).cellPadding = 4;
        }
      }
    });
  };

  if (!body || (Array.isArray(body) && body.length === 0)) return startY;

  const processedBody = (body as RowInput[]).map(processRow);
  let currentY = startY;
  const DEFAULT_MAX_ROWS_PER_TABLE = Number.MAX_SAFE_INTEGER;
  let rowsPerTable = DEFAULT_MAX_ROWS_PER_TABLE;

  try {
    for (let i = 0; i < processedBody.length; i += rowsPerTable) {
      const chunk = processedBody.slice(i, i + rowsPerTable);
      runAutoTable(pdf, chunk, currentY, fontSize, headFontSize);
      // Use unified spacer helper to provide consistent spacing after PDF tables
      currentY = addTableSpacer('pdf', { pdf, currentY });
    }
    return addTableSpacer('pdf', { pdf, currentY });
  } catch (err) {
    try {
      rowsPerTable = Math.max(10, Math.floor(rowsPerTable / 2));
      for (let i = 0; i < processedBody.length; i += rowsPerTable) {
        const chunk = processedBody.slice(i, i + rowsPerTable);
        runAutoTable(pdf, chunk, currentY, Math.max(8, fontSize - 2), Math.max(8, headFontSize - 2));
        currentY = addTableSpacer('pdf', { pdf, currentY });
      }
      return addTableSpacer('pdf', { pdf, currentY });
    } catch (err2) {
      throw err2;
    }
  }
}


function drawTextBlock(pdf: jsPDF, text: string, cursor: { y: number }, step: number = 7) {
  const lines: string[] = pdf.splitTextToSize(text, 180);
  lines.forEach((ln: string) => {
    if (cursor.y > 280) {
      pdf.addPage();
      cursor.y = 10;
    }
    pdf.text(ln, 10, cursor.y);
    cursor.y += step;
  });
}


async function buildPdfBlob(kind: ArtifactKind, plan: TestPlan): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cursor = { y: 10 };

  const H = (txt: string, size: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(size);
    drawTextBlock(pdf, txt, cursor, 8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    cursor.y += 2;
  };

  // Title logic: only show if plan.title is non-empty
  const prefix =
    kind === 'testPlan'     ? 'Test Plan' :
    kind === 'testScenario' ? 'Test Scenarios' :
    kind === 'testCases'    ? 'Test Cases' : '';
  const title = plan.title ? `${prefix}: ${plan.title}` : '';
  if (title) H(title, 18);

  if (kind === 'testPlan' && plan.description) {
    H('Overview', 14);
    drawTextBlock(pdf, plan.description, cursor);
    cursor.y += 2;
  }

  const eps = uniqueEndpoints(plan);
  if (eps.length) {
    H('Endpoints', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Endpoint'],
      body: eps.map(e => [e]),
      widths: [1],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  if (arr(plan.stories).length) {
    H('Stories', 14);
    plan.stories.forEach((story) => {
      H(story.title || 'Story', 13);
      // Show Story ID under heading
      drawTextBlock(pdf, `Story ID: ${story.id ?? '—'}`, cursor);
      if (story.description) drawTextBlock(pdf, story.description, cursor);

      arr(story.testCases).forEach((tc) => {
        H(`Test Case: ${tc.title}`, 12);
        // Show Test Case ID under heading
        drawTextBlock(pdf, `TC ID: ${tc.id ?? '—'}`, cursor);
        if (tc.description) drawTextBlock(pdf, tc.description, cursor);

        // Prerequisites always above Steps
        H('Prerequisites', 12);
        if (Array.isArray(tc.prerequisites) && tc.prerequisites.length) {
          tc.prerequisites.forEach(p => drawTextBlock(pdf, `• ${p}`, cursor));
        } else {
          ['Valid API endpoints', 'Required authentication', 'Test data available']
            .forEach(p => drawTextBlock(pdf, `• ${p}`, cursor));
        }
        H('Validation Criteria', 12);
        const validationCriteria = Array.isArray(tc.validationCriteria) && tc.validationCriteria.length
          ? tc.validationCriteria
          : [
              'Response status matches expected status',
              'Response format is valid',
              'Data integrity is maintained',
              'Error handling works as expected',
            ];
        validationCriteria.forEach(v => drawTextBlock(pdf, `• ${v}`, cursor));
        if (arr(tc.steps).length) {
          drawTextBlock(pdf, 'Steps:', cursor);
          tc.steps.forEach((s, i) => drawTextBlock(pdf, `${i + 1}. ${s}`, cursor));
        }
        if (tc.expectedResult) {
          drawTextBlock(pdf, 'Expected Result:', cursor);
          drawTextBlock(pdf, tc.expectedResult, cursor);
        }
        const api = tc.apiDetails;
        if (api) {
          H('API Details:', 12);
          cursor.y = renderPdfTable(pdf, {
            startY: cursor.y,
            head: ['Method', 'Endpoint', 'Headers', 'Body', 'Expected Status'],
            body: [[
              api.method ?? '',
              api.endpoint ?? '',
              JSON.stringify(api.headers || {}, null, 2),
              api.body || 'N/A',
              String(api.expectedStatus ?? ''),
            ]],
            widths: [1, 4, 2, 2, 1],
            theme: 'grid',
            fontSize: 10,
            headFontSize: 10,
          });
        }
        const meta = [
          tc.severity ? `Severity: ${tc.severity}` : '',
          tc.priority ? `Priority: ${tc.priority}` : '',
        ].filter(Boolean);
        if (meta.length) drawTextBlock(pdf, meta.join(' | '), cursor);
        cursor.y += 2;
      });
      cursor.y += 2;
    });
  }

  // Risk Assessment Table
  if (kind === 'testPlan' && arr(plan.riskAssessment).length) {
    H('Risk Assessment', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Category', 'Description', 'Mitigation', 'Impact'],
      body: plan.riskAssessment!.map(r => [r.category, r.description, r.mitigation, r.impact]),
      widths: [1, 4, 3, 1],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Deliverables Table
  if (kind === 'testPlan' && arr(plan.deliverables).length) {
    H('Deliverables', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Title', 'Description', 'Format', 'Frequency'],
      body: plan.deliverables!.map(d => [d.title, d.description, d.format, d.frequency]),
      widths: [1, 2, 1, 1],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Success Criteria Table
  if (kind === 'testPlan' && arr(plan.successCriteria).length) {
    H('Success Criteria', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Category', 'Criteria', 'Threshold'],
      body: plan.successCriteria!.map(s => [s.category, s.criteria, s.threshold]),
      widths: [1, 4, 1],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Roles & Responsibilities Table
  if (kind === 'testPlan' && arr(plan.rolesAndResponsibility).length) {
    H('Roles & Responsibilities', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Role', 'Responsibility'],
      body: plan.rolesAndResponsibility!.map(r => [r.role, r.responsibility]),
      widths: [1, 2],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // References Table
  if (kind === 'testPlan' && arr(plan.references).length) {
    H('References', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Title', 'URL'],
      body: plan.references!.map(r => [r.title, r.url]),
      widths: [1, 2],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Test Items Table
  if (kind === 'testPlan' && arr(plan.testItems).length) {
    H('Test Items', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['ID', 'Description', 'Endpoint', 'Method'],
      body: plan.testItems!.map(i => [i.id, i.description, i.endpoint, i.method]),
      widths: [1, 2, 2, 1],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Environment Requirements Table
  if (kind === 'testPlan' && plan.environmentRequirements) {
    const hw = arr(plan.environmentRequirements.hardware);
    const sw = arr(plan.environmentRequirements.software);
    const max = Math.max(hw.length, sw.length, 1);
    H('Environment Requirements', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Hardware', 'Software', 'Network'],
      body: Array.from({ length: max }, (_, i) => [
        hw[i] ?? (i === 0 ? '—' : ''),
        sw[i] ?? (i === 0 ? '—' : ''),
        i === 0 ? (plan.environmentRequirements!.network ?? '—') : ''
      ]),
      widths: [1, 1, 2],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Traceability Matrix Table
  if (kind === 'testPlan' && plan.traceabilityMatrix && Object.keys(plan.traceabilityMatrix).length) {
    H('Traceability Matrix', 14);
    cursor.y = renderPdfTable(pdf, {
      startY: cursor.y,
      head: ['Requirement ID', 'Test Case IDs'],
      body: Object.entries(plan.traceabilityMatrix).map(([req, tcs]) => [req, tcs.join(', ')]),
      widths: [1, 2],
      theme: 'grid',
      fontSize: 10,
      headFontSize: 10,
    });
  }

  // Add missing Test Plan sections for PDF parity
  if (kind === 'testPlan') {
    if ((plan.featuresToBeTested ?? []).length) {
      H('Features To Be Tested', 14);
      cursor.y = renderPdfTable(pdf, {
        startY: cursor.y, head: ['Feature'],
        body: (plan.featuresToBeTested ?? []).map(f => [f]), widths: [1], theme: 'grid', fontSize: 10, headFontSize: 10
      });
    }
    if ((plan.featuresNotToBeTested ?? []).length) {
      H('Features Not To Be Tested', 14);
      cursor.y = renderPdfTable(pdf, {
        startY: cursor.y, head: ['Feature'],
        body: (plan.featuresNotToBeTested ?? []).map(f => [f]), widths: [1], theme: 'grid', fontSize: 10, headFontSize: 10
      });
    }
    if ((plan.staffingAndTraining ?? []).length) {
      H('Staffing & Training', 14);
      cursor.y = renderPdfTable(pdf, {
        startY: cursor.y, head: ['Role','Skills'],
        body: plan.staffingAndTraining!.map(s => [s.role, (s.skills ?? []).join(', ')]),
        widths: [1,2], theme: 'grid', fontSize: 10, headFontSize: 10
      });
    }
    const listBlock = (title: string, items?: string[]) => {
      if ((items ?? []).length) {
        H(title, 14);
        cursor.y = renderPdfTable(pdf, {
          startY: cursor.y, head: ['Item'], body: items!.map(i => [i]), widths: [1], theme: 'grid', fontSize: 10, headFontSize: 10
        });
      }
    };
    // Parity lists also present in DOCX/XLSX:
    listBlock('Entry Criteria', (plan.entryCriteria ?? []).map(e => e.description));
    listBlock('Exit Criteria', (plan.exitCriteria ?? []).map(e => e.description));
    listBlock('Test Execution Strategy', (plan.testExecutionStrategy ?? []).map(e => e.description));
    listBlock('Test Schedule', (plan.testSchedule ?? []).map(e => e.description));
    listBlock('Tools & Automation Strategy', (plan.toolsAndAutomationStrategy ?? []).map(e => e.description));
    listBlock('Approvals & Sign-offs', (plan.approvalsAndSignoffs ?? []).map(e => e.description));
    listBlock('Pass Criteria', plan.passCriteria);
    listBlock('Fail Criteria', plan.failCriteria);
    listBlock('Suspension Criteria', plan.suspensionCriteria);
    listBlock('Test Data Requirements', plan.testDataRequirements);
    listBlock('Negative Scenarios', plan.negativeScenarios);
  }

  // No page number footer or pagination in PDF export (explicitly required)
  return pdf.output('blob');
}



async function buildXlsxBlob(kind: ArtifactKind, plan: TestPlan): Promise<Blob> {
  // Dynamically import browser build (use minified for browser reliability)
  const { default: XlsxPopulate } = await import("xlsx-populate/browser/xlsx-populate.min.js");
  // Helpers for parity
  const addListSheet = (wb: any, name: string, header: string, items?: string[]) => {
    const rows = (items ?? []).map(v => [v === null || v === undefined ? '' : String(v)]);
    if (rows.length) addSheet(wb, name, [header], rows);
  };
  const addPairsSheet = (wb: any, name: string, headers: string[], rows: (string | number | undefined)[][]) => {
    if (rows.length) addSheet(wb, name, headers, rows.map(r => r.map(c => c === null || c === undefined ? '' : String(c))));
  };
  const wb = await XlsxPopulate.fromBlankAsync();

  const addSheet = (wbInstance: any, name: string, headers: string[], rows: (string | number | undefined)[][]) => {
    // Sheet name max 31 chars
    const baseName = (name || "Sheet").slice(0, 31);

    // Do not truncate cell content; insert line breaks into long segments so Excel will wrap
    const normRows = rows.map(r => r.map(c => c === null || c === undefined ? '' : breakLongSegments(String(c), 100)));

    const totalRows = normRows.length;
    // If no data, still create or reuse a sheet and write headers only
    if (totalRows === 0) {
      let sheet: any;
      const firstSheet = wbInstance.sheets()[0];
      const firstUsed = (firstSheet && typeof firstSheet.usedRange === 'function') ? firstSheet.usedRange() : null;
      if (wbInstance.sheets().length === 1 && (!firstUsed || firstUsed === null)) {
        sheet = firstSheet;
        try { sheet.name(baseName); } catch (e) { /* ignore rename failures */ }
      } else {
        sheet = wbInstance.addSheet(baseName.slice(0,31));
      }
      try {
        sheet.cell(1, 1).value([headers]);
        try { sheet.freezePanes(2, 1); if (headers.length > 0) sheet.autoFilter(sheet.range(`A1:${colLetter(headers.length)}1`)); } catch(e){}
      } catch (e) {}
      return sheet;
    }

    let part = 1;
    for (let i = 0; i < normRows.length; i += XLSX_MAX_ROWS_PER_SHEET) {
      const chunk = normRows.slice(i, i + XLSX_MAX_ROWS_PER_SHEET);
      const sheetName = (totalRows > XLSX_MAX_ROWS_PER_SHEET) ? `${baseName}_${part}`.slice(0,31) : baseName.slice(0,31);

      let sheet: any;
      const firstSheet = wbInstance.sheets()[0];
      const firstUsed = (firstSheet && typeof firstSheet.usedRange === 'function') ? firstSheet.usedRange() : null;

      // Reuse the initial blank sheet for the very first chunk only when workbook is empty
      if (part === 1 && wbInstance.sheets().length === 1 && (!firstUsed || firstUsed === null)) {
        sheet = firstSheet;
        try { sheet.name(sheetName); } catch (e) { /* ignore rename failures */ }
      } else {
        sheet = wbInstance.addSheet(sheetName);
      }

      const data = [headers, ...chunk];
      try {
        sheet.cell(1, 1).value(data);
      } catch (e) {
        // Some environments may be restrictive; try fallback
        try { sheet.cell(1,1).value([headers]); for (let r = 0; r < chunk.length; r++) sheet.cell(r+2,1).value(chunk[r]); } catch (e2) { }
      }

      // Auto column sizing heuristic: compute max characters per column
      try {
        const colCount = headers.length || (data[0] || []).length;
        const maxChars = new Array(colCount).fill(0);
        for (let r = 0; r < data.length; r++) {
          const row = data[r] as any[];
          for (let c = 0; c < colCount; c++) {
            const cellText = String((row && row[c]) ?? '');
            maxChars[c] = Math.max(maxChars[c] || 0, cellText.split('\n').reduce((acc, ln) => Math.max(acc, ln.length), 0));
          }
        }
        for (let c = 0; c < maxChars.length; c++) {
          const wch = Math.min(50, Math.max(8, Math.ceil(maxChars[c] * 1.2)));
          try { sheet.column(c + 1).width(wch); } catch (e) { }
        }
      } catch (e) { }

      // Style headers
      try {
        const headerRange = sheet.range(1, 1, 1, headers.length);
        headerRange.style({ bold: true, fill: "D9E1F2", horizontalAlignment: "left", verticalAlignment: "top" });
        headerRange.style({ border: { style: "thin", color: "D0D0D0" } });
      } catch (e) { }

      // Body styling, wrapText and alternating row fill
      const lastRow = chunk.length + 1;
      if (lastRow >= 2) {
        try {
          const bodyRange = sheet.range(2, 1, lastRow, headers.length);
          bodyRange.style({ wrapText: true, verticalAlignment: "top" });
          bodyRange.style({ border: { style: "thin", color: "E0E0E0" } });
        } catch (e) { }

        for (let r = 2; r <= lastRow; r++) {
          try {
            const rowVals = sheet.row(r).value();
            const cells = Array.isArray(rowVals) ? rowVals : [rowVals];
            let maxLines = 1;
            for (let ci = 0; ci < cells.length; ci++) {
              try {
                const cellText = String(cells[ci] ?? '');
                const lines = cellText.split('\n').length;
                maxLines = Math.max(maxLines, lines);
                // Monospace font for text-heavy columns
                if (/url|endpoint|payload|body|headers|description/i.test(headers[ci])) {
                  sheet.cell(r, ci + 1).style({ fontFamily: 'Consolas' });
                } else {
                  sheet.cell(r, ci + 1).style({ fontFamily: 'Calibri' });
                }
                // Padding for all cells
                sheet.cell(r, ci + 1).style({ left: 4, right: 4, top: 4, bottom: 4 });
              } catch (e) { }
            }
            try { sheet.row(r).height(Math.max(15, 15 * maxLines)); } catch (e) { }
            if (r % 2 === 0) try { sheet.row(r).style({ fill: "F7F7F7" }); } catch (e) { }
          } catch (e) { }
        }
      }

      try {
        sheet.freezePanes(2, 1);
        if (headers.length > 0) sheet.autoFilter(sheet.range(`A1:${colLetter(headers.length)}1`));
      } catch (err) {
        // ignore sheet styling failures in some browsers/environments
      }
      // Ensure a blank row separates tables in Excel exports
      try { addTableSpacer('xlsx', { sheet, lastRow }); } catch (e) { /* ignore */ }

      part++;
    }
    return wbInstance.sheet(baseName);
  };

  // Overview (testPlan only)
  if (kind === "testPlan") {
    addSheet(wb, "Overview", ["Title", "Description"], [[safeCellValue(plan.title || ""), safeCellValue(plan.description || "")]]);
  }

  // Endpoints
  const eps = uniqueEndpoints(plan);
  if (eps.length) {
    addSheet(wb, "Endpoints", ["Endpoint"], eps.map(e => [safeCellValue(e)]));
  }

  // Stories
  if ((plan.stories || []).length) {
    addSheet(wb, "Stories", ["Story Title", "Story ID", "Description", "# Test Cases"], plan.stories!.map(s => [safeCellValue(s.title), safeCellValue(s.id), safeCellValue(s.description || ""), (s.testCases || []).length]));
  }

  // TestCases (wrap long text)
  const tcRows: (string | number | undefined)[][] = [];
  (plan.stories || []).forEach(s =>
    (s.testCases || []).forEach(tc => {
      tcRows.push([
        safeCellValue(s.title),
        safeCellValue(tc.title),
        safeCellValue(tc.id),
        safeCellValue(tc.description || ""),
        safeCellValue(tc.apiDetails?.method || ""),
        safeCellValue(tc.apiDetails?.endpoint || ""),
        safeCellValue(JSON.stringify(tc.apiDetails?.headers || {}, null, 2)),
        safeCellValue(tc.apiDetails?.body || "N/A"),
        safeCellValue(tc.apiDetails?.expectedStatus ?? ""),
        // Prerequisites (always above Steps)
        safeCellValue(['Valid API endpoints', 'Required authentication', 'Test data available'].join("\n")),
        // Steps
        safeCellValue((tc.steps || []).join("\n")),
        // Validation Points
        safeCellValue([
          `Status code should be ${tc.apiDetails?.expectedStatus ?? ''}`,
          'Response format should match API specification',
          'Error handling should be implemented',
          'Data integrity should be maintained',
        ].join("\n")),
        safeCellValue(tc.expectedResult || ""),
        safeCellValue(tc.severity || ""),
        safeCellValue(tc.priority ?? ""),
      ]);
    })
  );
  // Only add the detailed "TestCases" sheet for full test plans — skip when exporting testScenario Excel (Scenarios sheet will be used instead)
  if (kind !== "testScenario" && tcRows.length) {
    addSheet(wb, "TestCases", ["Story", "Test Case", "TC ID", "Description", "Method", "Endpoint", "Headers", "Body", "Expected Status", "Prerequisites", "Steps", "Validation Criteria", "Expected Result", "Severity", "Priority"], tcRows);
  }
  // Add all missing Test Plan sections as sheets
  if (kind === "testPlan") {
    addPairsSheet(wb, "Deliverables",
      ["Title", "Description", "Format", "Frequency"],
      (plan.deliverables ?? []).map(d => [d.title, d.description, d.format, d.frequency])
    );
    addPairsSheet(wb, "SuccessCriteria",
      ["Category", "Criteria", "Threshold"],
      (plan.successCriteria ?? []).map(s => [s.category, s.criteria, s.threshold])
    );
    addPairsSheet(wb, "RolesResponsibilities",
      ["Role", "Responsibility"],
      (plan.rolesAndResponsibility ?? []).map(r => [r.role, r.responsibility])
    );
    addPairsSheet(wb, "References",
      ["Title", "URL"],
      (plan.references ?? []).map(r => [r.title, r.url])
    );
    addPairsSheet(wb, "TestItems",
      ["ID", "Description", "Endpoint", "Method"],
      (plan.testItems ?? []).map(i => [i.id, i.description, i.endpoint, i.method])
    );
    addListSheet(wb, "FeaturesToBeTested", "Feature", plan.featuresToBeTested ?? []);
    addListSheet(wb, "FeaturesNotToBeTested", "Feature", plan.featuresNotToBeTested ?? []);
    addPairsSheet(wb, "StaffingAndTraining",
      ["Role", "Skills"],
      (plan.staffingAndTraining ?? []).map(s => [s.role, (s.skills ?? []).join(", ")])
    );
    addListSheet(wb, "PassCriteria", "Criteria", plan.passCriteria ?? []);
    addListSheet(wb, "FailCriteria", "Criteria", plan.failCriteria ?? []);
    addListSheet(wb, "SuspensionCriteria", "Criteria", plan.suspensionCriteria ?? []);
    addListSheet(wb, "TestDataRequirements", "Requirement", plan.testDataRequirements ?? []);
    addListSheet(wb, "NegativeScenarios", "Scenario", plan.negativeScenarios ?? []);
    addListSheet(wb, "EntryCriteria", "Description", (plan.entryCriteria ?? []).map(e => e.description));
    addListSheet(wb, "ExitCriteria", "Description", (plan.exitCriteria ?? []).map(e => e.description));
    addListSheet(wb, "TestExecutionStrategy", "Description", (plan.testExecutionStrategy ?? []).map(e => e.description));
    addListSheet(wb, "TestSchedule", "Description", (plan.testSchedule ?? []).map(e => e.description));
    addListSheet(wb, "ToolsAndAutomation", "Description", (plan.toolsAndAutomationStrategy ?? []).map(e => e.description));
    addListSheet(wb, "ApprovalsAndSignoffs", "Description", (plan.approvalsAndSignoffs ?? []).map(e => e.description));
    // Environment Requirements (multi-row)
    if (plan.environmentRequirements) {
      const hw = arr(plan.environmentRequirements.hardware);
      const sw = arr(plan.environmentRequirements.software);
      const max = Math.max(hw.length, sw.length, 1);
      const rows = Array.from({ length: max }, (_, i) => [
        hw[i] ?? (i === 0 ? "—" : ""),
        sw[i] ?? (i === 0 ? "—" : ""),
        i === 0 ? (plan.environmentRequirements!.network ?? "—") : ""
      ]);
      addPairsSheet(wb, "EnvironmentRequirements", ["Hardware", "Software", "Network"], rows);
    }
  }
  // Scenarios sheet for testScenario (Prerequisites above Steps)
  if (kind === "testScenario" && (plan.stories || []).length) {
    const rows: (string | number | undefined)[][] = [];
    (plan.stories || []).forEach(story =>
      (story.testCases || []).forEach(tc => {
        rows.push([
          safeCellValue(story.title),
          safeCellValue(story.id || ""),
          safeCellValue(tc.title),
          safeCellValue(tc.id || ""),
          safeCellValue(tc.description || ""),
          // Prerequisites (always above Steps)
          safeCellValue(['Valid API endpoints','Required authentication','Test data available'].join("\n")),
          safeCellValue((tc.steps || []).join("\n")),
          safeCellValue(tc.expectedResult || ""),
          safeCellValue(tc.apiDetails?.method || ""),
          safeCellValue(tc.apiDetails?.endpoint || ""),
          safeCellValue(tc.apiDetails?.expectedStatus ?? ""),
          // Validation
          safeCellValue(
            Array.isArray(tc.validationCriteria) && tc.validationCriteria.length
              ? tc.validationCriteria.join("\n")
              : [
                  'Response status matches expected status',
                  'Response format is valid',
                  'Data integrity is maintained',
                  'Error handling works as expected',
                ].join("\n")
          ),
          // Severity & Priority for parity
          safeCellValue(tc.severity || ""),
          safeCellValue(tc.priority ?? ""),
        ]);
      })
    );
    if (rows.length) {
      addSheet(wb, "Scenarios", ["Story", "Story ID", "Scenario", "TC ID", "Description", "Prerequisites", "Steps", "Expected Outcome", "Method", "Endpoint", "Expected Status", "Validation Criteria", "Severity", "Priority"], rows);
    }
  }

  // Risk (testPlan)
  if (kind === "testPlan" && (plan.riskAssessment || []).length) {
    addSheet(wb, "Risk", ["Category", "Description", "Mitigation", "Impact"], plan.riskAssessment!.map(r => [safeCellValue(r.category), safeCellValue(r.description), safeCellValue(r.mitigation), safeCellValue(r.impact)]));
  }

  // Traceability (testPlan)
  if (kind === "testPlan" && plan.traceabilityMatrix && Object.keys(plan.traceabilityMatrix).length) {
    addSheet(wb, "Traceability", ["Requirement ID", "Test Case IDs"], Object.entries(plan.traceabilityMatrix).map(([req, tcs]) => [safeCellValue(req), safeCellValue(tcs.join(", "))]));
  }

  // Return blob (no footer, no page number, no pagination in Excel export as required)
  const ab = await wb.outputAsync();
  return new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// Ensure formatPayload is defined before extractApiEndpoints to avoid ReferenceError
function formatPayload(payload: any): string {
  if (payload === undefined || payload === null) return '';
  try {
    if (typeof payload === 'string') {
      const s = payload.trim();
      // If it looks like JSON, pretty-print it for display
      if (s.startsWith('{') || s.startsWith('[')) {
        const parsed = JSON.parse(s);
        return JSON.stringify(parsed, null, 2);
      }
      return payload;
    }
    // For non-string payloads, stringify with indentation
    return JSON.stringify(payload, null, 2);
  } catch (err) {
    // If parsing fails, fall back to string representation
    return typeof payload === 'string' ? payload : String(payload);
  }
}

  const handleGenerate = async () => {
    try {
      // initialize to avoid use-before-assigned errors
      let fileBlob: Blob | undefined = undefined;
      let filename: string | undefined = undefined;

      if (!file || !selectedType || !selectedFormat) {
        return;
      }

      setStatus('processing');
      setFunnyMessage('Grab a cup of tea or coffee and relax while we prepare your file. This might take a moment! ☕😊');

      const fileContent = await file.text();

      let harEntries;
      try {
        harEntries = parseHarFile(fileContent);
      } catch (parseErr: any) {
        throw new Error('no valid endpoints');
      }

      if (!Array.isArray(harEntries) || harEntries.length === 0) {
        throw new Error('no valid endpoints');
      }

      const generatedTestPlan = await generateTestPlan(harEntries, selectedType, (percent) => {
        setProgress(percent);
        setFunnyMessage(getFunnyMessage(percent));
      });

      if (!generatedTestPlan || !generatedTestPlan.stories || !Array.isArray(generatedTestPlan.stories) || generatedTestPlan.stories.length === 0) {
        throw new Error('no valid endpoints');
      }

      setTestPlan(generatedTestPlan);
      setProgress(100);

      const content = generateContent(selectedType, generatedTestPlan);

      // Build export blob
      try {
        if (selectedType === 'code') {
          fileBlob = new Blob([content], { type: 'text/typescript' });
          filename = `generated-${selectedType}.spec.ts`;
        } else if (selectedFormat === 'md') {
          fileBlob = new Blob([content], { type: 'text/markdown' });
          filename = `generated-${selectedType}.md`;
        } else if (selectedFormat === 'txt') {
          fileBlob = new Blob([content], { type: 'text/plain' });
          filename = `generated-${selectedType}.txt`;
        } else if (selectedFormat === 'pdf') {
          fileBlob = await buildPdfBlob(selectedType, generatedTestPlan);
          filename = `generated-${selectedType}.pdf`;
        } else if (selectedFormat === 'xlsx') {
          fileBlob = await buildXlsxBlob(selectedType, generatedTestPlan);
          filename = `generated-${selectedType}.xlsx`;
        } else if (selectedFormat === 'docx') {
                   fileBlob = await buildDocxBlob(selectedType, generatedTestPlan);
          filename = `generated-${selectedType}.docx`;
        } else {
          throw new Error('Invalid selected format.');
        }
      } catch (exportErr) {
        throw exportErr;
      }

      // If blob created, trigger download
      try {
        if (fileBlob) {
          const downloadUrl = URL.createObjectURL(fileBlob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename ?? 'generated-artifact';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          try { URL.revokeObjectURL(downloadUrl); } catch (revokeErr) { }
          setStatus('success');
        } else {
          if (generatedTestPlan) {
            setStatus('success');
          } else {
            setStatus('error');
          }
        }
      } catch (downloadErr) {
        setStatus('error');
        setErrorMessage('Failed to download the generated artifact. Check console for details.');
        setShowErrorModal(true);
      }

      // Save to history
      setHistory(prevHistory => [...prevHistory, { file, testPlan: generatedTestPlan, selectedType, apiEndpoints, status }]);

    } catch (error: any) {
      setStatus('error');
      let showEndpointsError = false;
      let showConfigError = false;
      if (error && typeof error.message === 'string') {
        if (error.message.includes('no valid endpoints')) {
          showEndpointsError = true;
        } else {
          const match = error.message.match(/\b[45]\d\d\b/);
          if (match) {
            showConfigError = true;
          } else if (error.response && typeof error.response.status === 'number' && error.response.status >= 400 && error.response.status < 600) {
            showConfigError = true;
          }
        }
      }
      if (showEndpointsError) {
        setErrorMessage('Cannot generate artifact: No API endpoints found or Endpoint Body needs more token then model configured.\n\nPlease upload a valid HAR or Postman Collection file containing at least one API endpoint or valid content length   to generate test artifacts.');
      } else if (showConfigError) {
        setErrorMessage('There seems to be an OpenAI configuration or model setup issue. Please check your settings and try again.');
      } else {
        setErrorMessage('There seems to be an OpenAI configuration or model setup issue. Please check your settings and try again.');
      }
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
- Prerequisites:
  - Valid API endpoints
  - Required authentication
  - Test data available
- Steps:
${tc.steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}
- Expected Result: ${tc.expectedResult}
- API Details:
  - Method: ${tc.apiDetails?.method}
  - Endpoint: ${tc.apiDetails?.endpoint}
  - Headers: ${JSON.stringify(tc.apiDetails?.headers || {}, null, 2)}
  - Body: ${tc.apiDetails?.body || 'N/A'}
  - Expected Status: ${tc.apiDetails?.expectedStatus}
- Severity: ${tc.severity}
- Priority: ${tc.priority}
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

## Story ID
${story.id ?? '—'}

## Overview
${story.description ?? ''}

## Scenarios
${story.testCases.map(tc => `
### ${tc.title}
- ID: ${tc.id ?? '—'}
- Story ID: ${story.id ?? '—'}
- Description: ${tc.description ?? ''}
- Severity: ${tc.severity ?? 'N/A'}
- Priority: ${tc.priority ?? 'N/A'}

#### Prerequisites
- Valid API endpoints
- Required authentication
- Test data available

#### Steps
${(tc.steps || []).join('\n')}

#### Expected Outcome
${tc.expectedResult ?? ''}

#### API Details
- Method: ${tc.apiDetails?.method ?? ''}
- Endpoint: ${tc.apiDetails?.endpoint ?? ''}
- Expected Status: ${tc.apiDetails?.expectedStatus ?? ''}

#### Validation Criteria
- Response status matches expected status
- Response format is valid
- Data integrity is maintained
- Error handling works as expected
`).join('\n')}`).join('\n');

      case 'testCases':
        return testPlan.stories.map(story => story.testCases.map(tc => `
# Test Case: ${tc.title}

- Story: ${story.title}
- ID: ${tc.id ?? '—'}
- Severity: ${tc.severity ?? 'N/A'}
- Priority: ${tc.priority ?? 'N/A'}

## Description
${tc.description ?? ''}

### Prerequisites
- API endpoint: ${tc.apiDetails?.endpoint ?? ''}
- Method: ${tc.apiDetails?.method ?? ''}
- Authentication: Required

### Steps
${(tc.steps || []).map((step, i) => `${i + 1}. ${step}`).join('\n')}

### Expected Result
${tc.expectedResult ?? ''}

### API Details
- Method: ${tc.apiDetails?.method ?? ''}
- Endpoint: ${tc.apiDetails?.endpoint ?? ''}
- Headers: ${JSON.stringify(tc.apiDetails?.headers || {}, null, 2)}
- Body: ${tc.apiDetails?.body ?? 'N/A'}
- Expected Status: ${tc.apiDetails?.expectedStatus ?? ''}

### Validation Points
- Status code should be ${tc.apiDetails?.expectedStatus ?? ''}
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
    return (harEntries || [])
      .filter((entry: any) => entry.request && entry.request.url && entry.request.method)
      .map((entry: any) => ({
        method: entry.request.method,
        url: entry.request.url,
        payload: entry.request.postData ? formatPayload(entry.request.postData.text) : undefined,
      }));
  };

  // Small reusable cell preview: truncated inline, click to open full modal with copy
  const CellPreview: React.FC<{
    text?: string | null;
    label?: string;
    monospace?: boolean;
    maxChars?: number;
  }> = ({ text = '', label, monospace = false, maxChars = 300 }) => {
    const [open, setOpen] = useState(false);
    const safeText = text ?? '';
    const truncated = safeText.length > (maxChars ?? 300) ? safeText.slice(0, maxChars ?? 300) + '...' : safeText;

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(safeText);
      } catch (e) {
        // ignore copy failures
      }
    };

    return (
      <div>
        {label && <div className="text-xs text-gray-500 mb-1">{label}</div>}
        <div className={`text-sm ${monospace ? 'font-mono text-xs' : ''} break-words`}>
          <button
            title={safeText}
            onClick={() => setOpen(true)}
            className="text-left w-full hover:underline"
          >
            {truncated}
          </button>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setOpen(false)} />
            <div className="relative bg-white rounded-lg shadow-lg w-11/12 max-w-3xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{label ?? 'Full value'}</h3>
                  <p className="text-xs text-gray-500">Click outside or press Close to dismiss</p>
                </div>
                <div className="flex gap-2">
                  <button
                   
                    className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
                    onClick={copyToClipboard}
                  >
                    Copy
                  </button>
                  <button
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="mt-3 max-h-[60vh] overflow-auto">
                <pre className={`whitespace-pre-wrap ${monospace ? 'font-mono text-xs' : 'text-sm'}`}>{safeText}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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
) : (
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
              try {
                if (!file) return;
                const fileContent = await file.text();
                // If file is empty, still open the drawer and show 'No API endpoints found.'

                if (!fileContent || fileContent.trim().length === 0) {
                  setApiEndpoints([]);
                  setShowApiDrawer(false);
                  setErrorMessage('🚫 No API endpoints found in the uploaded file.\n\nPlease upload a valid HAR or Postman Collection file containing at least one API endpoint.');
                  setShowErrorModal(true);
                  return;
                }

                const harEntries = parseHarFile(fileContent);
                const apiDetails = extractApiEndpoints(harEntries);
                // Ensure we always show the API drawer even if apiDetails is empty
                if (!apiDetails || apiDetails.length === 0) {
                  setApiEndpoints([]);
                  setShowApiDrawer(false);
                  setErrorMessage('🚫 No API endpoints found in the uploaded file.\n\nPlease upload a valid HAR or Postman Collection file containing at least one API endpoint.');
                  setShowErrorModal(true);
                  return;
                }
                setApiEndpoints(apiDetails);
                setShowApiDrawer(true);
              } catch (err) {
                // Consistent error modal for API list
                setApiEndpoints([]);
                setShowApiDrawer(false);
                setErrorMessage('🚫 No API endpoints found in the uploaded file.\n\nPlease upload a valid HAR or Postman Collection file containing at least one API endpoint.');
                setShowErrorModal(true);
              }
            }}
            className="w-full max-w-2xl mx-auto block px-4 py-2 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            List All APIs
          </button>
        )}

        {/* Centered Popup Modal for API List */}
        {showApiDrawer && apiEndpoints.length > 0 && (
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
                <div className="space-y-4">
                  {apiEndpoints.map((api, index) => (
                    <div key={index} className={`p-4 rounded-md shadow-md ${getMethodColor(api.method)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">API Endpoint {index + 1}</div>
                          <p className="text-sm">Method: {api.method}</p>
                          <div className="mt-1">
                            <CellPreview text={api.url} label="URL" />
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button
                            type="button"
                            className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(api.url); } catch (e) { /* ignore copy failures */ }
                            }}
                          >
                            Copy URL
                          </button>
                        </div>
                      </div>
                      {api.payload && (
                        <div className="mt-2">
                          <div className="text-sm text-gray-700 mb-1">Payload:</div>
                          <CellPreview text={api.payload} label="Payload" monospace />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        <Chatbot />
      </div>
    )}
  </div>
  );
}

// If you have a Chatbot component, ensure it is imported and defined as a valid React component, e.g.:
// import Chatbot from './components/Chatbot';

// Chatbot with API key (place this at the end of App.tsx)
// Ensure fetchConfig is imported or defined for Chatbot
import { fetchConfig } from './services/configService';
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
  "test",


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
      // endpoint is undefined — inform user below without logging
      setMessages([
        ...newMessages,
        { role: "assistant", content: "AI connection failed. Please check your OpenAI configuration.  " },
      ]);
      setLoading(false);
      return;
 }
   

    try {
      await fetch(endpoint, {
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
    // ignore GPT-4o internal error here; user will receive a generic failure message if needed
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
      }),
    });
    const data = await response.json();
    reply = data.choices?.[0]?.message;
    // handle response here
  } catch (error) {
    // ignore o3-mini internal error here; user will receive a generic failure message if needed
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
      // Chatbot network or runtime error — show user-friendly message but avoid console logging
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
      // Chatbot network or runtime error — show user-friendly message but avoid console logging
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
}
export default App;