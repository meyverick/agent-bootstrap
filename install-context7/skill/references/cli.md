# Chapter 2 — CLI Fallback

Self-contained reference. Read when no MCP server is configured, or when a plain terminal/script needs docs.

## Invocation

Canon: always latest, never a stale global.

```bash
npx ctx7@latest library <name> "<query>"     # resolve: find library IDs
npx ctx7@latest docs <libraryId> "<query>"   # fetch docs for one concept
```

Alternative (dev machines only): `npm install -g ctx7` then `ctx7 ...` — but the
global goes stale; `npx ctx7@latest` costs a cache lookup and is always current.
Requires Node >=18.

## The same two steps as MCP

```bash
# 1. resolve
npx ctx7@latest library "next.js" "JWT cookie auth middleware"

# 2. fetch (pick the best ID from step 1's output)
npx ctx7@latest docs "/vercel/next.js" "configure JWT cookie middleware and redirect unauthenticated requests"
```

Selection rules and query scoping are identical to MCP — see [mcp.md](mcp.md).
Only the transport differs.

## When CLI beats MCP

- MCP server not registered in this client (throwaway shells, CI, scripts).
- You need the output piped/grepped/saved rather than tool-structured.
- Debugging "does context7 even have this library" without touching agent config.

When MCP IS configured, prefer the tools — typed args, structured results, no
shell quoting.

## Docs-fetch patterns (from find-docs)

Use for anything a library/SDK/CLI/cloud-service author documents:

- API syntax and signature checks: `npx ctx7@latest docs "/<id>" "exact signature of <fn>"`
- Config options: `npx ctx7@latest docs "/<id>" "config keys for <feature>"`
- Migration steps: `npx ctx7@latest docs "/<id>" "migrate from vN to vN+1 <topic>"`
- "How do I" naming a tool: resolve first, then the specific how-to.

**Always verify against current docs rather than training data** — signatures
and options drift. Prefer this over web search when the answer is library docs;
web search remains for non-library topics.

## Output & exit behavior

- Results are text (library lists, doc excerpts) — parse for the ID on step 1,
  cite the ID when using step 2's output.
- Network required; offline → error from npx (no cached run assumed). Degrade:
  state clearly that docs could not be fetched and fall back to cautious
  training-data answers flagged as possibly stale.

Next: Chapter 3 — [concepts.md](concepts.md).
