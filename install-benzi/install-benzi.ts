#!/usr/bin/env bun
// install-benzi — idempotent cross-platform (Windows/macOS/Linux) installer for benzi.
// Steps: 1) uv gate + package ensure (`uv tool install benzi`; probe = `uv tool list benzi`,
//           PyPI compare + `uv tool upgrade benzi`)  2) merge MCP template into user-level
//           pi + agy configs  3) upsert AGENTS.md directive block (neutral stance — own
//           triggers only)  4) deploy skill tree  5) report-only `benzi-login` hint.
// NEVER spawns benzi-mcp / benzi-login / benzi-headless (no `benzi --version` exists;
// version probe is `uv tool list benzi`) — login is interactive (email code), user action.
// Run: bun install-benzi/install-benzi.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- benzi:start -->";
const END_BALISE = "<!-- benzi:end -->";
const PKG = "benzi";
const PYPI_JSON = "https://pypi.org/pypi/benzi/json";

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-benzi] ${msg}`);
}
function warn(msg: string): void {
  console.warn(`[install-benzi] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-benzi] ERROR: ${msg}`);
  process.exit(1);
}

// Run a command; returns {code, stdout, stderr}. Never throws.
function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: uv is a .cmd shim or PATH entry — shell resolves it. POSIX: direct exec.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

async function pypiLatest(): Promise<string | null> {
  try {
    const r = await fetch(PYPI_JSON);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: unknown = await r.json();
    const v = typeof j === "object" && j !== null && "info" in j ? (j as { info?: { version?: unknown } }).info?.version : undefined;
    return typeof v === "string" && /^\d+\.\d+\.\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

// ---- Step 1: uv gate + package ensure --------------------------------------
// Probe via `uv tool list benzi` — benzi ships no version flag and the three
// benzi-* binaries are NEVER spawned by this installer.
function localVersion(): string | null {
  const r = run("uv", ["tool", "list"]);
  if (r.code !== 0) return null;
  const m = r.stdout.match(/^benzi v?(\d+\.\d+\.\d+)$/m);
  return m ? m[1] : null;
}

async function ensureCli(): Promise<void> {
  const uv = run("uv", ["--version"]);
  if (uv.code !== 0) fail("uv not found on PATH — benzi is installed via `uv tool install benzi` — install uv from https://docs.astral.sh/uv/getting-started/installation/");
  log(`uv ${uv.stdout.trim().replace(/^uv\s+/, "")} ok`);

  const local = localVersion();
  if (local === null) {
    log("benzi missing — installing via uv tool...");
    const r = run("uv", ["tool", "install", PKG]);
    if (r.code !== 0) fail(`uv tool install ${PKG} failed (exit ${r.code}):\n${r.stderr}\nHint: benzi wheels need Python >=3.11,<3.15 available to uv.`);
    const after = localVersion();
    if (after === null) fail("benzi still not installed after `uv tool install` (check `uv tool list benzi`)");
    log(`installed benzi ${after}`);
    log("benzi-login not run by installer (interactive email-code flow) — authenticate once before MCP use: benzi-login");
    return;
  }
  // Update check: PyPI unreachable → warn, keep local (offline-friendly).
  const latest = await pypiLatest();
  if (latest === null) {
    warn("PyPI unreachable — skipping benzi update check (local untouched)");
    return;
  }
  if (latest === local) {
    log(`benzi up to date (${local}) — no install/update`);
    log("benzi-login not run by installer (interactive email-code flow) — authenticate once before MCP use: benzi-login");
    return;
  }
  log(`benzi ${local} < latest ${latest} — upgrading...`);
  const u = run("uv", ["tool", "upgrade", PKG]);
  if (u.code !== 0) fail(`uv tool upgrade ${PKG} failed (exit ${u.code}):\n${u.stderr}`);
  const after = localVersion();
  if (after === null) fail("benzi not identifiable after upgrade");
  if (after === local) {
    warn(`upgrade did not advance benzi (local ${local}, latest ${latest}) — ${latest} unresolvable on this platform; ${local} is the newest installable here`);
    return;
  }
  log(`benzi upgrade complete (${after})`);
}

// ---- Step 2: MCP merge (user-level host configs) ---------------------------
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

// ---- Step 3: AGENTS.md balise upsert ---------------------------------------
function upsertBlock(block: string): string {
  const s = block.indexOf(START_BALISE);
  const e = block.indexOf(END_BALISE);
  if (s === -1 || e === -1 || e < s) fail(`AGENTS.md template lacks balanced ${START_BALISE} / ${END_BALISE}`);
  // Block must end exactly at END_BALISE (no trailing newline) so the splice
  // leaves the newline after the block untouched → idempotent, no growth.
  return block.slice(s, e + END_BALISE.length);
}

function upsertAgentsMd(block: string): void {
  const home = homedir();
  const targets = [join(home, ".pi", "agent", "AGENTS.md"), join(home, ".gemini", "AGENTS.md")];

  for (const target of targets) {
    if (!existsSync(target)) {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, block + "\n");
      log(`created: ${target}`);
      continue;
    }
    const content = readFileSync(target, "utf8");
    const s = content.indexOf(START_BALISE);
    const e = content.indexOf(END_BALISE);
    if (s === -1 && e === -1) {
      const sep = content.length === 0 || content.endsWith("\n") ? "\n" : "\n\n";
      const next = content.length === 0 ? block + "\n" : content + sep + block + "\n";
      if (next !== content) {
        writeFileSync(target, next);
        log(`appended block: ${target}`);
      }
      continue;
    }
    if (s === -1 || e === -1 || e < s) fail(`unbalanced balises in ${target} — fix manually (expected both ${START_BALISE} and ${END_BALISE})`);
    const next = content.slice(0, s) + block + content.slice(e + END_BALISE.length);
    if (next !== content) {
      writeFileSync(target, next);
      log(`updated block: ${target}`);
    } else {
      log(`block unchanged: ${target}`);
    }
  }
}

// ---- Step 4: skill deploy (byte-compare sync, global Agent-Skills scope) ----
function deploySkill(): void {
  const srcRoot = join(SCRIPT_DIR, "skill");
  const skillMd = join(srcRoot, "SKILL.md");
  if (!existsSync(skillMd)) fail(`skill template missing: ${skillMd}`);
  // Spec: name must match installed parent dir — enforce before deploying.
  const head = readFileSync(skillMd, "utf8").slice(0, 512);
  if (!/^---[\s\S]*?\bname:\s*benzi\b/m.test(head)) fail("skill/SKILL.md frontmatter must declare name: benzi (installed parent dir is benzi)");
  const destRoot = join(homedir(), ".agents", "skills", "benzi");
  let copied = 0;
  let skipped = 0;
  const syncDir = (rel: string): void => {
    const from = join(srcRoot, rel);
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const relPath = rel ? join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        syncDir(relPath);
      } else {
        const s = readFileSync(join(from, entry.name));
        const dPath = join(destRoot, relPath);
        if (existsSync(dPath) && readFileSync(dPath).equals(s)) {
          skipped++;
          continue;
        }
        mkdirSync(dirname(dPath), { recursive: true });
        writeFileSync(dPath, s);
        copied++;
      }
    }
  };
  if (!existsSync(destRoot)) mkdirSync(destRoot, { recursive: true });
  syncDir("");
  log(copied > 0 ? `skill deployed: ${copied} file(s) written, ${skipped} unchanged -> ${destRoot}` : `skill unchanged (${skipped} file(s)): ${destRoot}`);
}

// ---- Main --------------------------------------------------------------------
async function main(): Promise<void> {
  await ensureCli();
  mergeMcp();
  const block = upsertBlock(readTemplate("AGENTS.md"));
  upsertAgentsMd(block);
  deploySkill();
  log("done");
}

main();
