# Chapter 1 — Tool Map (MCP + CLI)

Self-contained reference. Read when choosing a codegraph query. MCP tools mirror CLI commands — prefer the `codegraph_*` tools when the server is configured; CLI wins for terminals, scripts, pipes.

## One-shot exploration & context

| Need | MCP tool | CLI |
|------|----------|-----|
| Area exploration: relevant symbols' source + call paths in one shot | `codegraph_explore` | `codegraph explore <query...>` |
| Task context bundle: symbols + relationships + code blocks | — (compose via other tools) | `codegraph context <task...>` |
| One symbol's source + caller/callee trail, or a file with line numbers + dependents | `codegraph_node` | `codegraph node <name>` |

`explore` is the default first call for "how does X work / show me where Y lives".
`context` is the pre-task gather: feed the task description, get a buildable bundle.

## Search & structure

| Need | MCP tool | CLI |
|------|----------|-----|
| Symbol search | `codegraph_search` | `codegraph query <search>` |
| Project file structure from the index | `codegraph_files` | `codegraph files` |
| Index status/statistics | `codegraph_status` | `codegraph status` |

`status` doubles as the **precondition probe**: is this repo indexed, how fresh?

## Tracing & impact (precomputed edges)

| Need | MCP tool | CLI |
|------|----------|-----|
| Who calls this symbol | `codegraph_callers` | `codegraph callers <symbol>` |
| What this symbol calls | `codegraph_callees` | `codegraph callees <symbol>` |
| Blast radius: what's affected by changing it | `codegraph_impact` | `codegraph impact <symbol>` |
| Tests affected by changed source files | — | `codegraph affected [files...]` |

Run `impact` before refactor/delete; `affected` after editing to scope test runs.

## Maintenance CLI (mostly user-driven)

| Command | Purpose | Who runs it |
|---------|---------|-------------|
| `codegraph init [path]` | Build `.codegraph/` in a repo | **USER** — offer, never auto-run (writes into the repo) |
| `codegraph sync [path]` | Sync changes since last index | USER (watch daemon usually covers this) |
| `codegraph index [path]` | Full rebuild from scratch | USER |
| `codegraph status [path]` | Index health | anyone (probe) |

`install`/`uninstall`/`uninit`/`telemetry` are user-only — see concepts chapter.

## Selection heuristics

- Unknown area → `explore` first; one known symbol → `node`.
- Pre-task gather → `context <task>`.
- Rename/delete decision → `callers` + `impact`.
- "Every occurrence" text hunt → native grep is still fine for un-indexed text;
  symbol-named occurrences → `search`.

Next: Chapter 2 — [index.md](index.md).
