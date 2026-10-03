# Chapter 1 — Tool Map & User-Op Boundaries

Self-contained reference. Read when choosing how to invoke headroom and what must stay user-only.

## The three MCP tools (agent surface)

| Tool | Takes (conceptually) | Returns | Use when |
|------|----------------------|---------|----------|
| `headroom_compress` | the bulk text (tool output, log, diff, JSON, RAG chunk) | compressed text (+ savings metadata) | content is about to enter the model's context |
| `headroom_retrieve` | a compressed handle/reference | the byte-exact original | exact values needed after compression (hashes, quoted lines, config keys) |
| `headroom_stats` | session/store scope | token/cost savings numbers | user asks "how much is this saving" |

Workflow: **compress on the way in → keep the handle → retrieve only what the
task must quote exactly → report savings when asked.**

Do not compress: short content (overhead dominates), already-compressed blobs
(base64/gzip/zip), secrets (see concepts chapter).

## CLI surface — USER operations (not for agent flows)

Everything beyond the MCP tools mutates state or runs daemons. **Never invoke
from agent flows**; offer them to the user instead:

| Command | Why forbidden for agents |
|---------|--------------------------|
| `headroom learn` | writes instruction files (CLAUDE.local.md / CLAUDE.md / AGENTS.md / GEMINI.md) — instruction writer |
| `headroom wrap <tool>` / `unwrap` | rewires how the agent binary launches (durable config) |
| `headroom init` | installs durable integrations |
| `headroom mcp install` | registers the MCP server in client configs (`~/.claude.json`) |
| `headroom install` | manages persistent deployments |
| `headroom deploy` | deploys + configures a local proxy deployment |
| `headroom proxy` | launches a long-running daemon |

Read-only-ish CLI (`doctor`, `savings`, `inspect`, `dashboard`) is fine for a
user in a terminal; agents still prefer MCP tools for the three core jobs.

## Library mode (context for reading docs)

`compress(messages)` exists as Python (`headroom-ai` PyPI) and TypeScript
(`headroom-ai` npm, library-only — **no CLI from npm**) inline wrappers; SDK
docs are for app authors, not agent tasks.

Next: Chapter 2 — [ccr.md](ccr.md).
