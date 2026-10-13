#!/usr/bin/env bun
// install-jcodemunch — idempotent cross-platform (Windows/macOS/Linux) installer
// for the jcodemunch MCP server (uvx-spawned, no local binary).
// Steps: 1) uvx gate + read-only PyPI version report (NO package mutation;
//           STRUCTURAL rule: no jcodemunch-mcp/jcm process is ever spawned)
//        2) merge MCP template into pi + agy configs
// Run: bun jcodemunch/install.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PYPI_JSON = "https://pypi.org/pypi/jcodemunch-mcp/json";

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-jcodemunch] ${msg}`);
}
function warn(msg: string): void {
  console.error(`[install-jcodemunch] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-jcodemunch] ERROR: ${msg}`);
  process.exit(1);
}

// Run a command; returns {code, stdout, stderr}. Never throws.
// STRUCTURAL RULE: only `uvx --version` (self-check) is ever spawned here.
// `jcodemunch-mcp`, `jcm`, and their config-writing subcommands (`init`,
// `install`) are never executed by this installer — there is no code path.
function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: uvx is a .cmd shim — needs a shell to resolve. POSIX: direct exec.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: runtime prerequisites (read-only; no package mutation) ---------
async function checkPrereqs(): Promise<void> {
  const uvx = run("uvx", ["--version"]);
  if (uvx.code !== 0) fail("uvx not found on PATH — jcodemunch-mcp is spawned via uvx at MCP startup; install uv from https://docs.astral.sh/uv/getting-started/installation/");
  log(`uvx ${uvx.stdout.trim()} ok`);

  // Read-only registry fetch for the version report. No process spawned,
  // no package mutated. Offline -> warn + continue (spec).
  try {
    const r = await fetch(PYPI_JSON);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: unknown = await r.json();
    const v = typeof j === "object" && j !== null && "info" in j ? (j as { info?: { version?: unknown } }).info?.version : undefined;
    if (typeof v !== "string" || !v) throw new Error("no info.version");
    log(`latest jcodemunch-mcp: ${v} (resolved at spawn by uvx — no install performed)`);
  } catch {
    warn("PyPI unreachable — skipping version report (uvx resolves the server at spawn anyway)");
  }
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
  if (!tplServers["jcodemunch"] || typeof tplServers["jcodemunch"] !== "object") fail("mcp.json template missing jcodemunch entry");

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
    const had = "jcodemunch" in servers;
    const before = JSON.stringify(cfg);
    servers["jcodemunch"] = tplServers["jcodemunch"];
    cfg.mcpServers = servers;
    const after = JSON.stringify(cfg);
    if (before === after && existsSync(target)) {
      log(`mcp unchanged: ${target}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
    log(had ? `mcp merged: ${target}` : `mcp merged (jcodemunch registered): ${target}`);
  }
}


// ---- Main --------------------------------------------------------------------
async function main(): Promise<void> {
  await checkPrereqs();
  mergeMcp();
  log("done");
}

main();
