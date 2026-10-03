---
name: sem
description: Use sem for entity-level Git intelligence — semantic diffs (functions/classes/methods instead of lines), blast-radius impact analysis, entity blame and evolution, dependency graphs, and token-efficient code context. Activate when asked what changed in a commit/PR/branch, what breaks if an entity changes, who last touched code, how a function evolved, where an entity or concept lives, or when gathering structured code context for review, refactor, or an LLM task — even when the user says "diff" or "grep" in plain terms.
license: MIT OR Apache-2.0
compatibility: Requires the sem CLI (npm install -g @ataraxy-labs/sem) on PATH and a Git repository. MCP server ships in the same binary (`sem mcp`).
metadata:
  source: https://github.com/Ataraxy-Labs/sem (skills/sem + agent-skill, v0.26.0)
---

# sem — Semantic Version Control

Course outline for mastering sem (entity-level Git). Read the chapters you need;
each is self-contained reference material. Do not load the whole set for one lookup.

## What this skill unlocks

1. **See changes as entities** — "function `validateToken` modified", not "lines 43-51".
2. **Know blast radius** — what breaks, who calls it, which tests are affected.
3. **Trace history** — who last touched an entity, how it evolved, repo hotspots.
4. **Fetch precise context** — entity body + callers/callees in one call, token-budgeted.

## FIRST: MCP tools over CLI

When the sem MCP server is configured (tools `mcp__sem__*`), **always call those
instead of shelling out** — they render as tool calls, return compact entity
trees, and carry `elapsed_ms`. Do not fall back to Bash just because the shell
is open.

| Task | MCP tool |
|------|----------|
| what changed | `sem_diff` |
| blast radius / what breaks | `sem_impact` |
| read an entity + callers/callees | `sem_context` with just `entity_name` |
| find code by intent | `sem_entities` with `query` |
| find a string/error/config key | `sem_entities` with `text` |
| who last touched it | `sem_blame` |
| how it evolved / hotspots | `sem_log` |

Full tool reference → [references/mcp.md](references/mcp.md).
Use CLI for real terminals, scripts, or commands MCP does not expose.

## When to reach for sem

- "What changed in this commit / PR / branch?"
- "What breaks if I change / delete this function?"
- "Who last touched this?" / "How did this evolve?"
- Structured, token-efficient context for review, refactor, or an LLM subtask
- Code review wanting entity-level signal instead of line noise
- Line-level `git diff` output would be noisy or misleading

## Curriculum

Read in order when learning; jump to the pointer when fluent.

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | Core commands | [references/commands.md](references/commands.md) | `diff`, `impact`, `blame`, `log`, `context`, `entities`, `graph`, `find`/`callers`/`refs`, `grep` — flags, change types, disambiguation. |
| 2 | MCP server & one-call lookup | [references/mcp.md](references/mcp.md) | 8 stdio tools; `sem_context entity_name` as the single-round-trip default; when CLI beats MCP. |
| 3 | JSON output & grep-complement workflow | [references/workflow.md](references/workflow.md) | `--format json` schema; grep to locate → sem to structure; ranked search vs deterministic resolve. |
| 4 | Setup, health & hazards | [references/health.md](references/health.md) | Install/verify, GNU Parallel `sem` collision, `sem setup` danger, cold-index behavior, cloud/telemetry opt-in. |

## Gotchas (read before first use)

- **GNU Parallel ships a colliding `sem` binary.** Verify with `sem --version`
  (sem-cli prints `sem X.Y.Z`). Mismatch → fix PATH/alias, see health chapter.
- **Never run `sem setup` casually.** It globally replaces `git diff` with
  `sem diff`. Explicit user request only; `sem unsetup` reverses.
- **sem is deterministic — no fuzzy ranking.** Unknown/ambiguous names return
  candidates, not guesses. Cheap text search first (`sem_entities query/text`
  or `grep`), then resolve the exact entity.
- **Cloud/telemetry are opt-in.** `sem login/cloud/review/telemetry` change
  account or upload state — never invoke without explicit user request.
- **Untracked files are excluded from `sem diff`** (matches git behavior).
- **Cold `sem find`/`grep` builds the mmap index on first run** (then <10ms);
  first call on a large repo is slower — expected, not a hang.

## Conventions in these chapters

- Commands are copy-pasteable; `<angle>` placeholders are user values.
- `--format json` preferred when output feeds another tool.
- Examples are repo-agnostic; no project-specific paths.
