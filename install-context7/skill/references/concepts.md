# Chapter 3 — Concepts & Setup

Self-contained reference. Read for library-ID syntax, versioning, key/rate-limit wiring, and scope boundaries.

## Library ID syntax

IDs are slash-prefixed paths: `/vendor/project`, often with a docs subtree.

```
/vercel/next.js          # vendor-owned project
/mongodb/docs            # docs subtree
/reactjs/react.dev       # community-maintained mirror
```

- The ID is the ONLY correct input to `query-docs` / `ctx7 docs` — always resolve first.
- Resolution returns candidates with scores; higher = better documentation quality.
- Subtree IDs (`/.../docs`) narrow the corpus — prefer them when the project has one.

## Version pinning

- User names a version ("Next.js 15", "Prisma 6") → prefer a version-specific ID when resolution offers one.
- No version named → latest; when the fetched docs clearly target a different major than the user's, say so and re-resolve with the version in the query.

## API key & rate limits (names only)

- Key is **optional**: without it the server works at reduced rate limits (upstream marks it not required).
- Carriers, in order of precedence in this setup:
  1. MCP config entry `headers.Authorization: Bearer <key>` (user-global MCP config — preserved verbatim by `install-context7`)
  2. `CONTEXT7_API_KEY` environment variable (used by stdio setups and CLI auth flows)
- Free keys: context7.com/dashboard. **Never** paste key values into rules,
  skills, chat, or repo-tracked files. The installer's template ships URL-only.

## Setup surface (what exists, what this install uses)

| Mechanism | Used here? | Notes |
|-----------|-----------|-------|
| Remote HTTP MCP (`https://mcp.context7.com/mcp` + header) | YES — both hosts | no local process; this installer manages it |
| stdio MCP (`npx -y @upstash/context7-mcp`) | no | alternative; would add local spawn + `CONTEXT7_API_KEY` arg |
| `npx ctx7 setup` OAuth wizard | no | interactive; installs agent-specific skills |
| `gemini-extension.json` / `@upstash/context7-pi` | no | host-specific extensions, out of scope |

## When NOT to use context7

- **Project-internal knowledge** (your code, notes, wikis) → local search tools.
- **Non-code topics** → web search.
- **Deterministic facts you can read directly** (a config file in front of you) → read it.
- **Security-critical snippets** → verify against the library's official source; community content can be wrong.

## Cost & failure discipline

- Tool calls are cheap and fast; batching multiple `query-docs` calls for
  distinct concepts is fine — sequential two-step per library, parallel across libraries.
- Rate limited → back off, do not hammer; retry later or drop to web search with a caveat.
- Any transport error → state it; never fabricate "the docs say" from memory.

Next: back to the syllabus — [../SKILL.md](../SKILL.md).
