# Chapter 1 — MCP Flow & Tool Reference

Self-contained reference. Read when the context7 MCP server is configured (tools `resolve-library-id`, `query-docs`).

## The two-tool sequence

Context7's MCP surface is exactly two tools. Always run them in order:

```
1. resolve-library-id
     libraryName : the library name from the user's request ("next.js", "prisma")
     query        : what you want to look up (improves relevance ranking)
   -> list of candidates, each with a Context7-compatible libraryId

2. query-docs
     libraryId    : the selected ID (e.g. "/vercel/next.js", "/mongodb/docs")
     query        : the question/task, scoped to a SINGLE concept
   -> current documentation excerpts + code examples
```

Skip step 1 only when you already hold the exact ID from earlier in the turn — never guess an ID.

## Selecting the best candidate

From the resolution results, pick by:

1. **Exact or closest name match** to what the user asked for.
2. **Higher benchmark scores** — indicate better documentation quality.
3. **Version specificity** — user said "React 19"? prefer the version-specific ID.
4. **Official source** — vendor-maintained IDs (`/vercel/next.js`) over community mirrors when both exist.

If nothing matches: broaden the library name (drop scopes: `@prisma/client` → `prisma`), then re-resolve. Report "not indexed" rather than fetching docs for a wrong library.

## Query craft for `query-docs`

- **One concept per call.** "auth middleware config + caching + retries" = three calls. Bundled queries return diluted mush.
- **Phrase it as the task**: "configure JWT cookie middleware and redirect unauthenticated requests" beats a keyword list.
- **Name the API surface**: exact method/config names anchor the retrieval.
- Need a whole API reference page? Ask for it as one concept ("full options object for X").

## Output handling

- Excerpts arrive with source paths/snippets — treat as documentation, not gospel for your exact version; the ID's version label tells you what you got.
- Cite the library ID when reporting: `(/vercel/next.js docs)`.
- Community-contributed content disclaimer applies: verify suspicious or security-critical snippets against official source.

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Empty resolution | name not indexed | broaden name; check spelling; fall back to web search with caveat |
| Docs miss the answer | query too broad or wrong ID | re-scope to one concept; try version-specific ID |
| MCP tools absent | server not configured | use CLI chapter ([cli.md](cli.md)) |
| 401/rate limit | missing/expired key | check `Authorization` header in MCP config (concepts.md) |

Next: Chapter 2 — [cli.md](cli.md).
