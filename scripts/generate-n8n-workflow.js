#!/usr/bin/env node
/**
 * generate-n8n-workflow.js
 *
 * Reads all rule files from lib/rules/, strips TypeScript annotations,
 * and generates a complete n8n workflow JSON that replicates the
 * processReview pipeline (delta calculation + rule evaluation).
 *
 * Usage:
 *   node scripts/generate-n8n-workflow.js
 *
 * Output:
 *   n8n_workflows/process_review.json
 *
 * After running, import the JSON into n8n:
 *   n8n Dashboard -> Settings -> Import Workflow -> paste JSON
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const RULES_DIR = path.join(__dirname, '..', 'lib', 'rules');
const OUTPUT_DIR = path.join(__dirname, '..', 'n8n_workflows');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'process_review.json');

const RULE_FILES = [
  'employeeIdentity.ts',
  'hoursComponents.ts',
  'earningsComponents.ts',
  'fundamentalPay.ts',
  'taxesComponents.ts',
  'deductionsComponents.ts',
  'crossCategory.ts',
];

const RULE_VAR_NAMES = [
  'employeeIdentityRules',
  'hoursComponentsRules',
  'earningsComponentsRules',
  'fundamentalPayRules',
  'taxesComponentsRules',
  'deductionsComponentsRules',
  'crossCategoryRules',
];

// All numeric DB columns used for delta calculation
// (derived from CANONICAL_NUMERIC_FIELDS in lib/canonicalSchema.ts)
const DELTA_METRICS = [
  'regular_hours', 'overtime_hours', 'other_paid_hours', 'total_hours_worked',
  'base_earnings', 'overtime_pay', 'bonus_earnings', 'other_earnings',
  'federal_income_tax', 'social_security_tax', 'medicare_tax',
  'state_income_tax', 'local_tax', 'total_deductions', 'gross_pay', 'net_pay',
];

const BASE_METRICS = ['net_pay', 'gross_pay', 'total_deductions'];

// ============================================================================
// TypeScript -> JavaScript conversion
// ============================================================================

function stripTypeScript(code) {
  let js = code;
  // Remove import lines
  js = js.replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];\s*$/gm, '');
  // Remove 'export' keyword from declarations
  js = js.replace(/^export\s+(const|let|var|function)/gm, '$1');
  // Remove RuleDefinition[] type annotation
  js = js.replace(/:\s*RuleDefinition\[\]/g, '');
  // Remove inline object type annotations in arrow params: (c: { ... }) -> (c)
  js = js.replace(/\(\s*(\w+)\s*:\s*\{[^}]*\}\s*\)/g, '($1)');
  // Remove inline type annotations with two params: (acc: type, c: { ... }) -> (acc, c)
  js = js.replace(/\(\s*(\w+)\s*:\s*\w+\s*,\s*(\w+)\s*:\s*\{[^}]*\}\s*\)/g, '($1, $2)');
  // Clean up excessive blank lines
  js = js.replace(/\n{3,}/g, '\n\n');
  return js.trim();
}

// ============================================================================
// Read and convert all rule files
// ============================================================================

console.log('Reading rule files from lib/rules/...');
const ruleCodeBlocks = [];
let totalRuleCount = 0;

for (let i = 0; i < RULE_FILES.length; i++) {
  const filePath = path.join(RULES_DIR, RULE_FILES[i]);
  if (!fs.existsSync(filePath)) {
    console.error('  ERROR: ' + RULE_FILES[i] + ' not found');
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const jsCode = stripTypeScript(content);
  ruleCodeBlocks.push(jsCode);

  // Count rules (rough count by 'id:' patterns)
  const ruleCount = (jsCode.match(/^\s+id:\s*'/gm) || []).length;
  totalRuleCount += ruleCount;
  console.log('  ' + RULE_FILES[i] + ': ' + ruleCount + ' rules');
}

console.log('Total: ' + totalRuleCount + ' rules\n');

// Safety check for template literal expressions in rules
const combinedRulesCode = ruleCodeBlocks.join('\n\n');
if (combinedRulesCode.includes('${')) {
  console.warn('WARNING: Rules code contains template literal expressions (${...}).');
  console.warn('This may cause issues. Consider using string concatenation in rules.\n');
}

// Build the ALL_RULES array concatenation
const allRulesArrayCode =
  'const ALL_RULES = [\n' +
  RULE_VAR_NAMES.map(v => '  ...' + v + ',').join('\n') +
  '\n];';

// Rule engine functions (mirrors lib/rules/index.ts logic)
const ruleEngineCode = [
  'const TIER_RANK = { starter: 0, pro: 1 };',
  '',
  'function isRuleAvailable(rule, orgTier) {',
  '  const ruleRank = TIER_RANK[rule.minTier] || 0;',
  '  const tierRank = TIER_RANK[orgTier] || 0;',
  '  return tierRank >= ruleRank;',
  '}',
  '',
  'function applyRules(ctx, orgTier) {',
  '  const judgements = [];',
  '  for (const rule of ALL_RULES) {',
  '    if (!isRuleAvailable(rule, orgTier)) continue;',
  '    try {',
  '      if (rule.condition(ctx)) {',
  '        judgements.push({',
  '          rule_id: rule.id,',
  '          rule_name: rule.name,',
  '          category: rule.category,',
  '          severity: rule.severity,',
  "          is_material: rule.severity === 'blocker' || rule.severity === 'review',",
  "          is_blocker: rule.severity === 'blocker',",
  '          confidence_score: rule.confidence,',
  '          reasoning: rule.explanation,',
  '          user_action: rule.userAction,',
  '          columns_used: rule.columnsUsed,',
  '        });',
  '      }',
  '    } catch (e) {',
  '      // Rule evaluation failed, skip silently',
  '    }',
  '  }',
  '  return judgements;',
  '}',
  '',
  'function applyDeltaRules(current, baseline, metric, currentValue, baselineValue, allCurrentEmployees, allBaselineEmployees, orgTier) {',
  '  const deltaAbsolute = baselineValue != null ? currentValue - baselineValue : null;',
  '  const deltaPercentage = baselineValue != null && baselineValue !== 0',
  '    ? ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100',
  '    : null;',
  '  const ctx = {',
  '    current,',
  '    baseline: baseline || undefined,',
  '    metric,',
  '    currentValue,',
  '    baselineValue: baselineValue != null ? baselineValue : undefined,',
  '    deltaAbsolute: deltaAbsolute != null ? deltaAbsolute : undefined,',
  '    deltaPercentage: deltaPercentage != null ? deltaPercentage : undefined,',
  '    allCurrentEmployees,',
  '    allBaselineEmployees,',
  '  };',
  '  return applyRules(ctx, orgTier);',
  '}',
  '',
  'function applyEmployeeRules(current, baseline, allCurrentEmployees, allBaselineEmployees, orgTier) {',
  '  const ctx = {',
  '    current,',
  '    baseline: baseline || undefined,',
  "    metric: '__employee_level__',",
  '    allCurrentEmployees,',
  '    allBaselineEmployees,',
  '  };',
  '  return applyRules(ctx, orgTier);',
  '}',
].join('\n');

// ============================================================================
// Shared: fetch polyfill using Node.js built-in https (for n8n sandbox)
// ============================================================================

const fetchPolyfill = [
  '// fetch polyfill for n8n Code node sandbox',
  "const https = require('https');",
  "const http = require('http');",
  '',
  '// Parse URL manually since URL class is not available in sandbox',
  'function parseUrl(urlStr) {',
  "  const match = urlStr.match(/^(https?):\\/\\/([^:/]+)(?::(\\d+))?(\\/.*)?$/);",
  "  if (!match) throw new Error('Invalid URL: ' + urlStr);",
  '  return {',
  '    protocol: match[1],',
  '    hostname: match[2],',
  "    port: match[3] ? parseInt(match[3]) : (match[1] === 'https' ? 443 : 80),",
  "    path: match[4] || '/'",
  '  };',
  '}',
  '',
  'function fetch(url, options = {}) {',
  '  return new Promise((resolve, reject) => {',
  '    const u = parseUrl(url);',
  "    const mod = u.protocol === 'https' ? https : http;",
  '    const req = mod.request({',
  '      hostname: u.hostname,',
  '      port: u.port,',
  '      path: u.path,',
  "      method: options.method || 'GET',",
  '      headers: options.headers || {},',
  '    }, (res) => {',
  "      let data = '';",
  "      res.on('data', chunk => data += chunk);",
  "      res.on('end', () => {",
  '        resolve({',
  '          ok: res.statusCode >= 200 && res.statusCode < 300,',
  '          status: res.statusCode,',
  "          statusText: res.statusMessage || '',",
  '          json: () => JSON.parse(data),',
  '          text: () => data,',
  '        });',
  '      });',
  '    });',
  "    req.on('error', reject);",
  '    if (options.body) req.write(options.body);',
  '    req.end();',
  '  });',
  '}',
].join('\n');

// ============================================================================
// Code Node 1: Fetch Data
// ============================================================================

const codeNode1 = [
  '// ==========================================================================',
  '// Code Node 1: Validate & Fetch Data',
  '// Auto-generated by scripts/generate-n8n-workflow.js',
  '// ==========================================================================',
  '',
  fetchPolyfill,
  '',
  'const SUPABASE_URL = $env.SUPABASE_URL;',
  'const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;',
  '',
  'if (!SUPABASE_URL || !SUPABASE_KEY) {',
  "  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');",
  '}',
  '',
  'const webhookData = $input.first().json;',
  '// n8n webhook nests POST body under .body',
  'const body = webhookData.body || webhookData;',
  'const reviewSessionId = body.review_session_id;',
  '',
  'if (!reviewSessionId) {',
  "  throw new Error('Missing review_session_id in request body');",
  '}',
  '',
  'const headers = {',
  "  'apikey': SUPABASE_KEY,",
  "  'Authorization': 'Bearer ' + SUPABASE_KEY,",
  "  'Content-Type': 'application/json',",
  "  'Prefer': 'return=representation',",
  '};',
  '',
  '// Update session status to processing',
  'await fetch(',
  "  SUPABASE_URL + '/rest/v1/review_session?review_session_id=eq.' + reviewSessionId,",
  '  {',
  "    method: 'PATCH',",
  '    headers,',
  "    body: JSON.stringify({ status: 'processing' }),",
  '  }',
  ');',
  '',
  '// Fetch datasets',
  'const dsRes = await fetch(',
  "  SUPABASE_URL + '/rest/v1/payroll_dataset?review_session_id=eq.' + reviewSessionId + '&select=*',",
  '  { headers }',
  ');',
  "if (!dsRes.ok) throw new Error('Failed to fetch datasets: ' + dsRes.statusText);",
  'const datasets = await dsRes.json();',
  '',
  'if (!Array.isArray(datasets) || datasets.length !== 2) {',
  "  throw new Error('Expected 2 datasets, found ' + (datasets ? datasets.length : 0));",
  '}',
  '',
  "const baseline = datasets.find(d => d.dataset_type === 'baseline');",
  "const current = datasets.find(d => d.dataset_type === 'current');",
  "if (!baseline || !current) throw new Error('Missing baseline or current dataset');",
  '',
  'const orgId = baseline.organization_id;',
  '',
  '// Fetch org tier',
  'const tierRes = await fetch(',
  "  SUPABASE_URL + '/rest/v1/organization_tier?organization_id=eq.' + orgId + '&select=tier',",
  '  { headers }',
  ');',
  'const tierData = tierRes.ok ? await tierRes.json() : [];',
  "const orgTier = (tierData && tierData[0] && tierData[0].tier === 'pro') ? 'pro' : 'starter';",
  '',
  '// Fetch baseline employees',
  'const blEmpRes = await fetch(',
  "  SUPABASE_URL + '/rest/v1/employee_pay_record?dataset_id=eq.' + baseline.dataset_id + '&select=*&limit=10000',",
  '  { headers }',
  ');',
  "if (!blEmpRes.ok) throw new Error('Failed to fetch baseline employees: ' + blEmpRes.statusText);",
  'const baselineEmployees = await blEmpRes.json();',
  '',
  '// Fetch current employees',
  'const curEmpRes = await fetch(',
  "  SUPABASE_URL + '/rest/v1/employee_pay_record?dataset_id=eq.' + current.dataset_id + '&select=*&limit=10000',",
  '  { headers }',
  ');',
  "if (!curEmpRes.ok) throw new Error('Failed to fetch current employees: ' + curEmpRes.statusText);",
  'const currentEmployees = await curEmpRes.json();',
  '',
  "if (!baselineEmployees || baselineEmployees.length === 0) throw new Error('No baseline employees');",
  "if (!currentEmployees || currentEmployees.length === 0) throw new Error('No current employees');",
  '',
  '// Attach empty pay_components for rule compatibility',
  'for (const emp of [...baselineEmployees, ...currentEmployees]) {',
  '  emp.pay_components = [];',
  '}',
  '',
  'return [{',
  '  json: {',
  '    reviewSessionId,',
  '    orgId,',
  '    orgTier,',
  '    baselineEmployees,',
  '    currentEmployees,',
  '  }',
  '}];',
].join('\n');

// ============================================================================
// Code Node 2: Calculate & Insert Deltas
// ============================================================================

const codeNode2 = [
  '// ==========================================================================',
  '// Code Node 2: Calculate & Insert Deltas',
  '// Auto-generated by scripts/generate-n8n-workflow.js',
  '// ==========================================================================',
  '',
  fetchPolyfill,
  '',
  'const SUPABASE_URL = $env.SUPABASE_URL;',
  'const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;',
  '',
  'const input = $input.first().json;',
  'const { reviewSessionId, orgId, orgTier, baselineEmployees, currentEmployees } = input;',
  '',
  'const headers = {',
  "  'apikey': SUPABASE_KEY,",
  "  'Authorization': 'Bearer ' + SUPABASE_KEY,",
  "  'Content-Type': 'application/json',",
  "  'Prefer': 'return=representation',",
  '};',
  '',
  'const DELTA_METRICS = ' + JSON.stringify(DELTA_METRICS) + ';',
  "const BASE_METRICS = ['net_pay', 'gross_pay', 'total_deductions'];",
  '',
  'function getFieldValue(emp, field) {',
  '  if (emp[field] != null) {',
  '    const val = Number(emp[field]);',
  '    return isNaN(val) ? null : val;',
  '  }',
  '  if (emp.metadata && emp.metadata[field] != null) {',
  '    const val = Number(emp.metadata[field]);',
  '    return isNaN(val) ? null : val;',
  '  }',
  '  return null;',
  '}',
  '',
  '// Build lookup maps',
  'const baselineMap = new Map(baselineEmployees.map(e => [e.employee_id, e]));',
  'const currentMap = new Map(currentEmployees.map(e => [e.employee_id, e]));',
  '',
  'const deltas = [];',
  '',
  '// Removed employees',
  'for (const [employeeId, baselineEmp] of baselineMap) {',
  '  if (!currentMap.has(employeeId)) {',
  '    deltas.push({',
  '      review_session_id: reviewSessionId,',
  '      organization_id: orgId,',
  '      employee_id: employeeId,',
  "      metric: 'net_pay',",
  "      change_type: 'removed_employee',",
  "      baseline_value: getFieldValue(baselineEmp, 'net_pay'),",
  '      current_value: null,',
  '      delta_absolute: null,',
  '      delta_percentage: null,',
  '    });',
  '  }',
  '}',
  '',
  '// New employees and metric-level changes',
  'for (const [employeeId, currentEmp] of currentMap) {',
  '  const baselineEmp = baselineMap.get(employeeId);',
  '',
  '  if (!baselineEmp) {',
  '    deltas.push({',
  '      review_session_id: reviewSessionId,',
  '      organization_id: orgId,',
  '      employee_id: employeeId,',
  "      metric: 'net_pay',",
  "      change_type: 'new_employee',",
  '      baseline_value: null,',
  "      current_value: getFieldValue(currentEmp, 'net_pay'),",
  '      delta_absolute: null,',
  '      delta_percentage: null,',
  '    });',
  '  } else {',
  '    let hasAnyDelta = false;',
  '',
  '    for (const metric of DELTA_METRICS) {',
  '      const bVal = getFieldValue(baselineEmp, metric);',
  '      const cVal = getFieldValue(currentEmp, metric);',
  '      if (bVal == null && cVal == null) continue;',
  '',
  '      const bNum = bVal ?? 0;',
  '      const cNum = cVal ?? 0;',
  '',
  '      if (bNum !== cNum) {',
  '        const deltaAbs = cNum - bNum;',
  '        let deltaPct = bNum !== 0 ? (deltaAbs / Math.abs(bNum)) * 100 : null;',
  '        if (deltaPct !== null) {',
  '          deltaPct = Math.max(-999.99, Math.min(999.99, Math.round(deltaPct * 100) / 100));',
  '        }',
  '',
  '        deltas.push({',
  '          review_session_id: reviewSessionId,',
  '          organization_id: orgId,',
  '          employee_id: employeeId,',
  '          metric,',
  "          change_type: deltaAbs > 0 ? 'increase' : 'decrease',",
  '          baseline_value: bNum,',
  '          current_value: cNum,',
  '          delta_absolute: deltaAbs,',
  '          delta_percentage: deltaPct,',
  '        });',
  '        hasAnyDelta = true;',
  '      }',
  '    }',
  '',
  '    if (!hasAnyDelta) {',
  '      deltas.push({',
  '        review_session_id: reviewSessionId,',
  '        organization_id: orgId,',
  '        employee_id: employeeId,',
  "        metric: 'net_pay',",
  "        change_type: 'no_change',",
  "        baseline_value: getFieldValue(baselineEmp, 'net_pay') ?? 0,",
  "        current_value: getFieldValue(currentEmp, 'net_pay') ?? 0,",
  '        delta_absolute: 0,',
  '        delta_percentage: 0,',
  '      });',
  '    }',
  '  }',
  '}',
  '',
  'if (deltas.length === 0) {',
  "  return [{ json: { reviewSessionId, orgId, orgTier, insertedDeltas: [], currentEmployees, baselineEmployees, deltaCount: 0, message: 'No deltas' } }];",
  '}',
  '',
  '// Insert deltas in batches',
  'const BATCH_SIZE = 200;',
  'const insertedDeltas = [];',
  'let deltasToInsert = deltas;',
  '',
  '// Try first batch; if expanded metrics fail, fall back to base metrics',
  'const firstBatch = deltasToInsert.slice(0, Math.min(BATCH_SIZE, deltasToInsert.length));',
  "const testRes = await fetch(SUPABASE_URL + '/rest/v1/payroll_delta', {",
  "  method: 'POST',",
  '  headers,',
  '  body: JSON.stringify(firstBatch),',
  '});',
  '',
  'if (!testRes.ok) {',
  '  deltasToInsert = deltas.filter(d =>',
  '    BASE_METRICS.includes(d.metric) ||',
  "    d.change_type === 'new_employee' ||",
  "    d.change_type === 'removed_employee'",
  '  );',
  '  for (let i = 0; i < deltasToInsert.length; i += BATCH_SIZE) {',
  '    const batch = deltasToInsert.slice(i, i + BATCH_SIZE);',
  "    const res = await fetch(SUPABASE_URL + '/rest/v1/payroll_delta', {",
  "      method: 'POST',",
  '      headers,',
  '      body: JSON.stringify(batch),',
  '    });',
  "    if (!res.ok) throw new Error('Failed to insert deltas: ' + await res.text());",
  '    const data = await res.json();',
  '    insertedDeltas.push(...data);',
  '  }',
  '} else {',
  '  const testData = await testRes.json();',
  '  insertedDeltas.push(...testData);',
  '  for (let i = BATCH_SIZE; i < deltasToInsert.length; i += BATCH_SIZE) {',
  '    const batch = deltasToInsert.slice(i, i + BATCH_SIZE);',
  "    const res = await fetch(SUPABASE_URL + '/rest/v1/payroll_delta', {",
  "      method: 'POST',",
  '      headers,',
  '      body: JSON.stringify(batch),',
  '    });',
  "    if (!res.ok) throw new Error('Failed to insert deltas: ' + await res.text());",
  '    const data = await res.json();',
  '    insertedDeltas.push(...data);',
  '  }',
  '}',
  '',
  'return [{',
  '  json: {',
  '    reviewSessionId,',
  '    orgId,',
  '    orgTier,',
  '    insertedDeltas,',
  '    currentEmployees,',
  '    baselineEmployees,',
  '    deltaCount: insertedDeltas.length,',
  '  }',
  '}];',
].join('\n');

// ============================================================================
// Code Node 3: Apply Rules & Insert Judgements
// ============================================================================

const codeNode3 = [
  '// ==========================================================================',
  '// Code Node 3: Apply Rules & Insert Judgements',
  '// Auto-generated by scripts/generate-n8n-workflow.js',
  '// Contains all ' + totalRuleCount + ' rules from lib/rules/',
  '// ==========================================================================',
  '',
  fetchPolyfill,
  '',
  'const SUPABASE_URL = $env.SUPABASE_URL;',
  'const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;',
  '',
  'const input = $input.first().json;',
  'const { reviewSessionId, orgId, orgTier, insertedDeltas, currentEmployees, baselineEmployees } = input;',
  '',
  'const headers = {',
  "  'apikey': SUPABASE_KEY,",
  "  'Authorization': 'Bearer ' + SUPABASE_KEY,",
  "  'Content-Type': 'application/json',",
  '};',
  '',
  '// ===== Rules (auto-generated from lib/rules/*.ts) =====',
  '',
  combinedRulesCode,
  '',
  allRulesArrayCode,
  '',
  '// ===== Rule Engine =====',
  '',
  ruleEngineCode,
  '',
  '// ===== Apply Rules to Deltas =====',
  '',
  'const currentMap = new Map(currentEmployees.map(e => [e.employee_id, e]));',
  'const baselineMap = new Map(baselineEmployees.map(e => [e.employee_id, e]));',
  '',
  'const allJudgementRows = [];',
  '',
  '// Group deltas by employee',
  'const deltasByEmployee = new Map();',
  'for (const delta of insertedDeltas) {',
  '  const empDeltas = deltasByEmployee.get(delta.employee_id) || [];',
  '  empDeltas.push(delta);',
  '  deltasByEmployee.set(delta.employee_id, empDeltas);',
  '}',
  '',
  'for (const [employeeId, empDeltas] of deltasByEmployee) {',
  '  const currentEmp = currentMap.get(employeeId);',
  '  const baselineEmp = baselineMap.get(employeeId) || null;',
  '  const seenRuleIds = new Set();',
  '',
  "  const repDelta = empDeltas.find(d => d.metric === 'net_pay') || empDeltas[0];",
  '',
  '  // Employee-level rules',
  '  const empRecord = currentEmp || baselineEmp;',
  '  if (empRecord) {',
  '    const empJudgements = applyEmployeeRules(',
  '      empRecord,',
  '      currentEmp ? baselineEmp : null,',
  '      currentEmployees,',
  '      baselineEmployees,',
  '      orgTier,',
  '    );',
  '    for (const j of empJudgements) {',
  '      if (!seenRuleIds.has(j.rule_id)) {',
  '        seenRuleIds.add(j.rule_id);',
  '        allJudgementRows.push({',
  '          delta_id: repDelta.delta_id,',
  '          is_material: j.is_material,',
  '          is_blocker: j.is_blocker,',
  '          confidence_score: j.confidence_score,',
  '          reasoning: j.reasoning,',
  '          rule_id: j.rule_id,',
  '        });',
  '      }',
  '    }',
  '  }',
  '',
  '  // Delta-specific rules',
  '  for (const delta of empDeltas) {',
  "    if (delta.change_type === 'new_employee' || delta.change_type === 'removed_employee') continue;",
  '',
  '    if (currentEmp) {',
  '      const deltaJudgements = applyDeltaRules(',
  '        currentEmp,',
  '        baselineEmp,',
  '        delta.metric,',
  '        delta.current_value ?? 0,',
  '        delta.baseline_value,',
  '        currentEmployees,',
  '        baselineEmployees,',
  '        orgTier,',
  '      );',
  '      for (const j of deltaJudgements) {',
  '        if (!seenRuleIds.has(j.rule_id)) {',
  '          seenRuleIds.add(j.rule_id);',
  '          allJudgementRows.push({',
  '            delta_id: delta.delta_id,',
  '            is_material: j.is_material,',
  '            is_blocker: j.is_blocker,',
  '            confidence_score: j.confidence_score,',
  '            reasoning: j.reasoning,',
  '            rule_id: j.rule_id,',
  '          });',
  '        }',
  '      }',
  '    }',
  '  }',
  '}',
  '',
  'const materialCount = allJudgementRows.filter(j => j.is_material).length;',
  'const blockerCount = allJudgementRows.filter(j => j.is_blocker).length;',
  '',
  '// Insert judgements in batches',
  'const BATCH_SIZE = 200;',
  'if (allJudgementRows.length > 0) {',
  '  for (let i = 0; i < allJudgementRows.length; i += BATCH_SIZE) {',
  '    const batch = allJudgementRows.slice(i, i + BATCH_SIZE);',
  "    const res = await fetch(SUPABASE_URL + '/rest/v1/material_judgement', {",
  "      method: 'POST',",
  '      headers,',
  '      body: JSON.stringify(batch),',
  '    });',
  "    if (!res.ok) throw new Error('Failed to insert judgements: ' + await res.text());",
  '  }',
  '}',
  '',
  'return [{',
  '  json: {',
  '    reviewSessionId,',
  '    judgementCount: allJudgementRows.length,',
  '    materialCount,',
  '    blockerCount,',
  '    deltaCount: insertedDeltas.length,',
  '  }',
  '}];',
].join('\n');

// ============================================================================
// Code Node 4: Update Session Status
// ============================================================================

const codeNode4 = [
  '// ==========================================================================',
  '// Code Node 4: Update Session Status',
  '// Auto-generated by scripts/generate-n8n-workflow.js',
  '// ==========================================================================',
  '',
  fetchPolyfill,
  '',
  'const SUPABASE_URL = $env.SUPABASE_URL;',
  'const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;',
  '',
  'const input = $input.first().json;',
  'const { reviewSessionId, judgementCount, materialCount, blockerCount, deltaCount } = input;',
  '',
  'const headers = {',
  "  'apikey': SUPABASE_KEY,",
  "  'Authorization': 'Bearer ' + SUPABASE_KEY,",
  "  'Content-Type': 'application/json',",
  "  'Prefer': 'return=representation',",
  '};',
  '',
  '// Update review session status to completed',
  'const res = await fetch(',
  "  SUPABASE_URL + '/rest/v1/review_session?review_session_id=eq.' + reviewSessionId,",
  '  {',
  "    method: 'PATCH',",
  '    headers,',
  '    body: JSON.stringify({',
  "      status: 'completed',",
  '    }),',
  '  }',
  ');',
  '',
  "if (!res.ok) throw new Error('Failed to update review session: ' + await res.text());",
  '',
  'return [{',
  '  json: {',
  '    success: true,',
  '    reviewSessionId,',
  '    deltaCount,',
  '    judgementCount,',
  '    materialCount,',
  '    blockerCount,',
  '  }',
  '}];',
].join('\n');

// ============================================================================
// Build n8n Workflow JSON
// ============================================================================

console.log('Building n8n workflow JSON...');

const workflow = {
  name: 'PPG - Process Review',
  nodes: [
    {
      parameters: {
        path: 'ppg-process-review',
        httpMethod: 'POST',
        responseMode: 'responseNode',
        options: {},
      },
      id: 'a1b2c3d4-0001-4000-8000-000000000001',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [0, 0],
      webhookId: 'a1b2c3d4-0001-4000-8000-000000000099',
    },
    {
      parameters: {
        jsCode: codeNode1,
        mode: 'runOnceForAllItems',
      },
      id: 'a1b2c3d4-0001-4000-8000-000000000002',
      name: 'Fetch Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [300, 0],
    },
    {
      parameters: {
        jsCode: codeNode2,
        mode: 'runOnceForAllItems',
      },
      id: 'a1b2c3d4-0001-4000-8000-000000000003',
      name: 'Calculate Deltas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [600, 0],
    },
    {
      parameters: {
        jsCode: codeNode3,
        mode: 'runOnceForAllItems',
      },
      id: 'a1b2c3d4-0001-4000-8000-000000000004',
      name: 'Apply Rules',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [900, 0],
    },
    {
      parameters: {
        jsCode: codeNode4,
        mode: 'runOnceForAllItems',
      },
      id: 'a1b2c3d4-0001-4000-8000-000000000005',
      name: 'Update Status',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1200, 0],
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify($input.first().json) }}',
      },
      id: 'a1b2c3d4-0001-4000-8000-000000000006',
      name: 'Respond',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [1500, 0],
    },
  ],
  connections: {
    'Webhook': {
      main: [
        [{ node: 'Fetch Data', type: 'main', index: 0 }],
      ],
    },
    'Fetch Data': {
      main: [
        [{ node: 'Calculate Deltas', type: 'main', index: 0 }],
      ],
    },
    'Calculate Deltas': {
      main: [
        [{ node: 'Apply Rules', type: 'main', index: 0 }],
      ],
    },
    'Apply Rules': {
      main: [
        [{ node: 'Update Status', type: 'main', index: 0 }],
      ],
    },
    'Update Status': {
      main: [
        [{ node: 'Respond', type: 'main', index: 0 }],
      ],
    },
  },
  active: false,
  settings: {
    executionOrder: 'v1',
  },
  versionId: '1',
  tags: [],
};

// ============================================================================
// Write output
// ============================================================================

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const jsonOutput = JSON.stringify(workflow, null, 2);
fs.writeFileSync(OUTPUT_FILE, jsonOutput, 'utf8');

const sizeKB = Math.round(jsonOutput.length / 1024);
console.log('Generated: ' + OUTPUT_FILE);
console.log('File size: ' + sizeKB + ' KB');
console.log('Nodes: ' + workflow.nodes.length);
console.log('Rules embedded: ' + totalRuleCount);
console.log('');
console.log('Next steps:');
console.log('  1. Import this JSON into n8n (Settings -> Import Workflow)');
console.log('  2. Set environment variables on VPS:');
console.log('     - SUPABASE_URL');
console.log('     - SUPABASE_SERVICE_ROLE_KEY');
console.log('  3. Activate the workflow in n8n');
console.log('  4. Test with: curl -X POST https://n8n.payrollshield.cloud/webhook/ppg-process-review \\');
console.log('       -H "Content-Type: application/json" \\');
console.log('       -d \'{"review_session_id": "your-session-id"}\'');
