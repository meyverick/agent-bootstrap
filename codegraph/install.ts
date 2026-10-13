#!/usr/bin/env bun
// install-codegraph — idempotent cross-platform (Windows/macOS/Linux) installer for codegraph.
// Steps: 1) CLI ensure with spawn ALLOWLIST (npm install when missing;
//           `codegraph upgrade --check` read-only compare -> `upgrade` when behind)
//           FORBIDDEN: install/uninstall/init/uninit/telemetry (config writers,
//           repo-index mutation, user policy) — structurally unreachable
//        2) merge MCP template into pi + agy configs
// Run: bun codegraph/install.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PKG = "@colbymchenry/codegraph";

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-codegraph] ${msg}`);
}
function warn(msg: string): void {
  console.error(`[install-codegraph] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-codegraph] ERROR: ${msg}`);
  process.exit(1);
}

// Run a command; returns {code, stdout, stderr}. Never throws.
function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: npm is a .cmd shim — needs a shell to resolve. POSIX: direct exec.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// Structural allowlist: codegraph is ONLY ever spawned with these joined argv
// strings. Never `install`/`uninstall` (agent-config writers), never `init`/
// `uninit` (repo-index mutation), never `telemetry` (user policy).
const CODEGRAPH_ALLOWED = new Set(["--version", "-V", "upgrade", "upgrade --check"]);
function runCodegraph(args: string[]) {
  const joined = args.join(" ");
  if (!CODEGRAPH_ALLOWED.has(joined)) fail(`internal guard: codegraph "${joined}" is not on the allowlist`);
  return run("codegraph", args);
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: CLI ensure (allowlisted update check) --------------------------
// Parse `codegraph upgrade --check` output: "CodeGraph  current vX  latest vY".
function parseCheckOut(out: string): { current: string | null; latest: string | null } {
  const vers = out.match(/\bv\d+\.\d+\.\d+\b/g) ?? [];
  const nums = vers.map((v) => v.slice(1));
  return { current: nums[0] ?? null, latest: nums[1] ?? nums[0] ?? null };
}

function ensureCli(): void {
  const probe = runCodegraph(["--version"]);
  if (probe.code !== 0) {
    log("codegraph missing — installing globally via npm...");
    const r = run("npm", ["install", "-g", PKG]);
    if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}\nHint: package engines declare node <25 (npm warns non-strict); global npm dir may need sudo or an nvm-managed Node.`);
    const after = runCodegraph(["--version"]);
    if (after.code !== 0) fail("codegraph still not on PATH after install");
    log(`installed codegraph ${after.stdout.trim()}`);
    return;
  }
  // Read-only compare via upstream's purpose-built check. Unparseable/offline
  // output -> warn + continue (local codegraph untouched).
  const c = runCodegraph(["upgrade", "--check"]);
  const { current, latest } = parseCheckOut(`${c.stdout}\n${c.stderr}`);
  if (!current) {
    warn("cannot parse `codegraph upgrade --check` output (offline or format drift) — skipping update check");
    return;
  }
  if (!latest || latest === current) {
    log(`codegraph up to date (${current}) — no install/upgrade`);
    return;
  }
  log(`codegraph ${current} < latest ${latest} — running codegraph upgrade...`);
  const u = runCodegraph(["upgrade"]);
  if (u.code !== 0) fail(`codegraph upgrade failed (exit ${u.code}):\n${u.stderr || u.stdout}`);
  const verify = runCodegraph(["--version"]);
  if (verify.code !== 0) fail("codegraph not identifiable after upgrade");
  log(`codegraph upgrade complete (${verify.stdout.trim()})`);
}

// ---- Step 2: MCP merge (no secrets — plain entry) ---------------------------
function mergeMcp(): void {
  let template: { mcpServers?: Record<string, unknown> };
  try {
    template = JSON.parse(readTemplate("mcp.json"));
  } catch (e) {
    fail(`mcp.json template unparseable: ${e instanceof Error ? e.message : e}`);
  }
  const tplServers = template.mcpServers;
  if (!tplServers || typeof tplServers !== "object") fail("mcp.json template has no mcpServers object");
  if (!tplServers["codegraph"] || typeof tplServers["codegraph"] !== "object") fail("mcp.json template missing codegraph entry");

  const home = homedir();
  const targets = [join(home, ".pi", "agent", "mcp.json"), join(home, ".gemini", "config", "mcp_config.json")];

  for (const target of targets) {
    let cfg: Record<string, unknown> = {};
    if (existsSync(target)) {
      try {
        cfg = JSON.parse(readFileSync(target, "utf8"));
      } catch (e) {
        fail(`unparseable JSON — refusing to overwrite: ${target}\n${e instanceof Error ? e.message : e}`);
      }
      if (typeof cfg !== "object" || cfg === null || Array.isArray(cfg)) fail(`expected JSON object: ${target}`);
    }
    const servers = (cfg.mcpServers && typeof cfg.mcpServers === "object" ? cfg.mcpServers : {}) as Record<string, unknown>;
    const had = "codegraph" in servers;
    const before = JSON.stringify(cfg);
    servers["codegraph"] = tplServers["codegraph"];
    cfg.mcpServers = servers;
    const after = JSON.stringify(cfg);
    if (before === after && existsSync(target)) {
      log(`mcp unchanged: ${target}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
    log(had ? `mcp merged: ${target}` : `mcp merged (codegraph registered): ${target}`);
  }
}


// ---- Main --------------------------------------------------------------------
function main(): void {
  ensureCli();
  mergeMcp();
  log("done");
}

main();
