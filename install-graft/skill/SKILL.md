---
name: graft
description: Use graft — a local code graph of small markdown nodes with file:line spans and call edges — to understand how code works, find where things live, trace what calls a symbol, scope an edit, or get blast radius before a refactor, once the current repo has a graft/ graph. Also for orienting in an unfamiliar area, viewing a file's API cheaply, or checking whether the graph has drifted from the code. When graft/ is absent, say so and offer graft build instead of guessing.
license: MIT
compatibility: Requires Node >=20 with the graft CLI (npm install -g @nanonets/graft) or its MCP server; a per-repo graft/ graph must exist for tool use.
metadata:
  source: https://github.com/NanoNets/graft (.claude/skills/graft, v0.21.1)
---

# graft — Local Code-Graph Context

Course outline for mastering graft. Read the chapters you need; each is
self-contained reference material.

## What this skill unlocks

1. **Locate + understand** — ranked nodes with `file:line`, code crux inlined.
2. **Exhaustive find** — regex over indexed files, grouped by enclosing symbol.
3. **Cheap surfaces** — a file's signatures, a repo/dir orientation map.
4. **Exact edges** — who calls what, N-hop blast radius from precomputed wiring.
5. **Freshness** — whether the graph still matches the code.

## FIRST: check the precondition

Graft tools answer from a **`graft/` graph that must exist in the current repo**.

1. Check for `graft/` (or ask `graft_check_freshness` / `graft map` — they report
   absence honestly).
2. **Present** → use the tools below; querying a node costs a few hundred tokens,
   rebuilding by reading source costs thousands and misses the edges.
3. **Absent** → tell the user this repo has no graph yet and offer
   `graft build` (existing repo) or `graft init` (fresh setup). **Those are USER
   actions — never run them yourself**; they write `graft/`, `.gitignore`, and
   possibly agent wiring. Meanwhile fall back to grep/source reads.

## MCP-first

When the graft MCP server is configured, prefer the `graft_*` tools over
shelling out: `graft_find_code`, `graft_file_api`, `graft_trace_calls`,
`graft_find_all`, `graft_repo_map`, `graft_check_freshness`. CLI
(`graft ask|grep|skeleton|callers|map`) is the fallback for plain terminals,
scripts, and pipes. Full mapping → [references/mcp.md](references/mcp.md).

## Curriculum

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | CLI reference | [references/cli.md](references/cli.md) | The six commands — `ask --source`, `grep`, `skeleton`, `callers`, `map`, freshness — with when-to-use each. |
| 2 | MCP tools | [references/mcp.md](references/mcp.md) | `graft_*` tool mapping to CLI equivalents, argument shapes, when MCP wins. |
| 3 | Concepts & setup | [references/concepts.md](references/concepts.md) | Graph-as-markdown model, `graft/` cache, per-project wiring as USER action, telemetry, when NOT to use. |

## Gotchas (read before first use)

- **One tool per task.** Pick the command that fits, run it, act on the answer —
  don't chain tools hoping for more. Most tasks need one call.
- **`ask` is ranked top-N and will miss instances**; `grep` is exhaustive. Need
  *every* occurrence (call sites, constant uses) → `graft grep`, not re-asks.
- **Loosen before switching.** Grep for a short symbol name, not a full guessed
  signature; over-specific patterns return nothing even on indexed code. Drop
  the receiver/signature and retry `graft grep` — do NOT fall back to raw
  `grep -rn` for indexed files (slower, unranked).
- **Blast radius before rename/delete:** `callers <sym> --direction in --depth 2`
  (full transitive: `--depth all` before multi-file refactors).
- **Check freshness** (`graft_check_freshness` / compare graph vs code) when
  answers look stale or files changed since last build — rebuild is the user's
  call, not yours.
- **No API key needed**; every command is local and returns in under a second.

## Conventions in these chapters

- Commands copy-pasteable; `<angle>` placeholders are user values; `$0` in
  upstream prose = the `graft` binary.
- MCP arg names exact; CLI flags exact.
- Examples repo-agnostic; no host paths; no credentials.
