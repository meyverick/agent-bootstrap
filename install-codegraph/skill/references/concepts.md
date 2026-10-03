# Chapter 3 — Concepts & Setup

Self-contained reference. Read for runtime model, install channels, forbidden commands, telemetry, and scope limits.

## What codegraph is

A semantic code graph: Rust kernel parses source into symbols and edges
(caller/callee, imports, framework routes/navigations), served locally through
a CLI and an MCP server (`codegraph serve --mcp`). Queries read the per-repo
`.codegraph/` index — precision beats grep-and-read token burn.

## Runtime & install channels

- **Bundled runtime** — the binary ships self-contained; no compilers, no
  system Node needed at query time.
- Channels: official `install.sh`/`install.ps1` (PATH installer), npm global
  `@colbymchenry/codegraph` (what this environment uses), `npx` one-shot.
  Package `engines` declare node `>=20 <25` — newer node emits a non-strict npm
  warning; harmless because the runtime is bundled.
- **Upgrade:** `codegraph upgrade` (detects bundle/npm/npx and updates in
  place); `codegraph upgrade --check` = read-only availability probe. The
  managed installer uses exactly these two (allowlisted).

## Forbidden from agent flows (user-only commands)

| Command | Why forbidden |
|---------|---------------|
| `codegraph install` | Writes MCP config + a marker-fenced section into agent instruction files (CLAUDE.md/AGENTS.md/GEMINI.md) — agent-config writer |
| `codegraph uninstall` | Strips agent configs (and npm `preuninstall` runs the stripper) |
| `codegraph uninit` | Deletes the repo's `.codegraph/` |
| `codegraph telemetry` | Toggles user telemetry policy |

**Coexistence note:** if the user has run upstream `codegraph install`, its
marker-fenced section lives alongside our balise block — both are
marker-fenced, neither overwrites the other. Don't edit or remove either.

## Telemetry (opt-out, user-controlled)

Anonymous usage stats (commands used, languages, agents). Off switch — user's
choice, never ours: `CODEGRAPH_TELEMETRY=0`, `DO_NOT_TRACK=1` (cross-tool
standard), or `codegraph telemetry off`. Off means no recording, no connection.

## When NOT to use codegraph

- **Repo unindexed** (no `.codegraph/`) → offer `init`, fall back to grep/reads.
- **Non-code files** (docs, configs, lockfiles) → plain file tools.
- **Freshly edited file flagged `⚠️`** → `Read` it directly (chapter 2).
- **Foreign/unfetched repos** (not cloned locally) → nothing to index.

## Cost discipline

- One tool per question; `explore`/`context` front-load so follow-ups are few.
- `node` replaces "read file + trace callers" (two native steps) with one call.
- Report `⚠️` banners and index state when they affect answer confidence.

Next: back to the syllabus — [../SKILL.md](../SKILL.md).
