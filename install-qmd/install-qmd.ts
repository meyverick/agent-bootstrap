#!/usr/bin/env bun
// install-qmd — idempotent cross-platform (Windows/macOS/Linux) installer for qmd.
// Steps: 1) ensure global CLI (npm install/update) 2) qmd init . in CWD when .qmd/ missing
//        3) merge MCP template into pi + agy configs  4) upsert AGENTS.md directive block.
// Run: bun install-qmd/install-qmd.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- qmd:start -->";
const END_BALISE = "<!-- qmd:end -->";
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

// ---- Step 4: AGENTS.md balise upsert ---------------------------------------
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

// ---- Step 5: skill deploy (byte-compare sync) -------------------------------
function deploySkill(): void {
  const srcRoot = join(SCRIPT_DIR, "skill");
  const skillMd = join(srcRoot, "SKILL.md");
  if (!existsSync(skillMd)) fail(`skill template missing: ${skillMd}`);
  // Spec: name must match installed parent dir — enforce before deploying.
  const head = readFileSync(skillMd, "utf8").slice(0, 512);
  if (!/^---[\s\S]*?\bname:\s*qmd\b/m.test(head)) fail("skill/SKILL.md frontmatter must declare name: qmd (installed parent dir is qmd)");
  const destRoot = join(homedir(), ".agents", "skills", "qmd");
  let copied = 0;
  let skipped = 0;
  const syncDir = (rel: string): void => {
    const from = join(srcRoot, rel);
    const to = join(destRoot, rel);
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const relPath = rel ? join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (!existsSync(join(to, entry.name))) mkdirSync(join(to, entry.name), { recursive: true });
        syncDir(relPath);
      } else {
        const s = readFileSync(join(from, entry.name));
        const dPath = join(to, entry.name);
        if (existsSync(dPath) && readFileSync(dPath).equals(s)) {
          skipped++;
          continue;
        }
        mkdirSync(to, { recursive: true });
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
function main(): void {
  ensureCli();
  initLocalIndex();
  seedCollections();
  mergeMcp();
  const block = upsertBlock(readTemplate("AGENTS.md"));
  upsertAgentsMd(block);
  deploySkill();
  log("done");
}

main();
