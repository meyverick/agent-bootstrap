#!/usr/bin/env bun
// install-jev — idempotent cross-platform (Windows/macOS/Linux) installer for jev-mcp.
// Steps: 1) prereq gate (Node >=22 + npx; read-only npm view version report — never mutates)
//        2) merge MCP template into pi + agy configs preserving entry env (API key carrier)
//        3) upsert AGENTS.md activation block  4) deploy skill to ~/.agents/skills/jev.
// Run: bun install-jev/install-jev.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- jev:start -->";
const END_BALISE = "<!-- jev:end -->";
const PKG = "@jkudish/jev-mcp";
const MIN_NODE_MAJOR = 22;

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-jev] ${msg}`);
}
function warn(msg: string): void {
  console.error(`[install-jev] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-jev] ERROR: ${msg}`);
  process.exit(1);
}

// Run a command; returns {code, stdout, stderr}. Never throws.
function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: npm/npx are .cmd shims — need a shell to resolve. POSIX: direct exec.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: runtime prerequisites (read-only; no package mutation) --------
function checkPrereqs(): void {
  const node = run("node", ["--version"]);
  if (node.code !== 0) fail(`node not found on PATH (required, >=${MIN_NODE_MAJOR}) — install Node ${MIN_NODE_MAJOR}+ and re-run`);
  const m = node.stdout.trim().match(/^v(\d+)/);
  if (!m) fail(`cannot parse node version from: ${node.stdout.trim() || node.stderr.trim()}`);
  const major = Number(m[1]);
  if (major < MIN_NODE_MAJOR) fail(`node v${major} too old — jev-mcp requires Node >=${MIN_NODE_MAJOR}`);
  log(`node v${major} ok (>=${MIN_NODE_MAJOR})`);

  const npx = run("npx", ["--version"]);
  if (npx.code !== 0) fail("npx not found on PATH — it spawns @jkudish/jev-mcp at MCP startup");
  log(`npx ${npx.stdout.trim()} ok`);

  // Information only: read-only registry view. Never install/update (spec: no package mutation).
  const v = run("npm", ["view", PKG, "version"]);
  if (v.code !== 0 || !v.stdout.trim()) {
    warn(`npm registry unreachable — skipping version report for ${PKG} (local spawn still resolves via npx)`);
    return;
  }
  log(`latest ${PKG}: ${v.stdout.trim()} (resolved at spawn by npx -y — no install performed)`);
}

// ---- Step 2: API-key-preserving MCP merge ----------------------------------
function mergeMcp(): void {
  let template: { mcpServers?: Record<string, unknown> };
  try {
    template = JSON.parse(readTemplate("mcp.json"));
  } catch (e) {
    fail(`mcp.json template unparseable: ${e instanceof Error ? e.message : e}`);
  }
  const tplServers = template.mcpServers;
  if (!tplServers || typeof tplServers !== "object") fail("mcp.json template has no mcpServers object");
  const tplEntry = tplServers["jev"];
  if (!tplEntry || typeof tplEntry !== "object") fail("mcp.json template missing jev entry");

  const home = homedir();
  const targets = [join(home, ".pi", "agent", "mcp.json"), join(home, ".gemini", "config", "mcp_config.json")];
  const processKey = process.env.TYPESAFE_API_KEY;
  let warnedNoKey = false;

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
    const existing = servers["jev"];
    const existingEnv =
      existing && typeof existing === "object" && "env" in existing && (existing as { env?: unknown }).env && typeof (existing as { env: unknown }).env === "object"
        ? ((existing as { env: Record<string, string> }).env)
        : undefined;

    // Entry-level policy: template refreshes command/args; env survives verbatim,
    // else process env inject, else omit + warn. Never write a key from this script's repo files.
    const entry: Record<string, unknown> = { ...(tplEntry as Record<string, unknown>) };
    if (existingEnv) {
      entry.env = existingEnv;
    } else if (processKey) {
      entry.env = { TYPESAFE_API_KEY: processKey };
    } else if (!warnedNoKey) {
      warn(`no provider key for jev (no config env, no TYPESAFE_API_KEY in environment) — server will fail closed until one is configured`);
      warnedNoKey = true;
    }

    const before = JSON.stringify(cfg);
    servers["jev"] = entry;
    cfg.mcpServers = servers;
    const after = JSON.stringify(cfg);
    if (before === after && existsSync(target)) {
      log(`mcp unchanged: ${target}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
    log(existingEnv ? `mcp merged (existing env preserved): ${target}` : processKey ? `mcp merged (env injected): ${target}` : `mcp merged (no env): ${target}`);
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
      writeFileSync(target, `${block}\n`);
      log(`created: ${target}`);
      continue;
    }
    const content = readFileSync(target, "utf8");
    const s = content.indexOf(START_BALISE);
    const e = content.indexOf(END_BALISE);
    if (s === -1 && e === -1) {
      const sep = content.length === 0 || content.endsWith("\n") ? "\n" : "\n\n";
      const next = content.length === 0 ? `${block}\n` : `${content}${sep}${block}\n`;
      if (next !== content) {
        writeFileSync(target, next);
        log(`appended block: ${target}`);
      }
      continue;
    }
    if (s === -1 || e === -1 || e < s) fail(`unbalanced balises in ${target} — fix manually (expected both ${START_BALISE} and ${END_BALISE})`);
    const next = content.slice(0, s) + block + content.slice(e + END_BALISE.length);
    if (next === content) {
      log(`block unchanged: ${target}`);
    } else {
      writeFileSync(target, next);
      log(`updated block: ${target}`);
    }
  }
}

// ---- Step 4: skill deploy (byte-compare sync) -------------------------------
function deploySkill(): void {
  const srcRoot = join(SCRIPT_DIR, "skill");
  const skillMd = join(srcRoot, "SKILL.md");
  if (!existsSync(skillMd)) fail(`skill template missing: ${skillMd}`);
  // Spec: name must match installed parent dir; frontmatter must be spec-fields-only.
  const head = readFileSync(skillMd, "utf8").slice(0, 1024);
  const fmEnd = head.indexOf("\n---", 4);
  const fm = fmEnd === -1 ? head : head.slice(0, fmEnd);
  if (!/^---\n/.test(head) || !/\bname:\s*jev\b/.test(fm)) fail("skill/SKILL.md frontmatter must declare name: jev (installed parent dir is jev)");
  if (/\bmcpServers:|\bincludeTools:/.test(fm)) fail("skill/SKILL.md frontmatter must not carry non-standard mcpServers/includeTools fields (MCP registration comes from mcp.json)");
  const destRoot = join(homedir(), ".agents", "skills", "jev");
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
  checkPrereqs();
  mergeMcp();
  const block = upsertBlock(readTemplate("AGENTS.md"));
  upsertAgentsMd(block);
  deploySkill();
  log("done");
}

main();
