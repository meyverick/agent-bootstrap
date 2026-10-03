---
name: jcodemunch
description: Use jcodemunch MCP tools for token-efficient source code retrieval — find a function or symbol by name, fetch one symbol's exact source without reading the file, outline files and repos, full-text search code, find importers/references, compute blast radius of a change, spot dead code, and track token savings. Activate before reading, grepping, or structure-exploring a codebase when the MCP server is configured and the repo is indexed — even when phrased as "where is X", "what calls X", or "show me the function that".
license: dual-use (free for personal use; commercial licenses upstream)
compatibility: Requires the jcodemunch MCP server spawned via `uvx jcodemunch-mcp` (uv/uvx on PATH, Node not required for the server).
metadata:
  source: https://github.com/jgravelle/jcodemunch-mcp (QUICKSTART, USER_GUIDE, AGENT_HINTS, v1.108.327)
---

# jcodemunch — Token-Efficient Code Retrieval

Course outline for mastering the jcodemunch MCP tools. Read the chapters you
need; each is self-contained reference material.

## What this skill unlocks

1. **Find** — locate symbols by name or meaning (`search_symbols`) and text
   across code (`search_text`) without opening files.
2. **Fetch** — one symbol's exact source by id (`get_symbol_source`); file and
   repo outlines/trees instead of whole-file reads.
3. **Connect** — importers, references, blast radius, class hierarchies,
   dead code: structural queries grep cannot answer directly.
4. **Account** — per-session token savings and tool latency stats.

## Workflow first: resolve, index if needed, then query

```
1. resolve_repo(current dir)      -> is this repo indexed?
2. unindexed -> index_folder(path)   # global cache only, ZERO repo writes;
                                     # MAY run — it is not a repo mutation
   remote  -> index_repo(url)
3. query: search_symbols / get_symbol_source / outlines / find_* ...
4. after editing files: index_file(path)  # keep the index fresh
```

Indexing writes only the global `~/.code-index/` store — unlike repo-mutating
builds, running it when the task needs it is fine.

## MCP-first, native fallback

When the jcodemunch MCP server is configured and the repo is indexed, use its
tools BEFORE falling back to Read/Grep/Glob — that preference is the entire
point of the tool (upstream's "most commonly missed" guidance). Native tools
remain correct when the server is absent, the repo cannot be indexed, or the
target is not code (docs, configs).

Never run `jcodemunch-mcp init` or `jcm install` from agent flows — those write
agent configuration files and are user-driven setup actions.

## Curriculum

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | Workflow & tool map | [references/tools.md](references/tools.md) | Resolve/index/search/fetch/outline/connect commands with when-to-use each. |
| 2 | MUNCH & format handling | [references/munch.md](references/munch.md) | Compact default (`format=auto`), decode essentials, `format="json"` escape hatch. |
| 3 | Concepts & setup | [references/concepts.md](references/concepts.md) | Index store, uvx vs tool-install, savings stats, when NOT to use. |

## Gotchas (read before first use)

- **Responses may be MUNCH-encoded** (`format=auto` default). If the payload is
  not a JSON object (`#MUNCH/1 ...` header), re-call with `format="json"` —
  never guess at decoding you cannot do (chapter 2).
- **`resolve_repo` before anything** — every tool takes a `repo`; querying an
  unindexed repo wastes calls.
- **Prefer `get_symbol_source` over reading files** — a symbol fetch costs a
  fraction of a whole-file read; use `--full`-style detail only when the
  excerpt is too small to act on.
- **`search_text` is exhaustive; `search_symbols` is ranked** — exact identifier
  hunt → symbols; string/error-message hunt → text.
- **Index freshness:** after your edits, `index_file` that path — stale index
  answers lie.
- **Never treat stats as a goal** — `get_session_stats` reports savings; the
  task remains correct retrieval, not number chasing.

## Conventions in these chapters

- Tool names exact; argument names exact (`repo`, `query`, `symbol_id`, `path`, `format`).
- Examples repo-agnostic; no host paths; no credentials.
