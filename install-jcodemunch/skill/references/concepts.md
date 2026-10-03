# Chapter 3 — Concepts & Setup

Self-contained reference. Read for the index model, runtime wiring, stats, and scope limits.

## The index (global cache, not repo state)

- jcodemunch parses source with tree-sitter and stores symbol metadata +
  content in a local index under the **global cache (`~/.code-index/`)**.
- **Zero repo writes**: indexing a project never adds files, hooks, or ignore
  entries to that project — unlike some code-graph tools' per-repo builds.
  Because it is not a repo mutation, running `index_folder` when a task needs
  it is fine without a separate user go-ahead.
- Re-index after edits (`index_file`) or re-run `index_folder` for bulk changes;
  stale indexes produce stale answers.
- `list_repos` shows what's indexed; `resolve_repo` answers per-repo status.

## Runtime: uvx-spawned server

- The MCP entry is `{"command":"uvx","args":["jcodemunch-mcp"]}` — uv resolves
  the package ephemerally at spawn (nothing pinned in the client config).
- Prerequisite: **uv/uvx on PATH** (https://docs.astral.sh/uv/). Python >=3.10
  is fetched/managed by uv itself — no system Python concerns.
- `uv tool install jcodemunch-mcp` is the pinned alternative — only needed by
  upstream enforcement hooks (minimal-PATH subshells resolve the executable by
  name). Plain agent use: uvx is the recommended default.
- `jcodemunch-mcp init` / `jcm install <client>` are **config-writing
  installers** (client configs, hooks, prompt policies) — user-driven, never
  agent-run.

## Accounting

- `get_session_stats` → session/lifetime tokens + cost saved, per-tool latency
  (`p50/p95/error`), result-cache hit rates.
- Lifetime persists at `~/.code-index/session_stats.json` — non-empty means the
  tool is wired and being used; zero suggests the agent is bypassing it (check
  that the MCP server is registered and the skill activated).
- Numbers are advisory context for the user, not task success criteria.

## When NOT to use jcodemunch

- **Repo not indexed and cannot be** (private remote without fetch, hostile
  size) → native reads/grep with a caveat.
- **Non-code content** (docs, configs, lockfiles, prose) → plain file tools or
  text search outside the index.
- **Fresh edit not yet indexed** → `index_file` first (cheap), then query.
- **One-line files / trivial reads** → reading directly may cost less than a
  tool round-trip; judgment call.

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `resolve_repo` → not indexed | first contact | `index_folder` / `index_repo` |
| Answers miss your recent edits | stale index | `index_file` that path |
| Non-JSON payload | MUNCH default | re-call `format="json"` (chapter 2) |
| MCP tools absent | uvx missing / server not registered | install uv; check `mcpServers.jcodemunch` |
| Odd version on spawn | uvx cache | uv resolves latest per cache policy; pin via `uv tool install` if needed |

Next: back to the syllabus — [../SKILL.md](../SKILL.md).
