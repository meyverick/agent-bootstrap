#!/usr/bin/env bun
/**
 * validate-structure.ts — Check skill directory structure and SKILL.md compliance
 * Usage: bun validate-structure.ts <skill-dir>
 * Output: unified JSON envelope {target, pass, checks:[{id,status,detail}], summary}
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

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
  name?: string;
  description_length?: number;
  checks: CheckEntry[];
  summary: ValidationSummary;
}

const skillDir = process.argv[2];

if (!skillDir || skillDir === '-h' || skillDir === '--help') {
  if (skillDir === '-h' || skillDir === '--help') {
    console.log('Usage: bun validate-structure.ts <skill-dir>');
    process.exit(0);
  }
  console.error(
    JSON.stringify({
      error: 'Usage: bun validate-structure.ts <skill-dir>'
    })
  );
  process.exit(1);
}

const checks: CheckEntry[] = [];

function add(id: string, severity: CheckStatus, detail: string): void {
  checks.push({ id, status: severity, detail });
}
const fail = (id: string, detail: string): void => add(id, 'FAIL', detail);
const warn = (id: string, detail: string): void => add(id, 'WARN', detail);
const pass = (id: string, detail: string): void => add(id, 'PASS', detail);

// Check SKILL.md exists
if (!existsSync(join(skillDir, 'SKILL.md'))) {
  const report: ValidationReport = {
    target: skillDir,
    pass: false,
    checks: [{ id: 'structure.skill-file', status: 'FAIL', detail: 'SKILL.md not found' }],
    summary: { total: 1, pass: 0, fail: 1, warn: 0, skip: 0 }
  };
  console.log(JSON.stringify(report));
  process.exit(1);
}

// Read SKILL.md
const skillMd = readFileSync(join(skillDir, 'SKILL.md'), 'utf-8');

// Extract frontmatter
const frontmatterMatch = skillMd.match(/^---\n([\s\S]*?)\n---/);
let frontmatter = '';

if (frontmatterMatch) {
  frontmatter = frontmatterMatch[1];
} else {
  fail('structure.frontmatter', 'No frontmatter found in SKILL.md');
}

// Check name field
const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
const name = nameMatch ? nameMatch[1].replace(/"/g, '').trim() : '';

if (!name) {
  fail('structure.name', "Missing required 'name' field in frontmatter");
} else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
  fail(
    'structure.name',
    `Invalid name format: '${name}'. Must be lowercase letters, numbers, hyphens only. No leading/trailing hyphens.`
  );
} else if (name.length > 64) {
  fail('structure.name', `Name too long: ${name.length} chars. Maximum 64 characters.`);
} else if (name.includes('--')) {
  fail('structure.name', `Name contains consecutive hyphens: '${name}'`);
} else {
  pass('structure.name', `Valid name: '${name}'`);
}

// Check name matches directory
const dirName = basename(skillDir);
if (name && name !== dirName) {
  warn(
    'structure.name-dir-match',
    `Name '${name}' does not match directory name '${dirName}'. Pi allows this, but the Agent Skills standard requires matching.`
  );
}

// Check description field (handles both single-line and multi-line YAML)
let desc = '';
let descStarted = false;
for (const fmLine of frontmatter.split('\n')) {
  if (fmLine.startsWith('description:')) {
    descStarted = true;
    const inline = fmLine.replace(/^description:\s*>?-?\s*/, '');
    if (inline.trim()) desc = inline.trim();
    continue;
  }
  if (descStarted) {
    if (/^[a-zA-Z_-]+\s*:/.test(fmLine) || fmLine.startsWith('---')) {
      break;
    }
    const trimmed = fmLine.trim();
    if (trimmed) {
      desc = desc ? desc + ' ' + trimmed : trimmed;
    }
  }
}

if (!desc) {
  fail('structure.description', "Missing required 'description' field in frontmatter");
} else if (desc.length > 1024) {
  fail('structure.description', `Description too long: ${desc.length} chars. Maximum 1024 characters.`);
} else {
  pass('structure.description', `${desc.length} chars, within limit`);
}

// Description phrasing warnings
if (desc && !/use (?:this skill )?when/i.test(desc)) {
  warn('structure.use-when', "Description should contain 'Use when' phrasing for imperative intent");
}

if (desc && !/do not use|don't use|do not load/i.test(desc)) {
  warn('structure.negative-scope', "Description should contain 'Do NOT use when' phrasing for negative scope");
}

if (desc) {
  const compoundMarkers = /\b(and also\b|\badditionally\b|\bas well as\b)/i;
  if (compoundMarkers.test(desc)) {
    warn(
      'structure.compound-intent',
      'Description may contain compound intent (multiple operations). Consider splitting into separate skills.'
    );
  }
}

