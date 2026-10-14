#!/usr/bin/env bun
/**
 * scripts/pi-rpc.ts
 *
 * Unified bridge runner driving `pi -a --mode rpc` over stdio duplex for the
 * `pi-worker` skill. One shared core (workspace resolution, model/level
 * validation, session isolation, LF-framed JSONL, token-delta filtering,
 * turn timeout, settlement) with a `--mode` switch for the workflow bindings:
 *
 * - `--mode apply   <change-name>`   -> `/skill:openspec-apply-change`, task-count gate
 * - `--mode explore <request>`       -> `/skill:openspec-explore`, report-marker gate
 * - no `--mode`                      -> prints the JSON mode catalog
 *                                       `{"explore": "<directive>", "apply": "<directive>"}`
 *                                       read from sibling `references/*.md`
 *
 * Flag contract (two-flag form — no `--reply`/`--continue`; every resume is
 * `--session <same-slug> --request <new text>`):
 *   --mode <apply|explore>   workflow binding (missing -> catalog, invalid -> error listing modes)
 *   --model <(provider/)name> validated against sibling `references/models.json`
 *   --level <level>          validated against the model's allowed array; forwarded
 *                            to pi's `--thinking` (single translation point below)
 *   --session <slug>         always required; identity AND routing key.
 *                            Fresh inquiry -> fresh slug; follow-ups reuse it.
 *                            Session id derives as `openspec-<mode>-<slug>`.
 *   --request <text>         apply: the change name; explore: the free-text request.
 *   --timeout <ms> --root <path> --verbose --model (no arg: registry JSON) -h/--help
 */

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ============================================================ Layout
const SCRIPTS_DIR = dirname(import.meta.path ?? __filename);
const REFERENCES_DIR = join(SCRIPTS_DIR, "..", "references");
const MODELS_PATH = join(REFERENCES_DIR, "models.json");

export type Mode = "apply" | "explore";
export const MODES: readonly Mode[] = ["apply", "explore"];

const MODE_DIRECTIVE_FILES: Record<Mode, string> = {
  apply: join(REFERENCES_DIR, "openspec-pi-apply.md"),
  explore: join(REFERENCES_DIR, "openspec-pi-explore.md"),
};

export interface ModelDefinition {
  provider: string;
  levels: string[];
}

export interface ModelsCatalog {
  models: Record<string, ModelDefinition>;
}

export interface ModelCheckResult {
  valid: boolean;
  error?: string;
  canonicalModel?: string;
}

interface CliOptions {
  mode?: string;
  model?: string;
  level?: string;
  sessionSlug?: string;
  requestText?: string;
  timeoutMs: number;
  explicitRoot?: string;
  verbose: boolean;
}

// ============================================================ Mandates
const APPLY_MANDATE =
  `[SUPERVISOR MANDATE: Implement the pending tasks for this OpenSpec change according to ` +
  `its proposal, design, and specs. As you complete each task, mark its checkbox '- [x]' ` +
  `in tasks.md. Do NOT archive the change or modify unrelated changes. ` +
  `When all tasks are complete and verified, provide a concise implementation summary. ` +
  `If you are blocked by a genuine specification ambiguity, pause and ask a focused clarifying question.]`;

const FORBIDDEN_WRITE_TOOLS = new Set(["write", "edit", "multiedit", "create_file", "delete_file"]);

const READ_ONLY_MANDATE =
  `[SUPERVISOR MANDATE: Operate strictly in read-only exploration mode. ` +
  `Do NOT create, scaffold, edit, or delete any project files or OpenSpec artifacts ` +
  `(never run 'openspec new', 'openspec init', or file-writing commands). ` +
  `Synthesize all findings, plain ASCII diagrams, tradeoff tables, and recommendations ` +
  `directly into your markdown response. ` +
  `IMPORTANT: Do NOT end a completed exploration report with conversational follow-up questions ` +
  `(such as 'Want me to create a proposal?' or 'Where is your head at?'). ` +
  `End your response with a question mark (?) ONLY if you are blocked and must pause ` +
  `for supervisor clarification before you can complete the investigation.]`;

export function buildInitialPrompt(mode: Mode, request: string): string {
  if (mode === "apply") {
    return `/skill:openspec-apply-change ${request}\n\n${APPLY_MANDATE}`;
  }
  return `/skill:openspec-explore ${request}\n\n${READ_ONLY_MANDATE}`;
}

