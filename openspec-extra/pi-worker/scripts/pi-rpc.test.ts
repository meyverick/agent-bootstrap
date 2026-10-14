import { describe, expect, it } from 'bun:test';
import {
  MODES,
  buildInitialPrompt,
  checkModelAndThinking,
  formatPromptSettlement,
  loadAllowedModels,
  loadModeDirectives,
  parseArgs,
  printAvailableModels,
  validateSessionId,
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

describe('shared core: caller-owned session ids pass through unchanged', () => {
  it('accepts the same id for every mode (mode matrix)', () => {
    for (const mode of MODES) {
      expect(validateSessionId('openspec-my-inquiry').valid).toBe(true);
      expect(mode).toBeString();
    }
  });

  it('accepts lowercase words separated by single hyphens', () => {
    for (const id of ['foo', 'a', 'openspec-fix-auth', 'explore-x-y']) {
      expect(validateSessionId(id).valid).toBe(true);
    }
  });

  it('rejects empty, uppercase, digits, spaces, dots, slashes and bad hyphens', () => {
    const bad = ['', 'Foo', 'has space', 'has_digit', 'v2', 'a--b', '-a', 'a-', 'with.dot', 'with/slash', 'openspec-'];
    for (const id of bad) {
      const check = validateSessionId(id === '' ? undefined : id);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('--session');
    }
  });

  it('rejects previously tolerated inputs instead of sanitizing them', () => {
    for (const id of ['My Change!!', '!!!', 'openspec-apply-My-Change']) {
      expect(validateSessionId(id).valid).toBe(false);
    }
  });
});

describe('shared core: CLI parsing', () => {
  it('parses the session+prompt form for every mode (mode matrix)', () => {
    for (const mode of MODES) {
      const opts = parseArgs(['--mode', mode, '--session', 'openspec-demo', '--prompt', 'demo']);
      expect(opts.mode).toBe(mode);
      expect(opts.sessionId).toBe('openspec-demo');
      expect(opts.promptText).toBe('demo');
      expect(opts.timeoutMs).toBe(300_000);
      expect(opts.verbose).toBe(false);
    }
  });

it('records the retired --request flag instead of parsing it as a prompt', () => {
    const opts = parseArgs(['--mode', 'explore', '--session', 'openspec-demo', '--request', 'r']);
    expect(opts.retiredRequest).toBe('r');
    expect(opts.promptText).toBeUndefined();
  });

it('keeps the raw model; canonical form resolves in checkModelAndThinking', () => {
    const models = loadAllowedModels();
    const name = Object.keys(models)[0];
    const opts = parseArgs(['--mode', 'explore', '--model', name, '--session', 'openspec-demo', '--prompt', 'r']);
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

it('prompt sends the text unchanged with no prefix or mandate', () => {
    const text = 'summarize this log';
    const prompt = buildInitialPrompt('prompt', text);
    expect(prompt).toBe(text);
    expect(prompt).not.toContain('/skill:');
    expect(prompt).not.toContain('SUPERVISOR MANDATE');
  });

  it('routes apply/explore clarification follow-ups via --mode prompt with unchanged session and raw text', () => {
    const sessionId = 'openspec-fix-oauth-two-a';
    const answer = 'Use SQLite for local storage and mark task 1.2 complete in tasks.md.';
    const opts = parseArgs(['--mode', 'prompt', '--session', sessionId, '--prompt', answer]);
    expect(opts.mode).toBe('prompt');
    expect(opts.sessionId).toBe(sessionId);
    expect(validateSessionId(opts.sessionId).valid).toBe(true);
    const composed = buildInitialPrompt('prompt', opts.promptText as string);
    expect(composed).toBe(answer);
    expect(composed).not.toContain('/skill:openspec-apply-change');
    expect(composed).not.toContain('/skill:openspec-explore');
    expect(composed).not.toContain('SUPERVISOR MANDATE');
  });
});

describe('mode branches: mode catalog', () => {
  it('loads apply/explore directives and describes raw prompt delivery', () => {
    const directives = loadModeDirectives();
    expect(Object.keys(directives).sort()).toEqual(['apply', 'explore', 'prompt']);
    for (const mode of ['apply', 'explore'] as const) {
      expect(directives[mode].length).toBeGreaterThan(100);
      expect(directives[mode].startsWith('---')).toBe(true);
    }
    expect(directives.prompt).toContain('Raw prompt delivery');
  });

  it('resolves directive filenames portably via basename without slash-only split', async () => {
    const src = await Bun.file(new URL('./pi-rpc.ts', import.meta.url)).text();
    expect(src).toContain('join(refDir, basename(file))');
    expect(src).not.toContain('file.split("/")');
    const directives = loadModeDirectives();
    expect(directives.apply).toContain('--mode prompt --session "<id>"');
    expect(directives.explore).toContain('--mode prompt --session "<id>"');
  });
});

describe('mode branches: prompt settlement framing', () => {
  it('frames non-empty responses including question-ending text as completed', () => {
    for (const report of ['done', 'which option?']) {
      const out = formatPromptSettlement(report);
      expect(out.ok).toBe(true);
      expect(out.lines[0]).toBe('[PROMPT_RESPONSE_START]');
      expect(out.lines[1]).toBe(report);
      expect(out.lines[2]).toBe('[PROMPT_RESPONSE_END]');
      expect(out.lines[3]).toContain('[STATUS] COMPLETED');
    }
  });

it('rejects empty responses', () => {
    const out = formatPromptSettlement('');
    expect(out.ok).toBe(false);
    expect(out.lines).toHaveLength(0);
  });
});
