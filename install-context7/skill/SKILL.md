---
name: context7
description: Fetch up-to-date, version-specific library documentation and code examples with context7 before writing code against any library, framework, SDK, CLI, or cloud service. Use when asked about API syntax, configuration options, setup steps, migrations, or code examples — React, Next.js, Vue, Prisma, Supabase, Tailwind, Django, Spring, or any library — and when verifying signatures or options whose training-data knowledge may be stale. Prefer this over web search for library docs, even when you think you already know the answer.
license: MIT
compatibility: Remote MCP server (resolve-library-id / query-docs) or Node >=18 with npx for the `npx ctx7@latest` CLI fallback.
metadata:
  source: "https://github.com/upstash/context7 (skills: context7-mcp, context7-cli, find-docs)"
---

# context7 — Up-to-Date Library Documentation

Course outline for mastering context7. Read the chapters you need; each is
self-contained reference material.

## What this skill unlocks

1. **Resolve** — map any library/framework name to a Context7 library ID.
2. **Fetch** — pull current, version-specific docs and code examples into context.
3. **Fallback** — same lookups via `npx ctx7@latest` when no MCP server is configured.

## MCP-first

When the context7 MCP server is configured, use its two tools in order:

```
resolve-library-id(libraryName, query)  ->  libraryId
query-docs(libraryId, query)            ->  current docs for ONE concept
```

CLI fallback (no MCP): `npx ctx7@latest library ...` / `npx ctx7@latest docs ...`
— fetched on demand, no global install. Full flows →
[references/mcp.md](references/mcp.md), [references/cli.md](references/cli.md).

## When to reach for context7

- Setup/configuration questions ("How do I configure Next.js middleware?")
- Code involving libraries ("Write a Prisma query for ...")
- API references ("What are the Supabase auth methods?")
- Version migrations and "does this API still exist" checks
- Debugging or explaining library-specific behavior
- Mentions of specific frameworks (React, Vue, Svelte, Express, Tailwind, Django, Spring, ...)

**Even when you think you know the answer** — training data misses recent API
changes. Verify signatures, options, and config keys against current docs.
Prefer this over web search for library documentation.

## Curriculum

| # | Chapter | File | One-line summary |
|---|---------|------|------------------|
| 1 | MCP flow & tool reference | [references/mcp.md](references/mcp.md) | Two-tool sequence, ID selection rules, query scoping, benchmark scores. |
| 2 | CLI fallback | [references/cli.md](references/cli.md) | `npx ctx7@latest library\|docs`, output handling, when CLI beats MCP. |
| 3 | Concepts & setup | [references/concepts.md](references/concepts.md) | ID syntax `/vendor/project`, version pinning, API key & rate limits, when NOT to use. |

## Gotchas (read before first use)

- **Two-step, always.** Never call `query-docs` with a guessed ID — resolve first.
  If you already hold the exact ID (from prior turn), skip resolution.
- **Scope each query to one concept.** `query-docs` retrieves for a single task;
  bundling five questions returns mush. Multiple concepts = multiple calls.
- **Version-specific IDs win** when the user named a version ("React 19").
- **Prefer over web search** for API details; do NOT use for internal/private
  project knowledge, non-code topics, or anything indexed locally already.
- **Keys are optional**: unauthenticated works at reduced rate limits. Key lives
  in the MCP config `Authorization` header or `CONTEXT7_API_KEY` — names only
  here, never values, never in rules/skills.
- **Community-contributed content**: verify suspicious/unusual snippets against
  the library's own source or official docs when stakes are high.

## Conventions in these chapters

- Commands copy-pasteable; `<angle>` placeholders are user values.
- Tool names exact (`resolve-library-id`, `query-docs`); arg names exact.
- Examples repo-agnostic; no host paths; no credential values.
