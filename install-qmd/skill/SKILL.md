---
name: qmd
description: Search and retrieve from local markdown knowledge bases with qmd (BM25 keyword, vector semantic, hybrid reranking — all on-device). Use when asked to find notes, meeting transcripts, docs, wikis, ADRs, specs, or any indexed markdown; to answer questions from project knowledge before web search; or to set up, update, repair, or embed qmd collections and its MCP server.
license: MIT
compatibility: Requires qmd CLI (`npm install -g @tobilu/qmd`) or its MCP server.
metadata:
  author: tobi
  version: "1.0.0"
allowed-tools: Bash(qmd:*) mcp__qmd__*
---

# qmd — On-Device Markdown Search

Course outline for mastering qmd. Read the chapters you need; do not load the
whole set for a single lookup. Each chapter is self-contained reference material.

## What this skill unlocks

1. **Find** — locate candidates in indexed markdown by keyword, meaning, or hybrid.
2. **Retrieve** — fetch full source by docid, path, glob, or line range.
3. **Understand indexes** — collections, coverage, metadata filters, health.
4. **Operate** — install, initialize, embed, update, and diagnose qmd; wire its MCP server.

## The one invariant workflow

```
search (candidates)  ->  retrieve (full source)  ->  answer from retrieved text
```

Never answer facts, decisions, quotes, or nuance from snippets — snippets are
leads only. Cite `#docid` + path (and line numbers) when reporting.

## Curriculum

Read in order when learning; jump to the pointer when already fluent.

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | Search modes & query craft | [references/search.md](references/search.md) | When `search` vs `vsearch` vs `query`; authoring `intent:/lex:/vec:/hyde:` yourself instead of leaning on expansion. |
| 2 | Retrieval & slicing | [references/retrieval.md](references/retrieval.md) | `get`/`multi-get`, `#docid` and `qmd://` paths, `:from:count` line windows, `--full-path`, citation format. |
| 3 | Collections & metadata | [references/collections.md](references/collections.md) | `collection add/list/show`, `ls`, discovering keys before filtering, the `--filter` JSON AST. |
| 4 | MCP server | [references/mcp.md](references/mcp.md) | stdio/HTTP transports, the structured `query` tool, per-client config, when MCP beats CLI. |
| 5 | Setup, health & maintenance | [references/maintenance.md](references/maintenance.md) | Install, `init`, `update`, `embed`, `pull`, `doctor`, `status`, `trust`, model/GPU troubleshooting. |

## Routing: which chapter, when

- User asks to **find / recall / answer from** local markdown → Chapter 1, then Chapter 2.
- Known exact title, symbol, or rare phrase → Chapter 1 (lexical section) first — it is faster.
- Need several hits compared or a window around a hit → Chapter 2.
- Corpus drifting into wrong collection, or query needs hard constraints → Chapter 3.
- Agent has MCP tools (`mcp__qmd__*`) instead of/in addition to CLI → Chapter 4.
- `qmd` missing, index missing, model/GPU failure, slow `query` → Chapter 5.

## Gotchas (read before first use)

- **Never slice output with `sed`/`head`/`tail`.** Use `qmd get "#id:from:count"` —
  piping breaks docid resolution, virtual paths, and line numbering.
- **Do not delegate query expansion.** You know the user's real goal; write the
  structured fields yourself. Bare `qmd query "<user sentence>"` discards context only you have.
- **BM25 over vectors for exact terms.** Semantic search is for paraphrase, not lookups.
- **Mutation is not a first step.** `collection add`, `update`, `embed` change local
  state and can be expensive. Search and retrieve are safe; mutate only on explicit request.
- **Model-backed commands are environment-sensitive.** `query`/`vsearch` failure →
  run `qmd doctor`, fall back to `qmd search` with stronger lexical terms.
- **Check filter coverage first.** A key declared by 388/480 docs leaves 92 unreachable
  by value conditions; only `exists: false` selects them (Chapter 3).

## Conventions used in these chapters

- Commands are copy-pasteable POSIX+cmd-compatible; no shell-specific expansions.
- `$'...'` multiline examples show field-per-line structure — on Windows cmd,
  pass the same fields as a literal multiline argument.
- `<angle>` placeholders are user values; `#abc123` docids are illustrative.