// ============================================================ Mode catalog
export function loadModeDirectives(refDir: string = REFERENCES_DIR): Record<Mode, string> {
  const out = {} as Record<Mode, string>;
  for (const mode of MODES) {
    const p = join(refDir, MODE_DIRECTIVE_FILES[mode].split("/").pop() as string);
    if (!existsSync(p)) {
      throw new Error(`mode directive missing: ${p}`);
    }
    out[mode] = readFileSync(p, "utf8");
  }
  return out;
}

function printModeCatalog(): void {
  try {
    console.log(JSON.stringify(loadModeDirectives()));
  } catch (e) {
    console.error(`[pi-runner] ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

// ============================================================ Model registry
export function loadAllowedModels(refDir: string = REFERENCES_DIR): Record<string, ModelDefinition> {
  const modelsPath = join(refDir, "models.json");
  if (!existsSync(modelsPath)) {
    throw new Error(`models.json not found at ${modelsPath}`);
  }
  const content = readFileSync(modelsPath, "utf8");
  let parsed: ModelsCatalog;
  try {
    parsed = JSON.parse(content) as ModelsCatalog;
  } catch (e) {
    throw new Error(`models.json at ${modelsPath} is not valid JSON: ${e instanceof Error ? e.message : e}`);
  }
  return parsed.models ?? {};
}

export function printAvailableModels(models: Record<string, ModelDefinition>): void {
  const flat: Record<string, string[]> = {};
  for (const [model, def] of Object.entries(models)) {
    flat[model] = def.levels;
  }
  console.log(JSON.stringify(flat));
}

export function checkModelAndThinking(
  model?: string,
  level?: string,
  models: Record<string, ModelDefinition> = loadAllowedModels()
): ModelCheckResult {
  if (model) {
    let resolvedDefinition: ModelDefinition | undefined;
    let canonicalModel: string | undefined;
    if (models[model]) {
      resolvedDefinition = models[model];
      canonicalModel = `${resolvedDefinition.provider}/${model}`;
    } else if (model.includes("/")) {
      const slashIndex = model.indexOf("/");
      const providerPart = model.slice(0, slashIndex);
      const modelPart = model.slice(slashIndex + 1);
      if (models[modelPart] && models[modelPart].provider === providerPart) {
        resolvedDefinition = models[modelPart];
        canonicalModel = model;
      }
    }
    if (!resolvedDefinition || !canonicalModel) {
      return { valid: false, error: `Model '${model}' is not in allowed models.json.` };
    }
    if (level) {
      if (!resolvedDefinition.levels.includes(level)) {
        return {
          valid: false,
          error: `Level '${level}' is not supported for model '${model}'. Allowed: ${resolvedDefinition.levels.join(", ")}`,
        };
      }
    }
    return { valid: true, canonicalModel };
  }
  if (level) {
    return { valid: false, error: `--level cannot be specified without --model.` };
  }
  return { valid: true };
}

// ============================================================ Session & workspace
/**
 * Sanitizes a delegation slug into a valid pi session ID.
 * Pi CLI constraints: start/end alphanumeric, interior [a-zA-Z0-9._-].
 * Returns `openspec-<mode>-<safeSlug>`.
 */
export function resolveSessionId(mode: Mode, slug: string): string {
  let safe = slug.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  safe = safe.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "");
  if (!safe) safe = "task";
  return `openspec-${mode}-${safe}`;
}

/**
 * Resolves workspace root by traversing upwards until finding `openspec` or `.git`.
 */
export function resolveWorkspaceRoot(startDir: string = process.cwd()): string {
  let curr = resolve(startDir);
  while (true) {
    if (existsSync(join(curr, "openspec")) && existsSync(join(curr, ".agents", "skills"))) {
      return curr;
    }
    if (existsSync(join(curr, "openspec"))) {
      return curr;
    }
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return resolve(startDir);
}

// ============================================================ CLI
export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    timeoutMs: 300_000,
    verbose: false,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "--mode") {
      options.mode = args[++i];
    } else if (arg === "--model" || arg === "--models" || arg === "--list-models") {
      const next = args[i + 1];
      if (arg === "--list-models" || !next || next.startsWith("-")) {
        printAvailableModels(loadAllowedModels());
        process.exit(0);
      }
      options.model = args[++i];
    } else if (arg === "--level") {
      options.level = args[++i];
    } else if (arg === "--session") {
      options.sessionSlug = args[++i];
    } else if (arg === "--request") {
      options.requestText = args[++i];
    } else if (arg === "--timeout") {
      options.timeoutMs = parseInt(args[++i], 10) || 300_000;
    } else if (arg === "--root") {
      options.explicitRoot = args[++i];
    } else if (arg === "--verbose") {
      options.verbose = true;
    }
  }
  return options;
}

function printHelp(): void {
  console.log(`pi-rpc — headless pi worker bridge (apply | explore) over JSON-RPC

Usage:
  pi-rpc --mode apply   --session <slug> --request "<change-name>" [--model M] [--level L]
  pi-rpc --mode explore --session <slug> --request "<request>"    [--model M] [--level L]
  pi-rpc                # no --mode: print the JSON mode catalog {explore, apply}

Options:
  --mode <apply|explore>  Workflow binding. Missing: prints the mode catalog.
  --model [<name>]        Model to use (bare or <provider>/<model>). Without argument: list available models.
  --level <level>         Level for the model (must exist in its allowed array; forwarded to pi's --thinking).
  --session <slug>        REQUIRED. Delegation identity AND routing key: fresh inquiry -> fresh slug,
                          follow-ups reuse it. Session id derives as openspec-<mode>-<slug>.
  --request <text>        apply: the OpenSpec change name. explore: the free-text exploration request.
  --timeout <ms>          Turn timeout in milliseconds (default: 300000ms / 5 min).
  --root <path>           Explicit workspace root directory.
  --verbose               Print detailed event diagnostics to stderr.
  -h, --help              Show this help message.
`);
}

// ============================================================ Runner
export async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));

  if (!options.mode) {
    printModeCatalog();
    return;
  }
  if (!MODES.includes(options.mode as Mode)) {
    const message = `Invalid --mode '${options.mode}'. Valid modes: ${MODES.join(", ")}.`;
    console.error(`[pi-runner] ${message}`);
    console.log(`[STATUS] FAILED: ${message}`);
    printHelp();
    process.exit(1);
  }
  const mode = options.mode as Mode;

  if (!options.sessionSlug || !options.requestText) {
    const message = `--mode ${mode} requires --session <slug> and --request <text>.`;
    console.error(`[pi-runner] ${message}`);
    console.log(`[STATUS] FAILED: ${message}`);
    printHelp();
    process.exit(1);
  }

  const modelCheck = checkModelAndThinking(options.model, options.level);
  if (!modelCheck.valid) {
    console.error(`[pi-runner] ${modelCheck.error}`);
    console.log(`[STATUS] FAILED: ${modelCheck.error}`);
    process.exit(1);
  }

  const workspaceRoot = options.explicitRoot ? resolve(options.explicitRoot) : resolveWorkspaceRoot();
  const sessionId = resolveSessionId(mode, options.sessionSlug);
  const initialPrompt = buildInitialPrompt(mode, options.requestText);

  console.log(`[pi-runner] Workspace root resolved to: ${workspaceRoot}`);
  console.log(`[pi-runner] Mode: ${mode} | session: ${sessionId}`);
  if (mode === "apply") {
    console.log(`[pi-runner] Starting apply for change: '${options.requestText}'...`);
  } else {
    console.log(`[pi-runner] Starting exploration: '${options.requestText.slice(0, 80)}...'`);
  }

  const spawnArgs = ["-a", "--session-id", sessionId];
  if (options.model) {
    const resolvedModel = modelCheck.canonicalModel ?? options.model;
    spawnArgs.push("--model", resolvedModel);
    console.log(`[pi-runner] Using model: ${resolvedModel}`);
  }
  if (options.level) {
    // Single translation point: our `--level` aligns with models.json vocabulary;
    // the pi CLI flag is `--thinking`.
    spawnArgs.push("--thinking", options.level);
    console.log(`[pi-runner] Using level (pi --thinking): ${options.level}`);
  }
  spawnArgs.push("--mode", "rpc");

  type Timer = ReturnType<typeof setTimeout>;
  interface RpcResponse {
    success?: boolean;
    error?: unknown;
  }
  interface PiEvent {
    type?: string;
    assistantMessageEvent?: {
      type?: string;
      toolCall?: Record<string, unknown>;
      toolName?: string;
      name?: string;
    };
    toolResults?: unknown[];
    message?: { role?: string; content?: unknown };
  }

  console.log(`[pi-runner] Spawning: pi ${spawnArgs.join(" ")} (cwd: ${workspaceRoot})`);
  const piProcess: ChildProcess = spawn("pi", spawnArgs, {
    cwd: workspaceRoot,
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: { ...process.env },
  });

  if (!piProcess.stdin || !piProcess.stdout || !piProcess.stderr) {
    console.error("[pi-runner] Failed to establish stdio pipes with pi process.");
    console.log("[STATUS] FAILED: stdio pipes unavailable.");
    process.exit(1);
  }

  let lineBuffer = "";
  let lastAssistantMessage = "";
  let settled = false;
  let turnTimer: Timer | null = null;

  function failAndExit(reason: string, code = 1): never {
    settled = true;
    if (turnTimer) clearTimeout(turnTimer);
    console.error(`\n[pi-runner] ERROR: ${reason}`);
    console.log(`[STATUS] FAILED: ${reason}`);
    try {
      piProcess.kill("SIGTERM");
    } catch {
      // already exited
    }
    process.exit(code);
  }

  function safeExit(code: number): void {
    setTimeout(() => {
      try {
        piProcess.kill("SIGTERM");
      } catch {
        // already exited
      }
      process.exit(code);
    }, 200);
  }

  function resetTimer() {
    if (turnTimer) clearTimeout(turnTimer);
    turnTimer = setTimeout(() => {
      failAndExit(`Worker turn timed out after ${options.timeoutMs}ms without settlement.`);
    }, options.timeoutMs);
  }

  resetTimer();

  piProcess.stdout.on("data", (chunk: Buffer) => {
    lineBuffer += chunk.toString("utf-8");
    let idx: number;
    while ((idx = lineBuffer.indexOf("\n")) !== -1) {
      let line = lineBuffer.slice(0, idx);
      lineBuffer = lineBuffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      line = line.trim();
      if (!line) continue;
      try {
        handleRpcRecord(JSON.parse(line));
      } catch {
        if (options.verbose) console.error(`[pi-runner:raw] ${line}`);
      }
    }
  });

  piProcess.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8");
    if (options.verbose || text.includes("Error") || text.includes("error")) {
      process.stderr.write(`[pi:stderr] ${text}`);
    }
  });

  piProcess.on("error", (err) => {
    failAndExit(`Worker process error: ${err.message}`);
  });

  piProcess.on("close", (code) => {
    if (turnTimer) clearTimeout(turnTimer);
    if (!settled) {
      console.log(`[pi-runner] Process closed with code ${code}`);
      failAndExit(`pi process exited prematurely with code ${code ?? 1}`, code || 1);
    }
  });

  function handleRpcRecord(record: Record<string, unknown>) {
    resetTimer();
    if (record.type === "extension_ui_request") {
      const req = record as Record<string, unknown>;
      const method = req.method as string;
      if (["select", "confirm", "input", "editor"].includes(method)) {
        // Mode-dependent default: apply auto-approves (true); explore resolves
        // confirm to false so the worker never receives implicit write permission.
        let value: unknown = mode === "apply";
        if (method === "select") value = (req.options as string[])?.[0] || "";
        if (method === "input") value = "";
        if (method === "editor") value = req.prefill || "";
        piProcess.stdin?.write(JSON.stringify({ type: "extension_ui_response", id: req.id, value }) + "\n");
      }
      return;
    }
    if (record.type === "response") {
      // SAFETY: JSONL framing guarantees record is an object; shape refined by the success check below.
      const resp = record as unknown as RpcResponse;
      if (!resp.success) {
        failAndExit(`RPC command rejected: ${JSON.stringify(resp.error || resp)}`);
      }
      return;
    }
    // SAFETY: same framing guarantee; PiEvent fields are all optional and probed defensively.
    const event = record as unknown as PiEvent;
    if (event.type === "message_update") {
      const sub = event.assistantMessageEvent;
      if (sub && (sub.type === "text_delta" || sub.type === "thinking_delta")) return;
    }
    const tool = event.assistantMessageEvent?.toolCall || event.assistantMessageEvent || record;
    const toolName = String(
      (tool as Record<string, unknown> | undefined)?.toolName ||
        (tool as Record<string, unknown> | undefined)?.name ||
        (tool as Record<string, unknown> | undefined)?.tool ||
        "tool"
    );
    const isToolStart =
      event.type === "toolcall_start" ||
      (event.type === "message_update" && event.assistantMessageEvent?.type === "toolcall_start");
    if (isToolStart) {
      console.log(`⚙ [pi:tool] Invoking: ${toolName}`);
      if (mode === "explore" && FORBIDDEN_WRITE_TOOLS.has(toolName.toLowerCase())) {
        failAndExit(`Read-only guardrail violation: worker attempted to invoke write tool '${toolName}'.`);
      }
      return;
    }
    const isToolEnd =
      event.type === "toolcall_end" ||
      (event.type === "message_update" && event.assistantMessageEvent?.type === "toolcall_end");
    if (isToolEnd) {
      console.log(`✓ [pi:tool] Completed: ${toolName}`);
      return;
    }
    if (event.type === "turn_end" && Array.isArray(event.toolResults) && event.toolResults.length > 0) {
      console.log(`  [pi:turn] Completed ${event.toolResults.length} tool invocation(s).`);
    }
    if (event.type === "message_end" && event.message?.role === "assistant") {
      const content = event.message.content;
      if (typeof content === "string") {
        lastAssistantMessage = content;
      } else if (Array.isArray(content)) {
        const texts: string[] = [];
        for (const c of content) {
          if (c.type === "text" && c.text) texts.push(c.text);
        }
        lastAssistantMessage = texts.join("\n");
      }
      return;
    }
    if (event.type === "agent_settled") {
      settled = true;
      if (turnTimer) clearTimeout(turnTimer);
      onAgentSettled();
    }
  }

  function endsWithQuestion(text: string): boolean {
    const tail = text.trim().split("\n").slice(-4).join("\n");
    return /\?\s*$/.test(tail);
  }

  function onAgentSettled() {
    console.log(`[pi-runner] Worker agent settled.`);
    const report = lastAssistantMessage.trim();
    if (mode === "apply") {
      settleApply(report);
    } else {
      settleExplore(report);
    }
  }

  function settleExplore(report: string): void {
    if (!report) {
      failAndExit("Worker settled with an empty exploration report.");
    }
    console.log(`[EXPLORE_REPORT_START]`);
    console.log(report);
    console.log(`[EXPLORE_REPORT_END]`);
    if (endsWithQuestion(report)) {
      console.log(`[STATUS] PAUSED_FOR_CLARIFICATION: report ends with a question for the supervisor.`);
    } else {
      console.log(`[STATUS] COMPLETED: exploration report delivered.`);
    }
    safeExit(0);
  }

  function settleApply(report: string): void {
    if (report) {
      console.log(`[APPLY_REPORT_START]`);
      console.log(report);
      console.log(`[APPLY_REPORT_END]`);
    }
    let proc: ReturnType<typeof Bun.spawnSync>;
    try {
      proc = Bun.spawnSync(
        ["openspec", "instructions", "apply", "--change", options.requestText as string, "--json"],
        { cwd: workspaceRoot }
      );
    } catch (e) {
      failAndExit(`Failed to verify OpenSpec apply progress: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (proc.exitCode !== 0) {
      const stderrText = proc.stderr.toString().trim();
      failAndExit(`openspec instructions apply failed (exit ${proc.exitCode}): ${stderrText || "unknown error"}`);
    }
    let applyJson: {
      progress?: { total?: number; complete?: number; remaining?: number };
      tasks?: Array<{ done: boolean; description?: string }>;
    };
    try {
      applyJson = JSON.parse(proc.stdout.toString());
    } catch (e) {
      failAndExit(`openspec instructions apply returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    const total = applyJson.progress?.total ?? 0;
    const complete = applyJson.progress?.complete ?? 0;
    const remaining = applyJson.progress?.remaining ?? 0;
    if (total === 0) {
      failAndExit(`Change '${options.requestText}' has 0 total tasks in tasks.md.`);
    }
    if (remaining === 0) {
      console.log(`\n========================================`);
      console.log(`[STATUS] COMPLETED: All ${complete}/${total} tasks for '${options.requestText}' are complete!`);
      console.log(`========================================\n`);
      safeExit(0);
      return;
    }
    console.log(`\n========================================`);
    console.log(`[STATUS] PAUSED_FOR_CLARIFICATION: Worker settled with ${remaining}/${total} remaining task(s).`);
    if (Array.isArray(applyJson.tasks)) {
      const pendingTasks = applyJson.tasks.filter((t) => !t.done);
      console.log(`Pending Tasks (${pendingTasks.length}):`);
      for (const t of pendingTasks.slice(0, 5)) {
        console.log(`  - [ ] ${t.description}`);
      }
      if (pendingTasks.length > 5) {
        console.log(`  ... and ${pendingTasks.length - 5} more.`);
      }
    }
    console.log(`========================================\n`);
    safeExit(0);
  }

  piProcess.stdin.write(
    JSON.stringify({ id: `prompt-${Date.now()}`, type: "prompt", message: initialPrompt }) + "\n"
  );
}

if (import.meta.main) {
  main().catch((err: Error) => {
    console.error("[pi-runner] Fatal error:", err);
    console.log(`[STATUS] FAILED: ${err.message}`);
    process.exit(1);
  });
}
