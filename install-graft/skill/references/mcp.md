# Chapter 2 — MCP Tools

Self-contained reference. Read when the graft MCP server is configured (stdio: `graft mcp`, registered as `mcpServers.graft`).

## The six tools → CLI equivalents

| MCP tool | Takes | CLI equivalent | Wins when |
|----------|-------|----------------|-----------|
| `graft_find_code` | a question | `graft ask --source` | ranked nodes with source inlined — usually the full answer, no follow-up read |
| `graft_file_api` | a file path | `graft skeleton <file>` | every signature, no bodies — API surface at a tenth of the tokens |
| `graft_trace_calls` | a symbol (+ `direction`, levels) | `graft callers <sym> --direction/--depth` | who depends on it / what it depends on, N levels for blast radius |
| `graft_find_all` | a regex | `graft grep <pattern>` | every hit, grouped by enclosing symbol, ranked by coupling |
| `graft_repo_map` | nothing | `graft map` | first look: directory clusters, hubs, hotspots |
| `graft_check_freshness` | nothing | freshness check | whether the local graph has drifted from the code |

## Why prefer MCP when configured

- Typed arguments — no shell quoting, no flag guessing; renders as proper tool
  calls in the host UI.
- Results come back structured (nodes, spans, edges) — no parsing terminal text.
- Same local graph underneath: no key, no network, no latency difference.

## When the CLI still wins

- Plain terminal, scripts, pipes, `--format`-style exports.
- MCP server not registered in this client (throwaway shells, CI).
- Debugging whether the server even spawns (`graft mcp` manually).

## Precondition still applies

MCP tools read the **same `graft/` graph** — the check in the syllabus holds:
no graph → tools report absence honestly; offer the user `graft build`/`graft
init`, never run them yourself.

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Tools absent | server not configured | register `{"command":"graft","args":["mcp"]}` (installer does this) |
| Empty/absent graph reports | no `graft/` in this repo | user runs `graft build` (or `graft init` fresh) |
| Stale answers | graph older than code | report freshness drift; user rebuilds |
| Spawns but no tools | wrong binary on PATH (not graft) | check `graft --version` |

Next: Chapter 3 — [concepts.md](concepts.md).
