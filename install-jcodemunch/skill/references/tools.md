# Chapter 1 — Workflow & Tool Map

Self-contained reference. Read when driving the jcodemunch MCP tools. Every tool takes `repo` (a resolved repository handle) unless noted.

## Resolve & index (once per repo)

| Tool | Takes | Purpose |
|------|-------|---------|
| `resolve_repo` | current directory/path | Is this repo indexed? Returns the `repo` handle or "not indexed". **First call, always.** |
| `index_folder` | local path | Index a local project into the global cache. Zero repo writes. |
| `index_repo` | GitHub URL (`owner/repo`, full https, `.git`, SSH, bare forms) | Fetch + index a remote repo |
| `index_file` | file path | Re-index one file after editing — keeps answers honest |
| `list_repos` | — | All indexed repos |

Workflow: `resolve_repo` → unindexed? `index_folder` (or `index_repo` remote) →
query → after edits, `index_file`.

## Search

| Tool | Takes | Purpose |
|------|-------|---------|
| `search_symbols` | `repo`, `query` | Find a function/class/method by name or intent — ranked symbol hits with `symbol_id`s |
| `search_text` | `repo`, `query` | Full-text search across indexed source — exhaustive, for strings/error messages/config keys |

Ranked symbol hunt → `search_symbols`. Exact literal everywhere → `search_text`.
(Top-5 style lookups; for "every occurrence" semantics prefer `search_text` or
`find_references`.)

## Fetch & outline (replace file reads)

| Tool | Takes | Purpose |
|------|-------|---------|
| `get_symbol_source` | `repo`, `symbol_id` | The symbol's exact implementation — the read that skips the other 95% of the file |
| `get_file_outline` | `repo`, `file_path` | Every symbol in a file with spans — "what's in here" |
| `get_file_content` | `repo`, `file_path` | Whole file when genuinely needed |
| `get_repo_outline` | `repo` | Repo-wide structure: files + top-level symbols |
| `get_file_tree` | `repo` | Directory tree without opening anything |

Decision: need one symbol → `get_symbol_source`. Need the shape of a file →
`get_file_outline`. Need the shape of the repo → `get_repo_outline` /
`get_file_tree`. Whole file → only when outline+symbol fetches proved insufficient.

## Connect (structural queries grep can't answer)

| Tool | Takes | Purpose |
|------|-------|---------|
| `find_importers` | `repo`, `file_path` | Who imports this file |
| `find_references` | `repo`, `identifier` | All references to a name |
| `get_blast_radius` | `repo`, symbol/target | What breaks if this changes |
| `get_class_hierarchy` | `repo`, class | Extends/implements tree |
| `find_dead_code` | `repo` | Unreferenced definitions |
| `get_dependency_graph` | `repo` | Broader dependency view |

Use before refactor/rename/delete: `find_references` + `get_blast_radius`
first; `find_dead_code` for cleanup passes.

## Ops & accounting

| Tool | Purpose |
|------|---------|
| `get_session_stats` | Tokens/cost saved this session + lifetime (`~/.code-index/session_stats.json`); per-tool latency breakdown |
| `analyze_perf` | Slowest tools, coldest caches |
| `list_repos` | What's indexed |

Report savings when the user asks ("how many tokens has this saved"); don't
chase the numbers.

Next: Chapter 2 — [munch.md](munch.md).
