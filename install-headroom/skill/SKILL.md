---
name: headroom
description: Use headroom to compress bulky context before it reaches the model — large tool outputs, log dumps, diffs, JSON blobs, and RAG chunks compressed locally with per-content-type routers, plus retrieval of the exact original via CCR and token-savings stats. Activate when about to paste bulk content into context, when an answer needs the exact bytes back after compression, or when asked how much compression is saving — even when phrased as "trim this output" or "shrink the log".
license: Apache-2.0
compatibility: Requires the headroom CLI (uv tool install "headroom-ai[all]") and its MCP server (`headroom mcp serve`).
metadata:
  source: https://github.com/headroomlabs-ai/headroom (README + llms.txt, v0.35.0)
---

# headroom — Context Compression Layer

Course outline for mastering headroom. Read the chapters you need; each is
self-contained reference material.

## What this skill unlocks

1. **Compress** — bulk tool output/log/diff/JSON into a fraction of the tokens
   before it enters the model's context (local, per-content-type routers).
2. **Retrieve** — CCR (Compress-Cache-Retrieve): fetch the byte-exact original
   whenever precision beats compression.
3. **Account** — measured token savings (`headroom_stats`).

## MCP-first

When the headroom MCP server is configured, prefer the three tools over pasting
raw bulk:

| Tool | Use |
|------|-----|
| `headroom_compress` | bulk content about to enter context |
| `headroom_retrieve` | exact original bytes needed later |
| `headroom_stats` | "how much did this save" questions |

CLI exists for proxy/wrap/library workflows — those are USER operations
(chapter 1). Full tool semantics → [references/tools.md](references/tools.md).

## Curriculum

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | Tool map & user-op boundaries | [references/tools.md](references/tools.md) | 3 MCP tools in depth; CLI surface with forbidden-from-agent-flows list. |
| 2 | CCR & compression model | [references/ccr.md](references/ccr.md) | What compression preserves, what it drops, retrieve flow, output-token reduction. |
| 3 | Concepts & setup | [references/concepts.md](references/concepts.md) | Channels, update semantics, local-first data path, telemetry, when NOT to use. |

## Gotchas (read before first use)

- **Compress the container, not the claim.** Compressed summaries are lossy by
  design — when the task needs exact bytes (a hash, a quoted error line, a
  config value), **retrieve the original** (`headroom_retrieve`) before
  asserting it. The FATAL line survives compression; your patience might not.
- **Never feed secrets hoping compression hides them.** Compression runs
  locally, but the compressed text still reaches the model — treat it as if
  the original were sent, because semantically it was.
- **When NOT to compress:** small content (overhead dominates), already-
  compressed blobs (base64/gzip), or one-shot trivia you will not re-read.
- **Forbidden from agent flows** (each mutates state — user-only):
  - `headroom learn` — writes instruction files (CLAUDE.md/AGENTS.md/GEMINI.md)
  - `headroom wrap` / `unwrap` — rewires agent launch configs
  - `headroom init` — installs durable integrations
  - `headroom mcp install` — registers MCP in client configs
  - `headroom install` / `deploy` — persistent deployments
  - `headroom proxy` — launches a daemon
- **Telemetry is opt-IN** (`HEADROOM_TELEMETRY=on`, default off) — enabling it
  is user policy; never set it yourself.

## Conventions in these chapters

- Tool/flag names exact; `<angle>` placeholders are user values.
- Examples repo-agnostic; no host paths; no credentials.
