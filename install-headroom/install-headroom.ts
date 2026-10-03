#!/usr/bin/env bun
// install-headroom — idempotent cross-platform (Windows/macOS/Linux) installer for headroom.
// Steps: 1) uv gate + CLI ensure with spawn ALLOWLIST (--version/-v/update;
//           PyPI fetch compare -> `headroom update` when behind; missing ->
//           uv tool install "headroom-ai[all]")
//           FORBIDDEN: learn/wrap/unwrap/init/mcp/install/deploy/proxy
//           (instruction writers, config writers, daemons) — unreachable
//        2) merge MCP template into pi + agy configs
//        3) upsert AGENTS.md activation block  4) deploy skill to ~/.agents/skills/headroom.
// Run: bun install-headroom/install-headroom.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- headroom:start -->";
const END_BALISE = "<!-- headroom:end -->";
const PKG = "headroom-ai";
const PYPI_JSON = "https://pypi.org/pypi/headroom-ai/json";

const isWin = process.platform === "win32";

function log(msg: string): void {
  console.log(`[install-headroom] ${msg}`);
}
function warn(msg: string): void {
  console.error(`[install-headroom] WARN: ${msg}`);
}
function fail(msg: string): never {
  console.error(`[install-headroom] ERROR: ${msg}`);
  process.exit(1);
}

// Run a command; returns {code, stdout, stderr}. Never throws.
function run(cmd: string, args: string[], cwd?: string) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    cwd,
    // Windows: uv/headroom are .cmd shims or PATH entries — shell resolves them.
    shell: isWin,
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// Structural allowlist: headroom is ONLY ever spawned with these joined argv
// strings. Never `learn`/`wrap`/`unwrap`/`init`/`mcp`/`install`/`deploy`/
// `proxy` (instruction writers, agent-config writers, daemon launchers).
const HEADROOM_ALLOWED = new Set(["--version", "-v", "update", "update -y"]);
function runHeadroom(args: string[]) {
  const joined = args.join(" ");
  if (!HEADROOM_ALLOWED.has(joined)) fail(`internal guard: headroom "${joined}" is not on the allowlist`);
  return run("headroom", args);
}

function readTemplate(name: string): string {
  const p = join(SCRIPT_DIR, name);
  if (!existsSync(p)) fail(`template missing: ${p}`);
  return readFileSync(p, "utf8");
}

// ---- Step 1: uv gate + CLI ensure (allowlisted) -----------------------------
// Parse `headroom --version`: "headroom, version X.Y.Z".
function parseLocalVersion(out: string): string | null {
  const m = out.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

async function ensureCli(): Promise<void> {
  const uv = run("uv", ["--version"]);
  if (uv.code !== 0) fail("uv not found on PATH — headroom is installed via `uv tool install` (upstream-recommended); install uv from https://docs.astral.sh/uv/getting-started/installation/");
  log(`uv ${uv.stdout.trim().replace(/^uv\s+/, "")} ok`);

  const probe = runHeadroom(["--version"]);
  if (probe.code !== 0) {
    log("headroom missing — installing via uv tool...");
    const r = run("uv", ["tool", "install", `${PKG}[all]`]);
    if (r.code !== 0) fail(`uv tool install "${PKG}[all]" failed (exit ${r.code}):\n${r.stderr}`);
    const after = runHeadroom(["--version"]);
    if (after.code !== 0) fail("headroom still not on PATH after install");
    log(`installed headroom ${parseLocalVersion(after.stdout) ?? after.stdout.trim()}`);
    return;
  }

  const local = parseLocalVersion(`${probe.stdout}\n${probe.stderr}`);
  if (!local) {
    warn(`cannot parse \`headroom --version\` output — skipping update check`);
    return;
  }
  // Read-only PyPI compare (context7/jcodemunch class). Offline -> warn + continue.
  let latest: string | null = null;
  try {
    const r = await fetch(PYPI_JSON);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: unknown = await r.json();
    const v = typeof j === "object" && j !== null && "info" in j ? (j as { info?: { version?: unknown } }).info?.version : undefined;
    latest = typeof v === "string" && /^\d+\.\d+\.\d+$/.test(v) ? v : null;
    if (!latest) throw new Error("no info.version");
  } catch {
    warn("PyPI unreachable — skipping update check (local headroom untouched)");
    return;
  }
  if (latest === local) {
    log(`headroom up to date (${local}) — no install/update`);
    return;
  }
  log(`headroom ${local} < latest ${latest} — running headroom update...`);
  // -y: upstream prompts for confirmation; non-interactive stdin would abort.
  const u = runHeadroom(["update", "-y"]);
  if (u.code !== 0) {
    // Upstream refusal (git/editable/Docker/system Python) carries guidance.
    fail(`headroom update failed or refused (exit ${u.code}):\n${(u.stdout + u.stderr).trim()}`);
  }
  const verify = runHeadroom(["--version"]);
  if (verify.code !== 0) fail("headroom not identifiable after update");
  const after = parseLocalVersion(`${verify.stdout}\n${verify.stderr}`);
  if (!after || after === local) {
    // Upstream prints "upgraded to X" even when resolution kept the installed
    // version (observed: Intel Mac — onnxruntime ships no macosx x86_64 wheel,
    // so uv backtracks to the newest installable release). Warn, continue.
    warn(`update did not advance headroom (local ${local}, latest ${latest}) — ${latest} is unresolvable on this platform (dependency wheel gap); ${local} is the newest installable here`);
    return;
  }
  log(`headroom update complete (${after})`);
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
  if (!tplServers["headroom"] || typeof tplServers["headroom"] !== "object") fail("mcp.json template missing headroom entry");

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
    const had = "headroom" in servers;
    const before = JSON.stringify(cfg);
    servers["headroom"] = tplServers["headroom"];
    cfg.mcpServers = servers;
    const after = JSON.stringify(cfg);
    if (before === after && existsSync(target)) {
      log(`mcp unchanged: ${target}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`);
    log(had ? `mcp merged: ${target}` : `mcp merged (headroom registered): ${target}`);
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
  if (!/^---\n/.test(head) || !/\bname:\s*headroom\b/.test(fm)) fail("skill/SKILL.md frontmatter must declare name: headroom (installed parent dir is headroom)");
  const destRoot = join(homedir(), ".agents", "skills", "headroom");
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
async function main(): Promise<void> {
  await ensureCli();
  mergeMcp();
  const block = upsertBlock(readTemplate("AGENTS.md"));
  upsertAgentsMd(block);
  deploySkill();
  log("done");
}

main();
