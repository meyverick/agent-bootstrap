#!/usr/bin/env bun
/**
 * validate-routing.ts — Semantic routing validation for skills
 * Usage: bun validate-routing.ts <skill-dir>
 * Output: unified JSON envelope {target, pass, checks:[{id,status,detail}], summary}
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type CheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

interface CheckEntry {
  id: string;
  status: CheckStatus;
  detail: string;
}

interface ValidationSummary {
  total: number;
  pass: number;
  fail: number;
  warn: number;
  skip: number;
}

interface ValidationReport {
  target: string;
  pass: boolean;
  checks: CheckEntry[];
  summary: ValidationSummary;
}

const skillDir = process.argv[2];

if (!skillDir || skillDir === '-h' || skillDir === '--help') {
  if (skillDir === '-h' || skillDir === '--help') {
    console.log('Usage: bun validate-routing.ts <skill-dir>');
    process.exit(0);
  }
  console.error(
    JSON.stringify({
      error: 'Usage: bun validate-routing.ts <skill-dir>'
    })
  );
  process.exit(1);
}

const skillFile = join(skillDir, 'SKILL.md');

if (!existsSync(skillFile)) {
  const report: ValidationReport = {
    target: skillDir,
    pass: false,
    checks: [{ id: 'routing.skill-file', status: 'FAIL', detail: 'SKILL.md not found' }],
    summary: { total: 1, pass: 0, fail: 1, warn: 0, skip: 0 }
  };
  console.log(JSON.stringify(report));
  process.exit(1);
}

const skillMd = readFileSync(skillFile, 'utf-8');
const checks: CheckEntry[] = [];

function add(id: string, passed: boolean, detail: string): void {
  checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
}

// Extract frontmatter
const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';

// Extract body (everything after frontmatter)
const bodyStart = skillMd.indexOf('---', 3);
const body = bodyStart !== -1 ? skillMd.slice(bodyStart + 3) : skillMd;

// Extract description
const descMatch = frontmatter.match(/^description:\s*([\s\S]*?)(?=\n\w+:|(?![\s\S]))/m);
const description = descMatch ? descMatch[1].replace(/^>\s*\n?/, '').trim() : '';

// CHECK 1: description within spec length (1-1024)
const descLenOk = description.length >= 1 && description.length <= 1024;
add(
  'routing.description-length',
  descLenOk,
  `${description.length} chars (spec: 1-1024) — description is the single routing surface`
);

// CHECK 2: no legacy routing keys — routing lives in the description
const hasLegacy = /^(positive_triggers|anti_triggers|runtime):/m.test(frontmatter);
add(
  'routing.spec-keys',
  !hasLegacy,
  hasLegacy
    ? 'Legacy trigger/runtime keys found in frontmatter — move activation/exclusion routing into the description'
    : 'Frontmatter carries spec keys only; routing lives in the description'
);

// CHECK 3: Description contains activation phrasing (house: "Use when" / "Use this skill when")
const hasUseWhen = /use (?:this skill )?when/i.test(description);
add(
  'routing.use-when',
  hasUseWhen,
  hasUseWhen
    ? 'Found "Use when" phrasing'
    : 'Missing "Use when" phrasing in description — imperative phrasing helps agents decide activation'
);

// CHECK 4: Description contains exclusion phrasing ("Do NOT use when" / "Do NOT use for" / "Do NOT load")
const hasNotUse = /do not use|don't use|do not load/i.test(description);
add(
  'routing.negative-scope',
  hasNotUse,
  hasNotUse
    ? 'Found "Do NOT use when" phrasing'
    : 'Missing negative scope in description — prevents over-firing on similar-domain queries'
);

// CHECK 5: Description-body alignment (keywords in description appear in body)
let alignmentScore = 0;
let alignmentTotal = 0;
if (description) {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'with',
    'this',
    'that',
    'when',
    'not',
    'use',
    'from',
    'are',
    'was',
    'have',
    'has',
    'will',
    'can',
    'should',
    'does',
    'its'
  ]);
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const uniqueWords = Array.from(new Set(words));
  alignmentTotal = Math.min(uniqueWords.length, 10);

  for (const word of uniqueWords.slice(0, 10)) {
    if (body.toLowerCase().includes(word)) {
      alignmentScore++;
    }
  }
}

const alignmentRatio = alignmentTotal > 0 ? alignmentScore / alignmentTotal : 0;
add(
  'routing.alignment',
  alignmentRatio >= 0.5,
  `${alignmentScore}/${alignmentTotal} description keywords found in body (${Math.round(
    alignmentRatio * 100
  )}% alignment) — frontmatter-only indexing loses 29-44% recall`
);

// CHECK 6: Single-responsibility verification
let singleResponsibility = true;
let srDetail = 'Single atomic intent detected';
if (description) {
  const compoundMarkers = /\b(and also\b|\badditionally\b|\bas well as\b)/i;
  if (compoundMarkers.test(description)) {
    singleResponsibility = false;
    srDetail = 'Compound intent detected. Description contains multiple operations joined by "and also" or "additionally".';
  }

  const actionVerbs = description.match(
    /\b(?:create|delete|update|modify|analyze|generate|process|manage|handle|configure|deploy|monitor)\b/gi
  );
  if (actionVerbs && new Set(actionVerbs.map((v) => v.toLowerCase())).size > 2) {
    singleResponsibility = false;
    srDetail = `Multiple distinct action verbs detected (${Array.from(
      new Set(actionVerbs.map((v) => v.toLowerCase()))
    ).join(', ')}). Consider splitting into separate skills.`;
  }
}
add(
  'routing.atomic-intent',
  singleResponsibility,
  `${srDetail} — multi-domain descriptions cause trigger dilution`
);

// Unified envelope
const passCount = checks.filter((c) => c.status === 'PASS').length;
const report: ValidationReport = {
  target: skillDir,
  pass: passCount === checks.length,
  checks,
  summary: {
    total: checks.length,
    pass: passCount,
    fail: checks.filter((c) => c.status === 'FAIL').length,
    warn: checks.filter((c) => c.status === 'WARN').length,
    skip: checks.filter((c) => c.status === 'SKIP').length
  }
};

console.log(JSON.stringify(report));
process.exit(report.pass ? 0 : 1);
