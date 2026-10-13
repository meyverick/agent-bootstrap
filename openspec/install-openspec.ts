#!/usr/bin/env bun
// install-openspec — reference installer for the openspec toolchain.
// Layer 1) machine: npm ensure for @fission-ai/openspec (no interactive flows)
// Layer 2) machine: global profile config ensure (canonical 3 keys, rest preserved)
// Layer 3) project: ALWAYS runs `openspec init --tools agents --force` (user's
//          canonical command — not marker-gated)
// No skill, no AGENTS.md, no MCP config: upstream `delivery: skills` owns those.
// Run: bun install-openspec/install-openspec.ts   (from the target project root)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const isWin = process.platform === "win32";
const PROJECT_ROOT = process.cwd();
const PKG = "@fission-ai/openspec";

// Canonical profile = non-interactive equivalent of `openspec config profile`
// (core 6 + expanded 6), the state the user's enable-commands produced.
const CANONICAL_PROFILE = {
  profile: "custom",
  delivery: "skills",
  workflows: ["propose", "explore", "new", "continue", "apply", "update", "ff", "sync", "archive", "bulk-archive", "verify", "onboard"],
};

function log(msg: string): void {
  console.log(`[install-openspec] ${msg}`);
}
function warn(msg: string): void {
  console.error(`[install-openspec] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-openspec] ERROR: ${msg}`);
  process.exit(1);
}

function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: npm is a .cmd shim — needs a shell to resolve. POSIX: direct exec.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// Structural allowlist: openspec is ONLY ever spawned with these joined argv.
// Never `update` (its upgrade offer is interactive) or anything else.
const OPENSPEC_ALLOWED = new Set(["--version", "config path", "init --tools agents --force"]);
function runOpenspec(args: string[], cwd?: string) {
  const joined = args.join(" ");
  if (!OPENSPEC_ALLOWED.has(joined)) fail(`internal guard: openspec "${joined}" is not on the allowlist`);
  return run("openspec", args, cwd);
}

// ---- Layer 1: CLI ensure (npm channel; read-only compare, never interactive) ----
function ensureCli(): void {
  const current = runOpenspec(["--version"]);
  const installed = current.code === 0 ? (current.stdout.match(/(\d+\.\d+\.\d+)/)?.[1] ?? null) : null;
  if (installed === null) {
    log("openspec missing — installing globally via npm...");
    const r = run("npm", ["install", "-g", PKG]);
    if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}\nHint: global npm dir may need sudo, or use an nvm-managed Node.`);
    const after = runOpenspec(["--version"]);
    if (after.code !== 0) fail("openspec still not on PATH after install");
    log(`installed openspec ${after.stdout.trim()}`);
    return;
  }
  // Read-only registry view (interactive `openspec update` upgrade offer is never spawned).
  const v = run("npm", ["view", PKG, "version"]);
  if (v.code !== 0 || !v.stdout.trim()) {
    warn(`npm registry unreachable — skipping openspec update check (local ${installed})`);
    return;
  }
  const latest = v.stdout.trim();
  if (latest === installed) {
    log(`openspec up to date (${installed}) — no install/update`);
    return;
  }
  log(`openspec ${installed} < latest ${latest} — installing update...`);
  const r = run("npm", ["install", "-g", PKG]);
  if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}`);
  const after = runOpenspec(["--version"]);
  if (after.code !== 0) fail("openspec not identifiable after update");
  log(`openspec update complete (${after.stdout.trim()})`);
}

// ---- Layer 2: global profile config ensure (the deliberate ~/.config exception) ----
function ensureConfig(): void {
  const p = runOpenspec(["config", "path"]);
  if (p.code !== 0 || !p.stdout.trim()) fail(`cannot resolve openspec config path:\n${p.stderr || p.stdout}`);
  const configPath = p.stdout.trim().split("\n").pop()!.trim();
  let cfg: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      cfg = JSON.parse(readFileSync(configPath, "utf8"));
    } catch (e) {
      fail(`unparseable JSON — refusing to overwrite: ${configPath}\n${e instanceof Error ? e.message : e}`);
    }
    if (typeof cfg !== "object" || cfg === null || Array.isArray(cfg)) fail(`expected JSON object: ${configPath}`);
  }
  const before = JSON.stringify(cfg);
  // Canonical 3 keys in; every other top-level key (telemetry, featureFlags,
  // completionTipSeen, ...) preserved verbatim. Zero secrets.
  cfg.profile = CANONICAL_PROFILE.profile;
  cfg.delivery = CANONICAL_PROFILE.delivery;
  cfg.workflows = CANONICAL_PROFILE.workflows;
  const next = `${JSON.stringify(cfg, null, 2)}\n`;
  if (before === JSON.stringify(cfg)) {
    log(`config unchanged: ${configPath}`);
    return;
  }
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, next);
  log(`config written: ${configPath} (profile=custom, delivery=skills, ${CANONICAL_PROFILE.workflows.length} workflows)`);
}

// ---- Layer 3: ALWAYS-run project init (user's canonical command) ------------
function projectInit(): void {
  log("openspec init --tools agents --force (every run — user's canonical command)");
  const r = runOpenspec(["init", "--tools", "agents", "--force"], PROJECT_ROOT);
  if (r.code !== 0) fail(`openspec init failed (exit ${r.code}):\n${(r.stdout + r.stderr).trim()}`);
  log("openspec init done");
}

// ---- Main --------------------------------------------------------------------
function main(): void {
  ensureCli();
  ensureConfig();
  projectInit();
  log("done");
}

main();
