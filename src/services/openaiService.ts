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
    stories: [],
    riskAssessment: [],
    deliverables: [],
    successCriteria: [],
    rolesAndResponsibility: [],
    entryCriteria: [],
    exitCriteria: [],
    references: [],
    testItems: [],
    featuresToBeTested: [],
    featuresNotToBeTested: [],
    testDataRequirements: [],
    environmentRequirements: testPlans[0].environmentRequirements || {
      hardware: [], software: [], network: ''
    },
    staffingAndTraining: [],
    testExecutionStrategy: [],
    testSchedule: [],
    toolsAndAutomationStrategy: [],
    approvalsAndSignoffs: [],
    passCriteria: [],
    failCriteria: [],
    suspensionCriteria: [],
    negativeScenarios: [],
    traceabilityMatrix: {}
  };

  // Basic push of all arrays
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
      // prefer non-empty environment from later plans
      if (plan.environmentRequirements.hardware.length || plan.environmentRequirements.software.length || plan.environmentRequirements.network) {
        merged.environmentRequirements = plan.environmentRequirements;
      }
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

  // (debug counts removed)

  // Helper: unique by key
  const uniqueBy = <T,>(arr: T[], keyFn: (t: T) => string): T[] => {
    const map = new Map<string, T>();
    for (const item of arr || []) {
      try {
        const k = keyFn(item);
        if (!map.has(k)) map.set(k, item);
      } catch {
        // fallback stringify
        const s = JSON.stringify(item);
        if (!map.has(s)) map.set(s, item);
      }
    }
    return Array.from(map.values());
  };

  const FUZZY_THRESHOLD = 0.72; // slightly lower to catch more near-duplicates

  const STOPWORDS = new Set(['the','a','an','and','of','to','for','in','on','by','with','is','are','or','as','at','from']);
  const ALIAS_MAP: Record<string,string> = {
    '\bauth\b': ' authentication ',
    '\bauthentication\b': ' authentication ',
    '\bsvc\b': ' service ',
    '\bservice\b': ' service ',
    '\bperf\b': ' performance ',
    '\bperformance\b': ' performance ',
    '\bdb\b': ' database ',
    '\bdatabase\b': ' database ',
    '\biam\b': ' identity access management ',
    '\bidentity\b': ' identity ',
    '\bapi\b': ' api ',
    // deliverable/report synonyms to help merge 'Bug Report' / 'Defect Log' / 'Defect Report'
    '\bbug\b': ' defect ',
    '\bdefect\b': ' defect ',
    '\bissue\b': ' defect ',
    '\blog\b': ' report ',
    '\breport\b': ' report '
  };

  const normalize = (s?: string | null) => (s || '').toString().trim();

  // Key normalization for grouping: lowercase, collapse whitespace, strip trailing punctuation,
  // remove stopwords, replace common aliases, and keep only alphanumeric + spaces
  const normalizeKey = (s?: string | null) => {
    let str = normalize(s).toLowerCase();
    if (!str) return '';
    // replace aliases (apply simple replacements)
    for (const pat in ALIAS_MAP) {
      try { str = str.replace(new RegExp(pat, 'gi'), ALIAS_MAP[pat]); } catch (e) { /* ignore bad regex */ }
    }
    // remove punctuation, keep spaces and alphanumerics
    str = str.replace(/[^a-z0-9\s]/g, ' ');
    // collapse whitespace
    str = str.replace(/\s+/g, ' ').trim();
    // remove stopwords
    const parts = str.split(' ').filter(p => p && !STOPWORDS.has(p));
    return parts.join(' ').trim();
  };

  // Simple Levenshtein distance and similarity for fuzzy matching
  const levenshtein = (a: string, b: string) => {
    const al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    const matrix: number[][] = Array.from({ length: al + 1 }, () => Array(bl + 1).fill(0));
    for (let i = 0; i <= al; i++) matrix[i][0] = i;
    for (let j = 0; j <= bl; j++) matrix[0][j] = j;
    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[al][bl];
  };

  const similarity = (a: string, b: string) => {
    if (!a && !b) return 1;
    if (!a || !b) return 0;
    const d = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - d / maxLen;
  };

  // Find an existing similar key in map (uses FUZZY_THRESHOLD). Return existing key or undefined.
  const findSimilarKey = (map: Map<string, any>, key: string, threshold = FUZZY_THRESHOLD) => {
    if (!key || key === '__UNSPECIFIED__') return key;
    for (const existing of map.keys()) {
      if (!existing || existing === '__UNSPECIFIED__') continue;
      const sim = similarity(existing, key);
      if (sim >= threshold) return existing;
    }
    return undefined;
  };

  const uniqueStrings = (arr?: (string | undefined | null)[]) => Array.from(new Set((arr || []).map(s => normalize(s)).filter(s => s.length > 0))).sort((a, b) => a.localeCompare(b));

  // Deduplicate stories by id or title, and dedupe test cases inside each story
  merged.stories = uniqueBy(merged.stories || [], (s: any) => normalizeKey((s.id || s.title || JSON.stringify(s)).toString()));
  merged.stories = merged.stories.map(story => {
    const tc = story.testCases || [];
    const uniqueTcs = uniqueBy(tc, (t: any) => normalizeKey((t.id || t.title || JSON.stringify(t)).toString()));
    // sort test cases by id or title for deterministic order
    uniqueTcs.sort((a: any, b: any) => (normalize((a.id || a.title || '')).localeCompare(normalize((b.id || b.title || '')))));
    return { ...story, testCases: uniqueTcs } as typeof story;
  });

  // Deduplicate object arrays by meaningful keys
  merged.riskAssessment = uniqueBy(merged.riskAssessment || [], (r: any) => `${normalizeKey(r.category)}|${normalizeKey(r.description)}|${normalizeKey(r.mitigation)}`);
  merged.deliverables = uniqueBy(merged.deliverables || [], (d: any) => `${normalizeKey(d.title)}|${normalizeKey(d.description)}|${normalizeKey(d.format)}`);
  merged.successCriteria = uniqueBy(merged.successCriteria || [], (s: any) => `${normalizeKey(s.category)}|${normalizeKey(s.criteria)}|${normalizeKey(s.threshold)}`);
  merged.rolesAndResponsibility = uniqueBy(merged.rolesAndResponsibility || [], (r: any) => `${normalizeKey(r.role)}|${normalizeKey(r.responsibility)}`);

  // Consolidation helpers: join lines and group objects by primary keys, merging fields into sets
  const joinLines = (items: Set<string>) => Array.from(items).filter(Boolean).map(s => `- ${s}`).join('\n');
  
  const groupByPrimaryAndMerge = (arr: any[] = [], primaryKeys: string[] = ['description'], mergeFields: string[] = ['description']) => {
    const map = new Map<string, any>();
    for (const item of arr || []) {
      // build key from first available primary key fields
      const rawKeyParts = primaryKeys.map(k => normalizeKey(item?.[k])).filter(s => s.length > 0);
      const rawKey = rawKeyParts.join('|') || '__UNSPECIFIED__';
      // try to find an existing similar key to merge into
      const similar = findSimilarKey(map, rawKey);
      const key = similar ?? rawKey;

      if (!map.has(key)) {
        // initialize accumulator: store the first non-empty primary value for later output
        const primaryOut: any = {};
        for (const pk of primaryKeys) {
          const v = normalize(item?.[pk]);
          if (v) {
            primaryOut[pk] = v;
            break;
          }
        }
        const accum: any = { ...primaryOut };
        // prepare merge field sets
        for (const mf of mergeFields) accum[mf] = new Set<string>();
        map.set(key, accum);
      }

      const accum = map.get(key);
      for (const mf of mergeFields) {
        const val = item?.[mf];
        if (Array.isArray(val)) {
          for (const v of val) if (v) accum[mf].add(normalize(v));
        } else if (val) {
          accum[mf].add(normalize(val));
        }
      }
    }

    // produce merged objects
    return Array.from(map.values()).map((v: any) => {
      const out: any = {};
      // pick a primary field value to output (first available)
      for (const pk of primaryKeys) {
        if (v[pk]) { out[pk] = v[pk]; break; }
      }
      for (const mf of mergeFields) out[mf] = joinLines(v[mf]);
      return out;
    });
  };

  // Apply grouping & merging for simple description-based sections so duplicate rows are consolidated
  merged.entryCriteria = groupByPrimaryAndMerge(merged.entryCriteria || [], ['description'], ['description']);
  merged.exitCriteria = groupByPrimaryAndMerge(merged.exitCriteria || [], ['description'], ['description']);
  merged.testExecutionStrategy = groupByPrimaryAndMerge(merged.testExecutionStrategy || [], ['description'], ['description']);
  merged.testSchedule = groupByPrimaryAndMerge(merged.testSchedule || [], ['description'], ['description']);
  merged.toolsAndAutomationStrategy = groupByPrimaryAndMerge(merged.toolsAndAutomationStrategy || [], ['description'], ['description']);

  // Approvals & Signoffs: try to group by approver/title/description and merge descriptions
  merged.approvalsAndSignoffs = groupByPrimaryAndMerge(merged.approvalsAndSignoffs || [], ['approver', 'title', 'description'], ['description']);

  // References and testItems
  merged.references = uniqueBy(merged.references || [], (r: any) => `${normalizeKey(r.title)}|${normalizeKey(r.url)}`);
  merged.testItems = uniqueBy(merged.testItems || [], (t: any) => `${normalizeKey((t as any).id)}|${normalizeKey((t as any).endpoint)}|${normalizeKey((t as any).method)}`);

  // Features and simple string lists
  merged.featuresToBeTested = uniqueStrings(merged.featuresToBeTested);
  merged.featuresNotToBeTested = uniqueStrings(merged.featuresNotToBeTested);
  merged.passCriteria = uniqueStrings(merged.passCriteria);
  merged.failCriteria = uniqueStrings(merged.failCriteria);
  merged.suspensionCriteria = uniqueStrings(merged.suspensionCriteria);
  merged.testDataRequirements = uniqueStrings(merged.testDataRequirements);
  merged.negativeScenarios = uniqueStrings(merged.negativeScenarios);

  // Staffing: merge skills by role
  const staffingMap = new Map<string, Set<string>>();
  for (const s of merged.staffingAndTraining || []) {
    const role = normalize((s as any).role || '');
    if (!role) continue;
    const roleKey = normalizeKey(role);
    if (!staffingMap.has(roleKey)) staffingMap.set(roleKey, new Set<string>());
    for (const sk of (s as any).skills || []) {
      const skill = normalize(sk);
      if (skill) staffingMap.get(roleKey)!.add(skill);
    }
  }
  merged.staffingAndTraining = Array.from(staffingMap.entries()).map(([roleKey, skillsSet]) => ({ role: roleKey, skills: Array.from(skillsSet).sort((a,b)=>a.localeCompare(b)) }));

  // Additional: ensure deliverables and successCriteria are fully merged (title/category grouping already applied above via uniqueBy) but also concatenate descriptions/formats/frequencies where duplicates exist
  // (Note: uniqueBy on deliverables/successCriteria retains one representative; we re-run grouping to ensure multi-row consolidation of their descriptive fields)
  const deliverableGroup = new Map<string, { title: string; descriptions: Set<string>; formats: Set<string>; frequencies: Set<string> }>();
  for (const d of merged.deliverables || []) {
    // build raw key from title or first part of description to be more tolerant
    const rawTitle = normalizeKey((d as any).title);
    const rawDescSnippet = normalizeKey((d as any).description).split(' ').slice(0,6).join(' ');
    const rawKey = rawTitle || rawDescSnippet || '__UNSPECIFIED__';
    const similar = findSimilarKey(deliverableGroup, rawKey);
    const key = similar ?? rawKey;
    if (!deliverableGroup.has(key)) deliverableGroup.set(key, { title: key === '__UNSPECIFIED__' ? '' : (d as any).title || '', descriptions: new Set(), formats: new Set(), frequencies: new Set() });
    if ((d as any).description) deliverableGroup.get(key)!.descriptions.add(normalize((d as any).description));
    if ((d as any).format) deliverableGroup.get(key)!.formats.add(normalize((d as any).format));
    if ((d as any).frequency) deliverableGroup.get(key)!.frequencies.add(normalize((d as any).frequency));
  }
  merged.deliverables = Array.from(deliverableGroup.values()).map(v => ({ title: v.title, description: joinLines(v.descriptions), format: Array.from(v.formats).filter(Boolean).sort().join(', '), frequency: Array.from(v.frequencies).filter(Boolean).sort().join(', ') }));

  const successGroup = new Map<string, { category: string; criteria: Set<string>; thresholds: Set<string> }>();
  for (const s of merged.successCriteria || []) {
    const rawCategory = normalizeKey((s as any).category);
    const rawCriteriaSnippet = normalizeKey((s as any).criteria).split(' ').slice(0,6).join(' ');
    const rawKey = rawCategory || rawCriteriaSnippet || '__UNSPECIFIED__';
    const similar = findSimilarKey(successGroup, rawKey);
    const key = similar ?? rawKey;
    if (!successGroup.has(key)) successGroup.set(key, { category: key === '__UNSPECIFIED__' ? '' : (s as any).category || '', criteria: new Set(), thresholds: new Set() });
    if ((s as any).criteria) successGroup.get(key)!.criteria.add(normalize((s as any).criteria));
    if ((s as any).threshold) successGroup.get(key)!.thresholds.add(normalize((s as any).threshold));
  }
  merged.successCriteria = Array.from(successGroup.values()).map(v => ({ category: v.category, criteria: joinLines(v.criteria), threshold: Array.from(v.thresholds).filter(Boolean).sort().join(', ') }));

  // === Further consolidation: Group roles, risk assessment and ensure sorting across sections ===

  // Roles & Responsibilities: group by role and concatenate responsibilities
  const rolesGroup = new Map<string, { role: string; responsibilities: Set<string> }>();
  for (const r of merged.rolesAndResponsibility || []) {
    const rawRole = normalizeKey((r as any).role);
    const rawRespSnippet = normalizeKey((r as any).responsibility).split(' ').slice(0,4).join(' ');
    const rawKey = rawRole || rawRespSnippet || '__UNSPECIFIED__';
    const similar = findSimilarKey(rolesGroup, rawKey);
    const key = similar ?? rawKey;
    if (!rolesGroup.has(key)) rolesGroup.set(key, { role: key === '__UNSPECIFIED__' ? '' : (r as any).role || '', responsibilities: new Set<string>() });
    if ((r as any).responsibility) rolesGroup.get(key)!.responsibilities.add(normalize((r as any).responsibility));
  }
  merged.rolesAndResponsibility = Array.from(rolesGroup.values()).map(v => ({ role: v.role, responsibility: joinLines(v.responsibilities) }));

  // Risk Assessment: group by category and merge descriptions/mitigations/impacts with impact priority
  const riskMap = new Map<string, { category: string; descriptions: Set<string>; mitigations: Set<string>; impacts: Set<string> }>();
  for (const r of merged.riskAssessment || []) {
    const rawKey = normalizeKey((r as any).category) || normalizeKey((r as any).description) || '__UNSPECIFIED__';
    const similar = findSimilarKey(riskMap, rawKey);
    const key = similar ?? rawKey;
    if (!riskMap.has(key)) riskMap.set(key, { category: key === '__UNSPECIFIED__' ? '' : (r as any).category || '', descriptions: new Set(), mitigations: new Set(), impacts: new Set() });
    if ((r as any).description) riskMap.get(key)!.descriptions.add(normalize((r as any).description));
    if ((r as any).mitigation) riskMap.get(key)!.mitigations.add(normalize((r as any).mitigation));
    if ((r as any).impact) riskMap.get(key)!.impacts.add(normalize((r as any).impact));
  }
  merged.riskAssessment = Array.from(riskMap.values()).map(v => {
    const impacts = Array.from(v.impacts).map(s => s as 'Low' | 'Medium' | 'High').filter(Boolean);
    let aggregatedImpact: 'Low' | 'Medium' | 'High' = 'Low';
    if (impacts.includes('High')) aggregatedImpact = 'High';
    else if (impacts.includes('Medium')) aggregatedImpact = 'Medium';
    else if (impacts.includes('Low')) aggregatedImpact = 'Low';
    return { category: v.category, description: joinLines(v.descriptions), mitigation: joinLines(v.mitigations), impact: aggregatedImpact };
  });

  // Sorting helpers: sort object arrays by a provided keyFn, and sort string arrays
  const sortObjects = <T>(arr: T[] = [], keyFn: (t: T) => string) => arr.sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
  const sortStrings = (arr: string[] = []) => arr.sort((a, b) => a.localeCompare(b));

  // Apply sorting
  merged.riskAssessment = sortObjects(merged.riskAssessment || [], (x: any) => normalizeKey(x.category));
  merged.deliverables = sortObjects(merged.deliverables || [], (x: any) => normalizeKey(x.title));
  merged.successCriteria = sortObjects(merged.successCriteria || [], (x: any) => normalizeKey(x.category));
  merged.rolesAndResponsibility = sortObjects(merged.rolesAndResponsibility || [], (x: any) => normalizeKey(x.role));
  merged.entryCriteria = sortObjects(merged.entryCriteria || [], (x: any) => normalizeKey(x.description));
  merged.exitCriteria = sortObjects(merged.exitCriteria || [], (x: any) => normalizeKey(x.description));
  merged.testExecutionStrategy = sortObjects(merged.testExecutionStrategy || [], (x: any) => normalizeKey(x.description));
  merged.testSchedule = sortObjects(merged.testSchedule || [], (x: any) => normalizeKey(x.description));
  merged.toolsAndAutomationStrategy = sortObjects(merged.toolsAndAutomationStrategy || [], (x: any) => normalizeKey(x.description));
  merged.approvalsAndSignoffs = sortObjects(merged.approvalsAndSignoffs || [], (x: any) => normalizeKey(x.description));
  merged.references = sortObjects(merged.references || [], (x: any) => normalizeKey(x.title));
  merged.testItems = sortObjects(merged.testItems || [], (x: any) => (normalizeKey((x as any).id) || normalizeKey((x as any).endpoint)));

  merged.featuresToBeTested = sortStrings(merged.featuresToBeTested || []);
  merged.featuresNotToBeTested = sortStrings(merged.featuresNotToBeTested || []);
  merged.passCriteria = sortStrings(merged.passCriteria || []);
  merged.failCriteria = sortStrings(merged.failCriteria || []);
  merged.suspensionCriteria = sortStrings(merged.suspensionCriteria || []);
  merged.testDataRequirements = sortStrings(merged.testDataRequirements || []);
  merged.negativeScenarios = sortStrings(merged.negativeScenarios || []);

  // Staffing: ensure sorted by role
  merged.staffingAndTraining = sortObjects(merged.staffingAndTraining || [], (x: any) => normalizeKey(x.role));

  // Traceability matrix: unique test case ids per requirement and ensure deterministic ordering of keys and values
  const sortedTrace: Record<string, string[]> = {};
  const reqIds = Object.keys(merged.traceabilityMatrix || {}).sort((a,b) => a.localeCompare(b));
  for (const reqId of reqIds) {
    const vals = Array.from(new Set((merged.traceabilityMatrix![reqId] || []).map(s => normalize(s)))).filter(s => s.length > 0).sort((a,b)=>a.localeCompare(b));
    sortedTrace[reqId] = vals;
  }
  merged.traceabilityMatrix = sortedTrace;

  return merged;
}