// Legacy routing keys are REJECTED (spec: frontmatter keys ⊆ name, description,
// license, compatibility, metadata, allowed-tools — routing lives in the description)
const legacyKeyMatch = frontmatter.match(/^(positive_triggers|anti_triggers|runtime):/m);
if (legacyKeyMatch) {
  fail(
    'structure.spec-keys',
    `Legacy non-spec frontmatter key '${legacyKeyMatch[1]}:' found — activation/exclusion routing belongs in the description (Use when / Do NOT use when); runtime environment belongs in compatibility.`
  );
} else {
  pass('structure.spec-keys', 'spec keys only (no legacy trigger/runtime keys)');
}

// Description routing: BOTH activation and exclusion phrasing required
if (desc) {
  const hasUse = /use (?:this skill )?when/i.test(desc);
  const hasNotUse = /do not use|don't use|do not load/i.test(desc);
  if (hasUse && hasNotUse) {
    pass('structure.description-routing', 'Use when + Do NOT use when present in description');
  } else {
    warn(
      'structure.description-routing',
      `Description routing incomplete (Use when: ${hasUse}, Do NOT use when: ${hasNotUse}) — activation examples and exclusions belong inside the description`
    );
  }
} else {
  warn('structure.description-routing', 'No description to route on');
}

// Runtime contract when scripts exist (.ts, .mjs, .js, .py, .sh)
const scriptsDir = join(skillDir, 'scripts');
const SCRIPT_EXTENSIONS = ['.ts', '.mjs', '.js', '.py', '.sh'];
if (existsSync(scriptsDir)) {
  const scriptFiles = readdirSync(scriptsDir).filter((f) =>
    SCRIPT_EXTENSIONS.some((ext) => f.endsWith(ext))
  );
  if (scriptFiles.length > 0) {
    if (!/^compatibility:/m.test(frontmatter)) {
      warn('structure.compatibility-env', 'Scripts exist but no compatibility (environment) declared in frontmatter');
    } else {
      pass('structure.compatibility-env', 'compatibility declares environment for bundled scripts');
    }
  }
}

// Hardcoded absolute paths in script files
if (existsSync(scriptsDir)) {
  const scriptFiles = readdirSync(scriptsDir).filter((f) =>
    SCRIPT_EXTENSIONS.some((ext) => f.endsWith(ext))
  );
  for (const file of scriptFiles) {
    const content = readFileSync(join(scriptsDir, file), 'utf-8');
    const absPathPatterns = [
      /['"]\/home\//,
      /['"]\/root\//,
      /['"]\/usr\/(?!local\/bin)(?!share)/,
      /['"]C:\\\\/
    ];
    for (const pattern of absPathPatterns) {
      if (pattern.test(content)) {
        fail(`structure.portability.${file}`, `Hardcoded absolute path detected in scripts/${file}. Use relative paths resolved via import.meta.url.`);
        break;
      }
    }
    if (/\.pi\/skills\/|\.agents\/skills\//.test(content)) {
      fail(`structure.portability.${file}`, `Harness-specific directory reference detected in scripts/${file}. Scripts must be portable across harnesses.`);
    }
  }
  if (!checks.some((c) => c.id.startsWith('structure.portability.') && c.status === 'FAIL') && scriptFiles.length > 0) {
    pass('structure.portability', 'No hardcoded/harness-specific paths in scripts');
  }
}

// Directory structure conventions
for (const dir of ['scripts', 'references', 'assets']) {
  if (!existsSync(join(skillDir, dir))) {
    warn(`structure.dir-${dir}`, `Missing ${dir}/ directory`);
  } else {
    pass(`structure.dir-${dir}`, `${dir}/ present`);
  }
}

// File references in SKILL.md resolve
const lines = skillMd.split('\n');
for (const line of lines) {
  const refMatch = line.match(/\]\(([^)]+)\)/);
  if (refMatch) {
    const ref = refMatch[1];
    if (ref && !ref.startsWith('http') && !ref.startsWith('#') && !ref.startsWith('mailto:')) {
      if (!existsSync(join(skillDir, ref))) {
        warn('structure.reference', `File reference not found: ${ref}`);
      }
    }
  }
}

// Unified envelope
const fails = checks.filter((c) => c.status === 'FAIL').length;
const report: ValidationReport = {
  target: skillDir,
  pass: fails === 0,
  name,
  description_length: desc.length,
  checks,
  summary: {
    total: checks.length,
    pass: checks.filter((c) => c.status === 'PASS').length,
    fail: fails,
    warn: checks.filter((c) => c.status === 'WARN').length,
    skip: checks.filter((c) => c.status === 'SKIP').length
  }
};

console.log(JSON.stringify(report));
process.exit(fails > 0 ? 1 : 0);
