import { describe, expect, it } from 'bun:test';
import {
  MODEL_PROMPT_INSTRUCTION,
  MODES,
  buildInitialPrompt,
  formatPromptSettlement,
  loadModeDirectives,
  parseArgs,
  printModelPromptInstruction,
  validateSessionId,
} from './pi-rpc.ts';

// ============================================================ Shared core
describe('model instruction: bare --model asks user for model and reasoning level', () => {
  it('prints a plain-text instruction to ask the user for model and reasoning level', () => {
    const out: string[] = [];
    const orig = console.log;
    console.log = (line?: unknown) => out.push(String(line));
    try {
      printModelPromptInstruction();
    } finally {
      console.log = orig;
    }
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(MODEL_PROMPT_INSTRUCTION);
    expect(out[0]).toContain('Ask the user which model and reasoning level to use');
  });

  it('exits 0 and emits plain-text instruction when CLI is invoked with bare --model, --models, or --list-models', () => {
    const scriptPath = new URL('./pi-rpc.ts', import.meta.url).pathname;
    for (const flag of ['--model', '--models', '--list-models']) {
      const proc = Bun.spawnSync(['bun', scriptPath, flag]);
      expect(proc.exitCode).toBe(0);
      expect(proc.stdout.toString().trim()).toBe(MODEL_PROMPT_INSTRUCTION);
    }
  });
});

describe('shared core: pure pass-through model and level', () => {
  it('accepts arbitrary bare or qualified model strings verbatim', () => {
    for (const m of ['gpt-6-luna', 'commandcode/gpt-6-luna', 'custom-provider/any-model']) {
      const opts = parseArgs(['--mode', 'apply', '--model', m, '--session', 'openspec-demo', '--prompt', 'demo']);
      expect(opts.model).toBe(m);
    }
  });

  it('accepts arbitrary level strings verbatim without catalog lookup', () => {
    for (const lvl of ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'custom-level']) {
      const opts = parseArgs(['--mode', 'explore', '--level', lvl, '--session', 'openspec-demo', '--prompt', 'demo']);
      expect(opts.level).toBe(lvl);
    }
  });

  it('does not swallow the next flag when --level is given without a value', () => {
    const opts = parseArgs(['--mode', 'explore', '--level', '--session', 'openspec-demo', '--prompt', 'demo']);
    expect(opts.level).toBeUndefined();
    expect(opts.sessionId).toBe('openspec-demo');
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

  it('keeps the raw model and level strings unchanged for pass-through', () => {
    const opts = parseArgs(['--mode', 'explore', '--model', 'opencode-go/deepseek-v4.1-flash', '--level', 'high', '--session', 'openspec-demo', '--prompt', 'r']);
    expect(opts.model).toBe('opencode-go/deepseek-v4.1-flash');
    expect(opts.level).toBe('high');
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