export default mergeTestPlans;

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
  if (!harEntries || harEntries.length === 0) {
    throw new Error('no valid endpoints');
  }

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
        throw new Error('no valid endpoints');
      }
      try {
        const parsed = JSON.parse(response);
        let planFromBatch: TestPlan;
        if (type === 'testPlan') {
          planFromBatch = parsed as TestPlan;
        } else {
          const stories = parsed?.stories || (Array.isArray(parsed) ? (parsed[0]?.stories || parsed) : []);
          planFromBatch = {
            ...(testPlans[0] || {}),
            title: '',
            description: '',
            stories: Array.isArray(stories) ? stories : [],
            riskAssessment: [],
            deliverables: [],
            successCriteria: [],
            rolesAndResponsibility: [],
            entryCriteria: [],
            exitCriteria: [],
            references: [],
            testItems: [],
            featuresToBeTested: [],
            featuresNotToBeTested: [],
            testDataRequirements: [],
            environmentRequirements: testPlans[0]?.environmentRequirements || { hardware: [], software: [], network: '' },
            staffingAndTraining: [],
            testExecutionStrategy: [],
            testSchedule: [],
            toolsAndAutomationStrategy: [],
            approvalsAndSignoffs: [],
            passCriteria: [],
            failCriteria: [],
            suspensionCriteria: [],
            negativeScenarios: [],
            traceabilityMatrix: {}
          } as TestPlan;
        }
        testPlans.push(planFromBatch);
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

  if (!testPlans.length) {
    throw new Error('no valid endpoints');
  }
  const merged = mergeTestPlans(testPlans);
  // If merged stories is missing or empty, treat as no valid endpoints
  if (!merged.stories || !Array.isArray(merged.stories) || merged.stories.length === 0) {
    throw new Error('no valid endpoints');
  }
  return merged;
}

// Debug note removed to avoid console usage in production code.
