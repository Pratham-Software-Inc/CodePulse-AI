export interface HarEntry {
  request: {
    method: string;
    url: string;
    endpoint?: string;
    headers: Array<{ name: string; value: string }>;
    postData?: {
      text: string;
    };
  };
  response: {
    status: number;
    statusText: string;
    content: {
      text: string;
    };
  };
}

export interface TestPlan {
  title: string;
  description: string;
  stories: TestStory[];
  riskAssessment: RiskAssessment[];
  deliverables: Deliverable[];
  successCriteria: SuccessCriteria[];
  rolesAndResponsibility: RolesAndResponsibilities[];
  exitCriteria: ExitCriteria[];
  testExecutionStrategy: TestExecutionStrategy[];
  entryCriteria: EntryCriteria[];
  testSchedule: TestSchedule[];
  toolsAndAutomationStrategy: ToolsAndAutomationStrategy[];
  approvalsAndSignoffs: ApprovalsAndSignoffs[];
  references?: { title: string; url: string }[];
  testItems?: { id: string; description: string,endpoint: string,method: string; }[];
  featuresToBeTested?: string[];
  featuresNotToBeTested?: string[];
  staffingAndTraining?: { role: string; skills: string[] }[];
  passCriteria?: string[];
  failCriteria?: string[];
  suspensionCriteria?: string[];
  environmentRequirements?: {
    hardware: string[];
    software: string[];
    network: string;
  };
  testDataRequirements?: string[];
  traceabilityMatrix?: Record<string, string[]>;
  negativeScenarios?: string[];
}

export interface RolesAndResponsibilities
{
  role: string;
  responsibility: string;

}

export interface TestExecutionStrategy
{
  description: string;
}

export interface TestSchedule
{
  description:string
}

export interface ToolsAndAutomationStrategy
{
  description:string
}

export interface ApprovalsAndSignoffs
{
  description:string
}

export interface EntryCriteria
{
  description: string;
}


export interface TestStory {
  id: string;
  title: string;
  description: string;
  testCases: TestCase[];
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: string[];
  expectedResult: string;
  apiDetails: {
    method: string;
    endpoint: string;
    headers?: Record<string, string>;
    body?: string;
    expectedStatus: number;
  };
  severity?: 'High' | 'Medium' | 'Low';
  priority?: number;
  reqId?: string;
}

export interface RiskAssessment {
  category: string;
  description: string;
  mitigation: string;
  impact: 'Low' | 'Medium' | 'High';
}
export interface ExitCriteria
{
  description:string
}

export interface Deliverable {
  title: string;
  description: string;
  format: string;
  frequency: string;
}

export interface SuccessCriteria {
  category: string;
  criteria: string;
  threshold: string;
}

export type GenerationType = 'testPlan' | 'testScenario' | 'testCases' | 'code';