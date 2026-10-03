#!/usr/bin/env bun
// install-graft — idempotent cross-platform (Windows/macOS/Linux) installer for graft.
// Steps: 1) Node >=20 gate + CLI ensure (npm install when missing; `graft version`
//           compare -> `graft upgrade` when behind) with spawn ALLOWLIST
//        2) merge MCP template into pi + agy configs (fills agy gap)
//        3) upsert AGENTS.md activation block  4) deploy skill to ~/.agents/skills/graft.
// NEVER spawns `graft uninstall` / `graft init` (destructive / interactive per-project).
// Run: bun install-graft/install-graft.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- graft:start -->";
const END_BALISE = "<!-- graft:end -->";
const PKG = "@nanonets/graft";
const MIN_NODE_MAJOR = 20;

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-graft] ${msg}`);
}
function warn(msg: string): void {
  console.error(`[install-graft] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-graft] ERROR: ${msg}`);
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

// Structural allowlist: graft is ONLY ever spawned with these args.
// Never `graft uninstall` (deletes wiring), never `graft init` (interactive,
// writes per-project files + hooks).
const GRAFT_ALLOWED_ARGS = new Set(["--version", "version", "upgrade"]);
function runGraft(arg: string) {
  if (!GRAFT_ALLOWED_ARGS.has(arg)) fail(`internal guard: graft subcommand "${arg}" is not on the allowlist`);
  return run("graft", [arg]);
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: Node gate + CLI ensure (allowlisted) ---------------------------
function checkNode(): void {
  const node = run("node", ["--version"]);
  if (node.code !== 0) fail(`node not found on PATH (required, >=${MIN_NODE_MAJOR}) — install Node ${MIN_NODE_MAJOR}+ and re-run`);
  const m = node.stdout.trim().match(/^v(\d+)/);
  if (!m) fail(`cannot parse node version from: ${node.stdout.trim() || node.stderr.trim()}`);
  const major = Number(m[1]);
  if (major < MIN_NODE_MAJOR) fail(`node v${major} too old — graft requires Node >=${MIN_NODE_MAJOR}`);
  log(`node v${major} ok (>=${MIN_NODE_MAJOR})`);
}

// Parse `graft version` output: installed + latest published (one call).
function parseVersionOut(out: string): { installed: string | null; latest: string | null } {
  const vers = out.match(/\b\d+\.\d+\.\d+\b/g) ?? [];
  return { installed: vers[0] ?? null, latest: vers[1] ?? vers[0] ?? null };
}

function ensureCli(): void {
  const probe = runGraft("--version");
  if (probe.code !== 0) {
    log("graft missing — installing globally via npm...");
    const r = run("npm", ["install", "-g", PKG]);
    if (r.code !== 0) fail(`npm install -g ${PKG} failed (exit ${r.code}):\n${r.stderr}\nHint: global npm dir may need sudo, or use an nvm-managed Node.`);
    const after = runGraft("--version");
    if (after.code !== 0) fail("graft still not on PATH after install");
    log(`installed graft ${after.stdout.trim()}`);
    return;
  }
  const v = runGraft("version");
  if (v.code !== 0) {
    warn(`graft version check failed — skipping update check (local graft ${probe.stdout.trim()})`);
    return;
  }
  const { installed, latest } = parseVersionOut(`${v.stdout}\n${v.stderr}`);
  if (!installed) {
    warn(`cannot parse graft version output — skipping update check`);
    return;
  }
  if (!latest || latest === installed) {
    log(`graft up to date (${installed}) — no install/upgrade`);
    return;
  }
  log(`graft ${installed} < latest ${latest} — running graft upgrade...`);
  const u = runGraft("upgrade");
  if (u.code !== 0) fail(`graft upgrade failed (exit ${u.code}):\n${u.stderr || u.stdout}`);
  const verify = runGraft("--version");
  if (verify.code !== 0) fail("graft not identifiable after upgrade");
  log(`graft upgrade complete (${verify.stdout.trim()})`);
}

// ---- Step 2: MCP merge (agy gap fill) ---------------------------------------
function mergeMcp(): void {
  let template: { mcpServers?: Record<string, unknown> };
  try {
    template = JSON.parse(readTemplate("mcp.json"));
  } catch (e) {
    fail(`mcp.json template unparseable: ${e instanceof Error ? e.message : e}`);
  }
  const tplServers = template.mcpServers;
  if (!tplServers || typeof tplServers !== "object") fail("mcp.json template has no mcpServers object");
  if (!tplServers["graft"] || typeof tplServers["graft"] !== "object") fail("mcp.json template missing graft entry");

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
    const had = "graft" in servers;
    const before = JSON.stringify(cfg);
    servers["graft"] = tplServers["graft"];
    cfg.mcpServers = servers;
    const after = JSON.stringify(cfg);
    if (before === after && existsSync(target)) {
      log(`mcp unchanged: ${target}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
    log(had ? `mcp merged: ${target}` : `mcp merged (graft registered): ${target}`);
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
  // Spec: name must match installed parent dir; frontmatter spec-fields-only.
  const head = readFileSync(skillMd, "utf8").slice(0, 1024);
  const fmEnd = head.indexOf("\n---", 4);
  const fm = fmEnd === -1 ? head : head.slice(0, fmEnd);
  if (!/^---\n/.test(head) || !/\bname:\s*graft\b/.test(fm)) fail("skill/SKILL.md frontmatter must declare name: graft (installed parent dir is graft)");
  const destRoot = join(homedir(), ".agents", "skills", "graft");
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
  checkNode();
  ensureCli();
  mergeMcp();
  const block = upsertBlock(readTemplate("AGENTS.md"));
  upsertAgentsMd(block);
  deploySkill();
  log("done");
}

main();
