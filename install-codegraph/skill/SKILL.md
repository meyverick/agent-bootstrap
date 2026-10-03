---
name: codegraph
description: Use codegraph for semantic code intelligence — explore an area with relevant symbols and call paths in one shot, build task context, read a symbol with its caller/callee trail, search symbols, compute blast radius and affected tests, trace callers/callees, and inspect project structure in an indexed repo. Activate for "how does X work", "what calls X", "what breaks if I change X", tracing, refactoring scope, or reading one function without opening files — even when phrased as plain code-exploration questions.
license: MIT
compatibility: Requires the codegraph CLI (npm install -g @colbymchenry/codegraph) and its MCP server (`codegraph serve --mcp`); a per-repo `.codegraph/` index must exist for queries.
metadata:
  source: https://github.com/colbymchenry/codegraph (README + docs, v1.6.2)
---

# codegraph — Semantic Code Intelligence

Course outline for mastering codegraph. Read the chapters you need; each is
self-contained reference material.

## What this skill unlocks

1. **Explore** — one-shot area exploration: relevant symbols' source + call paths.
2. **Context** — task-shaped context bundles: symbols, relationships, code blocks.
3. **Trace** — callers/callees, blast radius, affected tests from precomputed edges.
4. **Read** — one symbol's source with its call trail; file structure from the index.

## MCP-first, native fallback

When the codegraph MCP server is configured (`codegraph serve --mcp`) AND the
repo has a `.codegraph/` index, prefer the `codegraph_*` tools —
`codegraph_explore`, `codegraph_node`, `codegraph_search`, `codegraph_impact`,
`codegraph_callers`, `codegraph_callees`, `codegraph_files`,
`codegraph_status` — over Read/Grep. CLI mirrors exist for plain terminals and
scripts (chapter 1). Native tools remain correct when the server is absent or
the repo is unindexed.

## Index precondition (USER action)

Queries answer from `.codegraph/` **inside the repo**. Check `codegraph_status`
(or `.codegraph/` presence) before reaching for the tools.

- **Indexed** → query away.
- **Unindexed** → tell the user and offer `codegraph init` — **a USER action,
  never run it yourself** (it writes `.codegraph/` into the repo). Meanwhile
  fall back to grep/source reads.

Never run `codegraph install`, `codegraph uninstall`, or `codegraph telemetry`
from agent flows either — agent-config writers and user policy, all user-run.

## Curriculum

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | Tool map | [references/tools.md](references/tools.md) | 8 MCP tools + CLI mirrors (`explore`/`context`/`node`/`impact`/...) with when-to-use each. |
| 2 | Index lifecycle | [references/index.md](references/index.md) | Per-repo init as user action, watch-daemon sync, staleness banners, connect-time catch-up, rebuilds. |
| 3 | Concepts & setup | [references/concepts.md](references/concepts.md) | Bundled runtime, install channels + forbidden list, telemetry opt-out, when NOT to use. |

## Gotchas (read before first use)

- **Honor `⚠️` staleness banners.** A tool response may prepend a banner naming
  a file pending sync and telling you to `Read` it directly — do exactly that;
  the index answer is briefly behind and the banner is the escape hatch.
- **Connect-time catch-up is not free latency** — the server reconciles the
  working tree on first tool call after reconnect; a slow first call is expected.
- **One tool per question.** `explore` for areas, `node` for one symbol,
  `impact` for blast radius — don't chain hoping for more.
- **Prefer tools when indexed**; native fallback only when unindexed/absent.
- **Coexistence:** upstream `codegraph install` writes its own marker-fenced
  section into agent instruction files; our balise block is separate. Both are
  marker-fenced; neither overwrites the other. (`install` itself is user-run.)
- **Telemetry:** anonymous, opt-out via `CODEGRAPH_TELEMETRY=0`,
  `DO_NOT_TRACK=1`, or user-run `codegraph telemetry off` — never toggle it
  yourself.

## Conventions in these chapters

- Tool/flag names exact; `<angle>` placeholders are user values.
- Examples repo-agnostic; no host paths; no credentials.
