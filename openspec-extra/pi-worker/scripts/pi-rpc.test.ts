import { describe, expect, it } from 'bun:test';
import {
  MODES,
  buildInitialPrompt,
  checkModelAndThinking,
  loadAllowedModels,
  loadModeDirectives,
  parseArgs,
  printAvailableModels,
  resolveSessionId,
} from './pi-rpc.ts';

// ============================================================ Shared core
describe('registry: models.json (single source for both modes)', () => {
  it('loads a non-empty registry with provider + levels per model', () => {
    const models = loadAllowedModels();
    const entries = Object.entries(models);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, def] of entries) {
      expect(typeof def.provider).toBe('string');
      expect(Array.isArray(def.levels)).toBe(true);
    }
  });

  it('prints the discovery map as minified JSON {model: levels}', () => {
    const models = loadAllowedModels();
    const out: string[] = [];
    const orig = console.log;
    console.log = (line?: unknown) => out.push(String(line));
    try {
      printAvailableModels(models);
    } finally {
      console.log = orig;
    }
    expect(out).toHaveLength(1);
    const flat = JSON.parse(out[0]);
    const first = Object.keys(models)[0];
    expect(flat[first]).toEqual(models[first].levels);
  });
});

describe('shared core: model and level validation', () => {
  it('accepts undefined model and level (pi defaults)', () => {
    expect(checkModelAndThinking(undefined, undefined).valid).toBe(true);
  });

  it('resolves a bare model to canonical <provider>/<model>', () => {
    const models = loadAllowedModels();
    const name = Object.keys(models)[0];
    const check = checkModelAndThinking(name, undefined, models);
    expect(check.valid).toBe(true);
    expect(check.canonicalModel).toBe(`${models[name].provider}/${name}`);
  });

  it('accepts a correctly qualified model as-is', () => {
    const models = loadAllowedModels();
    const name = Object.keys(models)[0];
    const qualified = `${models[name].provider}/${name}`;
    const check = checkModelAndThinking(qualified, undefined, models);
    expect(check.valid).toBe(true);
    expect(check.canonicalModel).toBe(qualified);
  });

  it('rejects unknown models', () => {
    expect(checkModelAndThinking('not-a-real-model', undefined).valid).toBe(false);
  });

  it('rejects a qualified model with a mismatched provider', () => {
    const models = loadAllowedModels();
    const name = Object.keys(models)[0];
    const check = checkModelAndThinking(`wrong-provider/${name}`, undefined, models);
    expect(check.valid).toBe(false);
  });

  it('rejects an unsupported level for bare and qualified models', () => {
    const models = loadAllowedModels();
    const name = Object.keys(models)[0];
    const levels = models[name].levels;
    const bad = levels.includes('ultra-impossible') ? 'nope' : 'ultra-impossible';
    expect(checkModelAndThinking(name, bad, models).valid).toBe(false);
    expect(checkModelAndThinking(`${models[name].provider}/${name}`, bad, models).valid).toBe(false);
  });

  it('rejects --level without a model', () => {
    const check = checkModelAndThinking(undefined, 'high');
    expect(check.valid).toBe(false);
    if (!check.valid) expect(check.error).toContain('--level cannot be specified without --model');
  });
});

describe('shared core: session ids are mode-scoped', () => {
  it('derives openspec-<mode>-<slug> for every mode (mode matrix)', () => {
    for (const mode of MODES) {
      expect(resolveSessionId(mode, 'my-inquiry')).toBe(`openspec-${mode}-my-inquiry`);
    }
  });

  it('sanitizes slugs and falls back for empty input', () => {
    expect(resolveSessionId('apply', 'My Change!!')).toBe('openspec-apply-My-Change');
    expect(resolveSessionId('explore', '!!!')).toBe('openspec-explore-task');
  });
});

describe('shared core: CLI parsing', () => {
  it('parses the two-flag form for both modes (mode matrix)', () => {
    for (const mode of MODES) {
      const opts = parseArgs(['--mode', mode, '--session', 'slug-1', '--request', 'demo']);
      expect(opts.mode).toBe(mode);
      expect(opts.sessionSlug).toBe('slug-1');
      expect(opts.requestText).toBe('demo');
      expect(opts.timeoutMs).toBe(300_000);
      expect(opts.verbose).toBe(false);
    }
  });

  it('keeps the raw model; canonical form resolves in checkModelAndThinking', () => {
    const models = loadAllowedModels();
    const name = Object.keys(models)[0];
    const opts = parseArgs(['--mode', 'explore', '--model', name, '--session', 's', '--request', 'r']);
    expect(opts.model).toBe(name);
    expect(checkModelAndThinking(opts.model, undefined).canonicalModel).toBe(
      `${models[name].provider}/${name}`
    );
  });

  it('parses --level, --timeout, --root and --verbose', () => {
    const opts = parseArgs([
      '--mode', 'apply', '--level', 'high', '--timeout', '1200', '--root', '/tmp/ws', '--verbose',
    ]);
    expect(opts.level).toBe('high');
    expect(opts.timeoutMs).toBe(1200);
    expect(opts.explicitRoot).toBe('/tmp/ws');
    expect(opts.verbose).toBe(true);
  });

  it('leaves mode undefined when --mode is absent (catalog path)', () => {
    expect(parseArgs([]).mode).toBeUndefined();
  });

  it('has no --reply or --continue flag surface', () => {
    const opts = parseArgs(['--reply', 'x', '--continue'] as string[]) as Record<string, unknown>;
    expect(opts.replyMessage).toBeUndefined();
    expect(opts.continueSession).toBeUndefined();
  });
});

// ============================================================ Mode branches
describe('mode branches: initial prompt shape (mode matrix)', () => {
  it('apply routes to /skill:openspec-apply-change with the implementation mandate', () => {
    const prompt = buildInitialPrompt('apply', 'my-change');
    expect(prompt.startsWith('/skill:openspec-apply-change my-change')).toBe(true);
    expect(prompt).toContain('SUPERVISOR MANDATE');
    expect(prompt).toContain("mark its checkbox '- [x]'");
  });

  it('explore routes to /skill:openspec-explore with the read-only mandate', () => {
    const prompt = buildInitialPrompt('explore', 'how does X work');
    expect(prompt.startsWith('/skill:openspec-explore how does X work')).toBe(true);
    expect(prompt).toContain('read-only exploration mode');
    expect(prompt).toContain('Do NOT end a completed exploration report with conversational follow-up');
  });
});

describe('mode branches: mode catalog', () => {
  it('loads both mode directives from sibling references', () => {
    const directives = loadModeDirectives();
    expect(Object.keys(directives).sort()).toEqual(['apply', 'explore']);
    for (const mode of MODES) {
      expect(directives[mode].length).toBeGreaterThan(100);
      expect(directives[mode].startsWith('---')).toBe(true);
    }
  });
});
