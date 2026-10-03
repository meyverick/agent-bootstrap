#!/usr/bin/env bun
// install-sem — idempotent cross-platform (Windows/macOS/Linux) installer for sem.
// Steps: 1) ensure global CLI (npm install when missing, `sem update` when outdated,
//        GNU-Parallel collision guard)  2) merge MCP template into pi + agy configs
//        3) upsert AGENTS.md directive block  4) deploy skill to ~/.agents/skills/sem.
// Run: bun install-sem/install-sem.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const START_BALISE = "<!-- sem:start -->";
const END_BALISE = "<!-- sem:end -->";
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
  // Spec: name must match installed parent dir — enforce before deploying.
  const head = readFileSync(skillMd, "utf8").slice(0, 512);
  if (!/^---[\s\S]*?\bname:\s*sem\b/m.test(head)) fail("skill/SKILL.md frontmatter must declare name: sem (installed parent dir is sem)");
  const destRoot = join(homedir(), ".agents", "skills", "sem");
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
