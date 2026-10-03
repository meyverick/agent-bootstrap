# Chapter 2 — MCP Server & One-Call Lookup

Self-contained reference. Read when the sem MCP server is configured (tools `mcp__sem__*`) or when wiring it.

## Starting the server

```bash
sem mcp          # stdio transport — launched by the agent/client as a subprocess
```

Config shape (any client with an `mcpServers` root key):

```json
{ "mcpServers": { "sem": { "command": "sem", "args": ["mcp"] } } }
```

`sem mcp` ships in the same binary — no separate install. If `sem` is not on the
client's PATH, use the absolute path to the binary.

## The 8 tools

| Tool | Mirrors | Answers |
|------|---------|---------|
| `sem_diff` | `sem diff` | what changed (entity-level) |
| `sem_impact` | `sem impact` | blast radius of a change |
| `sem_context` | `sem context` | entity body + callers/callees |
| `sem_entities` | `sem entities`/`find` | find by intent (`query`) or text (`text`) |
| `sem_blame` | `sem blame` | who last modified an entity |
| `sem_log` | `sem log` | evolution of an entity; repo hotspots |
| `sem_find` | `sem find` | definitions by name |
| `sem_grep` | `sem grep` | file text search |

(If sem cloud review is enabled, four more: `join_review`, `wait_for_branch`,
`reply_to_branch`, `list_open_branches` — cloud is opt-in, see health chapter.)

**Always call these instead of running `sem` in a shell** when present: proper
tool calls in the UI, compact entity trees, `elapsed_ms` timing. If tools are
deferred (ToolSearch-style), load them first — do not degrade to Bash merely
because the shell is open.

## The one-call lookup pattern

When you know (or can guess) the entity name:

```
sem_context(entity_name = "validateToken")
```

- Resolves across the whole repo → returns body + callers + callees in ONE
  round-trip (grep needs two: search, then read).
- Ambiguous name → compact candidate list; pass `file_path` only then.
- Do NOT call `sem_entities` first when searching by name — only for searching
  by intent/free text.

Bounding context: use hops (CLI `--hops N`; MCP equivalent) of 1-2 for the
immediate neighborhood of a large entity.

## CLI vs MCP — when each wins

- MCP configured → default for `diff`, `impact`, `context`, `blame`, `log`,
  entity lookup. Typed arguments, no shell quoting, structured results.
- CLI → real terminals, scripts, pipes, `--format` exports, and commands the
  MCP server does not expose (`sem graph`, `sem completions`, exotic flags).
- No MCP and no sem → see health chapter for install; fall back to `grep` +
  file reads for context.

## Failure modes

- Client cannot spawn `sem` → PATH issue: use absolute binary path.
- Tools absent → server not configured or not launched; check client MCP config
  (`mcpServers.sem`, args `["mcp"]`).
- GNU Parallel collision affects MCP too (client spawns whatever `sem` resolves) → fix PATH first (health chapter).

Next: Chapter 3 — [workflow.md](workflow.md).
