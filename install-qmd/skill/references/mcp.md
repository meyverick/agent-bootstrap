# Chapter 4 — MCP Server

Self-contained reference. Read when wiring qmd into an MCP-capable agent or calling its MCP tools.

## Transports

```bash
qmd mcp                     # stdio (default; launched as subprocess per client)
qmd mcp --http              # long-lived HTTP on localhost:8181
qmd mcp --http --port 8080  # custom port
qmd mcp --http --host 0.0.0.0  # bind all interfaces (containers only)
qmd mcp --http --daemon     # background; PID at ~/.cache/qmd/mcp.pid
qmd mcp stop                # stop daemon
qmd status                  # "MCP: running (PID ...)" when active
```

HTTP exposes `POST /mcp` (streamable HTTP), `POST /query` (alias `/search`),
`POST /metadata`. Point any MCP client at `http://localhost:8181/mcp`.

stdio is preferred per-client; HTTP avoids repeated model loads across clients.

## Client config (stdio)

```json
{ "mcpServers": { "qmd": { "command": "qmd", "args": ["mcp"] } } }
```

Same shape for pi (`~/.pi/agent/mcp.json`), agy/gemini
(`~/.gemini/config/mcp_config.json`), Claude (`~/.claude.json` / `.mcp.json`),
Cursor (`.cursor/mcp.json`). Root key is universally `mcpServers`.

## The `query` tool (prefer over raw search tools)

```json
{
  "searches": [
    { "type": "lex", "query": "cockpit OKR Goodhart" },
    { "type": "vec", "query": "data informed not metric driven product judgment" },
    { "type": "hyde", "query": "A concept note explains that metrics are instruments, not drivers." }
  ],
  "intent": "Find the concept note about using metrics as instruments without becoming metric-driven.",
  "collections": ["concepts"],
  "limit": 10,
  "filter": { "field": "status", "operator": "eq", "value": "published" }
}
```

- Query types: `lex` (BM25), `vec` (semantic), `hyde` (hypothetical-answer vectors).
- `filter` = same AST as CLI `--filter`; invalid filter → HTTP 400.
- `metadata` tool = same options as `collection metadata`; `collections` is an
  array; read `totalKeys`/`remainingKeys`/`range` from the structured result;
  page with `keyOffset`/`valueOffset`.
- `status` tool lists each collection's most covered keys — check it before filtering.

## Choosing CLI vs MCP

- Agent has `mcp__qmd__*` tools → use them for structured `query`/`metadata` (one call, typed results).
- No MCP, or model-backed path fails → CLI fallback: `qmd search` (Chapter 1).
- MCP HTTP + firewalled host → bind explicitly; localhost-only is the safe default (no Origin check bypass needed for local clients).

## Security notes

- MCP HTTP validates `Origin` for browser requests; curl/editor clients without
  Origin are allowed by default design — do not expose `--host 0.0.0.0` on untrusted networks.
- No API keys involved; qmd is fully local.

Next: Chapter 5 — [maintenance.md](maintenance.md).
