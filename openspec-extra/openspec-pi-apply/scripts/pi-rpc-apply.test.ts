import { describe, expect, it } from 'bun:test';
import {
  resolveSessionId,
  loadAllowedModels,
  printAvailableModels,
  checkModelAndThinking,
  parseArgs,
} from './pi-rpc-apply.ts';

describe('resolveSessionId', () => {
  it('formats standard change names cleanly', () => {
    expect(resolveSessionId('add-user-auth')).toBe('openspec-add-user-auth');
    expect(resolveSessionId('fix_bug_123')).toBe('openspec-fix_bug_123');
    expect(resolveSessionId('v1.0.0-release')).toBe('openspec-v1.0.0-release');
  });

  it('strips leading and trailing non-alphanumeric characters', () => {
    expect(resolveSessionId('---leading-trailing---')).toBe('openspec-leading-trailing');
    expect(resolveSessionId('...dots...')).toBe('openspec-dots');
    expect(resolveSessionId('___underscores___')).toBe('openspec-underscores');
  });

  it('sanitizes unsupported special characters with hyphens', () => {
    expect(resolveSessionId('feat/auth@scope#1')).toBe('openspec-feat-auth-scope-1');
    expect(resolveSessionId('change with spaces')).toBe('openspec-change-with-spaces');
    expect(resolveSessionId('feature (beta) [v2]')).toBe('openspec-feature--beta---v2');
  });

  it('falls back to default safe name if input is completely empty or stripped', () => {
    expect(resolveSessionId('')).toBe('openspec-task');
    expect(resolveSessionId('   ')).toBe('openspec-task');
    expect(resolveSessionId('!@#$%^&*()')).toBe('openspec-task');
  });
});

describe('model and thinking catalog validation', () => {
  it('loads models.json dictionary successfully with nested structure', () => {
    const models = loadAllowedModels();
    expect(Object.keys(models).length).toBeGreaterThan(0);
    expect(models['deepseek-v4.1-flash']).toBeDefined();
    expect(models['deepseek-v4.1-flash'].provider).toBe('opencode-go');
    expect(Array.isArray(models['deepseek-v4.1-flash'].levels)).toBe(true);
  });

  it('emits minified JSON dictionary on discovery without outer wrapper', () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      printAvailableModels(loadAllowedModels());
      expect(logs.length).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed['deepseek-v4.1-flash']).toEqual(['low', 'high', 'max']);
      expect(parsed.models).toBeUndefined();
    } finally {
      console.log = origLog;
    }
  });

  it('resolves bare model name to canonical provider/model', () => {
    const check = checkModelAndThinking('deepseek-v4.1-flash', 'high');
    expect(check.valid).toBe(true);
    if (check.valid) {
      expect(check.canonicalModel).toBe('opencode-go/deepseek-v4.1-flash');
    }
  });

  it('resolves qualified model name to canonical provider/model', () => {
    const check = checkModelAndThinking(
      'opencode-go/deepseek-v4.1-flash',
      'high'
    );
    expect(check.valid).toBe(true);
    if (check.valid) {
      expect(check.canonicalModel).toBe('opencode-go/deepseek-v4.1-flash');
    }
  });

  it('accepts valid model without thinking level', () => {
    const check = checkModelAndThinking('xiaomi-token-plan-ams/mimo-v2.6-pro');
    expect(check.valid).toBe(true);
    if (check.valid) {
      expect(check.canonicalModel).toBe('xiaomi-token-plan-ams/mimo-v2.6-pro');
    }
  });

  it('accepts undefined model and thinking level (defaults to pi default)', () => {
    const check = checkModelAndThinking(undefined, undefined);
    expect(check.valid).toBe(true);
  });

  it('rejects unlisted bare and qualified model names', () => {
    const checkBare = checkModelAndThinking('unknown-model');
    expect(checkBare.valid).toBe(false);

    const checkQual = checkModelAndThinking('unauthorized/unknown-model');
    expect(checkQual.valid).toBe(false);

    const checkMismatchedProvider = checkModelAndThinking('wrong-provider/deepseek-v4.1-flash');
    expect(checkMismatchedProvider.valid).toBe(false);
  });

  it('rejects unsupported thinking level for bare and qualified models', () => {
    const checkBare = checkModelAndThinking(
      'deepseek-v4.1-flash',
      'minimal' // deepseek only has ["low", "high", "max"]
    );
    expect(checkBare.valid).toBe(false);

    const checkQual = checkModelAndThinking(
      'opencode-go/deepseek-v4.1-flash',
      'minimal'
    );
    expect(checkQual.valid).toBe(false);
  });

  it('rejects thinking level without model', () => {
    const check = checkModelAndThinking(undefined, 'high');
    expect(check.valid).toBe(false);
    if (!check.valid) {
      expect(check.error).toContain('--thinking cannot be specified without --model');
    }
  });

  it('parseArgs resolves bare and qualified models to canonical form', () => {
    const bare = parseArgs(['--model', 'deepseek-v4.1-flash', '--change', 'demo']);
    expect(bare.model).toBe('opencode-go/deepseek-v4.1-flash');

    const qual = parseArgs(['--model', 'opencode-go/deepseek-v4.1-flash', '--change', 'demo']);
    expect(qual.model).toBe('opencode-go/deepseek-v4.1-flash');
  });
});
