#!/usr/bin/env bun
// install-codegraph — idempotent cross-platform (Windows/macOS/Linux) installer for codegraph.
// Steps: 1) CLI ensure with spawn ALLOWLIST (npm install when missing;
//           `codegraph upgrade --check` read-only compare -> `upgrade` when behind)
//           FORBIDDEN: install/uninstall/init/uninit/telemetry (config writers,
//           repo-index mutation, user policy) — structurally unreachable
//        2) merge MCP template into pi + agy configs
//        3) upsert AGENTS.md activation block  4) deploy skill to ~/.agents/skills/codegraph.
// Run: bun install-codegraph/install-codegraph.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- codegraph:start -->";
const END_BALISE = "<!-- codegraph:end -->";
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
  if (!/^---\n/.test(head) || !/\bname:\s*codegraph\b/.test(fm)) fail("skill/SKILL.md frontmatter must declare name: codegraph (installed parent dir is codegraph)");
  const destRoot = join(homedir(), ".agents", "skills", "codegraph");
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
  mergeMcp();
  const block = upsertBlock(readTemplate("AGENTS.md"));
  upsertAgentsMd(block);
  deploySkill();
  log("done");
}

main();
