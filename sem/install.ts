#!/usr/bin/env bun
// install-sem — idempotent cross-platform (Windows/macOS/Linux) installer for sem.
// Steps: 1) ensure global CLI (npm install when missing, `sem update` when outdated,
//        GNU-Parallel collision guard)  2) merge MCP template into pi + agy configs
// Run: bun sem/install.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PKG = "@ataraxy-labs/sem";

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-sem] ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-sem] ERROR: ${msg}`);
  process.exit(1);
}

// Run a command; returns {code, stdout, stderr}. Never throws.
function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: npm is npm.cmd — needs a shell to resolve. POSIX: direct exec, no shell chains.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// Structural allowlist: sem is ONLY ever spawned with these args.
// Never `sem setup` (globally replaces git diff), never cloud/login/telemetry.
const SEM_ALLOWED_ARGS = new Set(["--version", "update"]);
function runSem(arg: string) {
  if (!SEM_ALLOWED_ARGS.has(arg)) fail(`internal guard: sem subcommand "${arg}" is not on the allowlist`);
  return run("sem", [arg]);
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: global CLI availability + collision guard ----------------------
// Returns sem-cli version (X.Y.Z) or null when sem is absent/unidentifiable.
function semCliVersion(): string | null {
  const r = runSem("--version");
  const out = `${r.stdout}\n${r.stderr}`;
  // sem-cli prints `sem 0.26.0`. GNU Parallel's colliding `sem` shim prints
  // parallel-flavored output — anything not starting with `sem <version>`
  // (allowing leading noise) fails closed.
  const m = out.match(/^\s*sem\s+v?(\d+\.\d+\.\d+)/m);
  return r.code === 0 && m ? m[1] : null;
}

// Latest sem-cli release from GitHub (sem's own update source). null = unreachable.
async function latestReleaseVersion(): Promise<string | null> {
  try {
    const r = await fetch("https://api.github.com/repos/Ataraxy-Labs/sem/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!r.ok) return null;
    const j: unknown = await r.json();
    const tag = typeof j === "object" && j !== null && "tag_name" in j ? String((j as { tag_name: unknown }).tag_name) : "";
    const v = tag.replace(/^v/, "");
    return /^\d+\.\d+\.\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

async function ensureCli(): Promise<void> {
  if (semCliVersion() === null) {
    // Either sem is missing, or the `sem` on PATH is not sem-cli (GNU Parallel).
    const probe = runSem("--version");
    if (probe.code === 0) {
      fail(
        "the `sem` on PATH is not sem-cli (likely GNU Parallel's colliding `sem` binary — see Ataraxy-Labs/sem issue #77).\n" +
          "Fix: put sem-cli first on PATH (e.g. alias sem=\"$HOME/.local/bin/sem\" in your shell profile), then re-run.\n" +
          `Observed: ${(probe.stdout || probe.stderr).trim().split("\n")[0]}`,
      );
    }
    log("sem missing — installing globally via npm...");
    const r = run("npm", ["install", "-g", PKG]);
    if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}\nHint: global npm dir may need sudo, or use an nvm-managed Node.`);
    const v = semCliVersion();
    if (v === null) fail("sem still not identifiable on PATH after install");
    log(`installed sem ${v}`);
    return;
  }
  const local = semCliVersion() as string;
  // Update check via GitHub releases (no side-effect files — second run stays byte-identical).
  const latest = await latestReleaseVersion();
  if (latest === null) {
    log(`WARN: GitHub releases unreachable — skipping update check (local sem ${local})`);
    return;
  }
  if (latest === local) {
    log(`sem up to date (${local}) — no install/update`);
    return;
  }
  log(`sem ${local} != latest ${latest} — running sem update...`);
  const u = runSem("update");
  if (u.code !== 0) fail(`sem update failed (exit ${u.code}):\n${u.stderr || u.stdout}`);
  const after = semCliVersion();
  if (after === null) fail("sem not identifiable after update");
  log(`sem update complete (sem ${after})`);
}

// ---- Step 2: MCP merge -----------------------------------------------------
function mergeMcp(): void {
  let template: { mcpServers?: Record<string, unknown> };
  try {
    template = JSON.parse(readTemplate("mcp.json"));
  } catch (e) {
    fail(`mcp.json template unparseable: ${e instanceof Error ? e.message : e}`);
  }
  const tplServers = template.mcpServers;
  if (!tplServers || typeof tplServers !== "object") fail("mcp.json template has no mcpServers object");

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
    const before = JSON.stringify(cfg);
    cfg.mcpServers = { ...servers, ...tplServers };
    const after = JSON.stringify(cfg);
    if (before === after && existsSync(target)) {
      log(`mcp unchanged: ${target}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
    log(`mcp merged: ${target}`);
  }
}


// ---- Main --------------------------------------------------------------------
async function main(): Promise<void> {
  await ensureCli();
  mergeMcp();
  log("done");
}

main();
