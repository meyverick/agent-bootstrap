#!/usr/bin/env bun
// install-qmd — idempotent cross-platform (Windows/macOS/Linux) installer for qmd.
// Steps: 1) ensure global CLI (npm install/update) 2) qmd init . in CWD when .qmd/ missing
//        3) merge MCP template into pi + agy configs
// Run: bun qmd/install.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PKG = "@tobilu/qmd";

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-qmd] ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-qmd] ERROR: ${msg}`);
  process.exit(1);
}

function warn(msg: string): void {
  console.warn(`[install-qmd] WARN: ${msg}`);
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

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: global CLI availability -------------------------------------
function localQmdVersion(): string | null {
  const r = run("qmd", ["--version"]);
  if (r.code !== 0) return null;
  const m = r.stdout.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

function ensureCli(): void {
  const local = localQmdVersion();
  if (local === null) {
    log("qmd missing — installing globally via npm...");
    const r = run("npm", ["install", "-g", PKG]);
    if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}\nHint: global npm dir may need sudo, or use an nvm-managed Node.`);
    if (localQmdVersion() === null) fail("qmd still not on PATH after install");
    log(`installed qmd ${localQmdVersion()}`);
    return;
  }
  // Update check: registry unreachable → warn, keep local (offline-friendly).
  const v = run("npm", ["view", PKG, "version"]);
  if (v.code !== 0 || !v.stdout.trim()) {
    log(`WARN: npm registry unreachable — skipping update check (local qmd ${local})`);
    return;
  }
  const latest = v.stdout.trim();
  if (latest === local) {
    log(`qmd up to date (${local}) — no install/update`);
    return;
  }
  log(`qmd ${local} < latest ${latest} — updating...`);
  const r = run("npm", ["install", "-g", PKG]);
  if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}`);
  log(`updated to qmd ${localQmdVersion()}`);
}

// ---- Step 2: per-folder index bootstrap -----------------------------------
function initLocalIndex(): void {
  if (existsSync(join(process.cwd(), ".qmd"))) {
    log(".qmd exists in current folder — skipping init");
    return;
  }
  const r = run("qmd", ["init", "."]);
  if (r.code !== 0) fail(`qmd init . failed (exit ${r.code}):\n${r.stderr}`);
  log("initialized local .qmd index");
}

// ---- Step 2b: default knowledge collections (seed from default-db.json) ----
function splitCommand(cmd: string): string[] {
  return (cmd.match(/"[^"]*"|\S+/g) ?? []).map((t) => (t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t));
}

function seedCollections(): void {
  let catalog: Record<string, string>;
  try {
    catalog = JSON.parse(readTemplate("default-db.json"));
  } catch (e) {
    fail(`default-db.json unparseable: ${e instanceof Error ? e.message : e}`);
  }
  const list = run("qmd", ["collection", "list"]);
  const listed = list.code === 0 ? list.stdout : "";
  let created = 0;
  let skipped = 0;
  for (const [name, cmd] of Object.entries(catalog)) {
    // skip-by-name: user-edited collections are never re-added
    if (new RegExp(`(^|\\s)${name}($|\\s)`).test(listed)) {
      skipped++;
      continue;
    }
    const argv = splitCommand(cmd);
    // root path = token after `add` (relative to this project) — missing root → skip with log
    const addIdx = argv.findIndex((a) => a === "add");
    const rootPath = addIdx >= 0 ? argv[addIdx + 1] : undefined;
    if (rootPath && !existsSync(join(process.cwd(), rootPath))) {
      log(`qmd collection ${name}: skipped (root path missing: ${rootPath})`);
      skipped++;
      continue;
    }
    const r = run(argv[0], argv.slice(1));
    if (r.code !== 0) warn(`qmd collection ${name} failed (exit ${r.code}): ${(r.stderr || r.stdout).trim()}`);
    else created++;
  }
  log(`qmd collections: ${created} created, ${skipped} skipped (of ${Object.keys(catalog).length})`);
  const up = run("qmd", ["update"]);
  if (up.code !== 0) warn(`qmd update failed (exit ${up.code}): ${(up.stderr || up.stdout).trim()}`);
  else log("qmd update: index refreshed");
}

// ---- Step 3: MCP merge -----------------------------------------------------
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
    writeFileSync(target, JSON.stringify(cfg, null, 2) + "\n");
    log(`mcp merged: ${target}`);
  }
}


// ---- Main --------------------------------------------------------------------
function main(): void {
  ensureCli();
  initLocalIndex();
  seedCollections();
  mergeMcp();
  log("done");
}

main();
