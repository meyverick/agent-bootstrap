---
name: benzi
description: Use benzi for compiler-backed whole-repo code intelligence — resolved call graphs, data flow, symbol profiles, gated edits, and runtime-traced verification over MCP. Activate for "who calls X", "what breaks if I change X", "where did this value come from", symbol/hierarchy lookups, or verifying an edit against the real parser.
---

# benzi skill — compiler-backed code intelligence

Syllabus. Read the route first; open `references/` files one level deep when a step needs detail.

## What benzi is

Tree-sitter compiler parses the whole repo once into a resolved index: symbols, call edges, references, inheritance, data flow. MCP surface (`benzi-mcp`, stdio, CWD-rooted) exposes ~35 tools over that index. One pass, then queries answer O(1) instead of grepping.

## Route

1. **Tool surface & index states** → `references/tools.md`
   Six states (resolved / external / candidate / unresolved / observed / unindexed), the 16 headline tools (`get_callers`, `backflow`, `trace_path`, `profile`, `search_symbols`, `skim_source`, …), and what each answers. Read before first query.
2. **Workflow: compile → query → edit-gate → verify → reindex** → `references/workflow.md`
   How a question flows through the index, how gated writes auto-revert a broken parse, blast-radius checks, the runtime tracer settling ambiguous edges, snapshot rollback. Read before letting benzi write code.
3. **CLI & auth (headless, login, config)** → `references/cli.md`
   `benzi-headless <repo> "<question>"` for scripts/CI, `benzi-login` one-time interactive auth, `~/.benzi/config.json` layout, BYOK model keys. Read before scripting benzi outside MCP or when auth errors appear.

## Hard rules

- **Never embed credentials.** Keys live in `~/.benzi/config.json` (written by the user via `benzi-login`). Project files carry only the bare `benzi-mcp` command entry.
- **Auth is a user action.** Never spawn `benzi-login` — interactive email-code flow. Surface the hint: run `benzi-login` once before MCP use.
- **Index freshness.** Every turn re-parses changed files automatically; if the answer smells stale (recent edits not reflected), re-ask after the incremental sweep rather than trusting a cached edge.
- **Candidate ≠ resolved.** When benzi reports `candidate`/`unresolved`, it deliberately refused to guess — present the bounded set or the stated reason, never collapse it to a single answer.
