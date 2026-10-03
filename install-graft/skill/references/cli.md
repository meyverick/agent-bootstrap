# Chapter 1 — CLI Reference (the six commands)

Self-contained reference. Read when driving graft from a terminal or script. All commands are local, need no API key, and return in under a second.

## 1 · `graft ask "<question>" --source` — locate + understand (the default)

Ranked retrieval over the graph, routed automatically between prose nodes and the wiring graph; returns top hits with exact `file:line`.

- `--source` inlines the ≤8-line **crux** of each definition — the result IS the code, no follow-up read. Add `--full` only when the crux is too small to act on.
- `--in <path>` narrows to a subtree before ranking; `-n N` caps results (default 8).
- Use for conceptual/locational questions: "how does auth work", "where is rate-limiting handled".
- One `ask` usually answers. Multi-part question → one ask per sub-aspect, never the same question reworded. Few/weak hits → switch tool, don't re-ask.

## 2 · `graft grep "<pattern>"` — exhaustive find

Regex (or `--fixed` for literal) over every indexed file, hits **grouped by enclosing symbol**, ranked by coupling; also reports files it couldn't read.

- Use when you need EVERY occurrence: all call sites, all uses of a constant.
- Search a **short symbol name or literal**, not a full guessed signature —
  over-specific patterns return nothing even when indexed. Miss → **loosen**
  (drop receiver/signature, keep bare name) and retry; do NOT switch to raw
  `grep -rn` (slower, unranked).
- `-i` case-insensitive; `--in <path>` scopes to a subtree.
- Raw `grep -rn` only for files graft doesn't index (docs, configs, brand-new files).

## 3 · `graft skeleton <file>` — a file's API at a glance

Signatures-only view (every function/method/type with its span) in ~200 tokens,
~10x cheaper than reading the file.

- Use for "what's in this file / what can I call here" before editing.
- One skeleton is the whole answer for a file; don't re-skeleton the same file
  or skeleton every file `map` already named.

## 4 · `graft callers <symbol>` — the exact edges

Precomputed call/reference edges, not text search. Symbol: bare (`Foo`),
qualified (`Class.method`), or package-qualified (`pkg.Fn`).

- default `--direction in`: **who calls/references** it — run before rename,
  delete, or signature change.
- `--direction out`: what the symbol itself calls/depends on.
- `--depth N`: transitive walk — **`--depth 2` is the usual "what breaks if I
  touch this"**; `--depth all` = entire connected closure, reach before any
  multi-file refactor (surfaces platform variants and split-out siblings a
  single-file edit would miss).

## 5 · `graft map` — orientation for an unfamiliar repo or area

Token-budgeted tour: directory clusters, per-directory hubs, global hotspots.
Use on first contact with a repo or unfamiliar subtree; don't re-map after
`ask`/`callers` already named the relevant files.

## 6 · freshness — is the graph current?

The graph is a local cache; drift happens between build and edit. Check when
answers look stale or after big edits (`graft_check_freshness` is the MCP form).
**Rebuild is the user's action** — report the drift, don't run build yourself.

## Command → question map

| You need | Command |
|----------|---------|
| How does X work / where is it | `graft ask "..." --source` |
| Every occurrence of a symbol | `graft grep "<short-name>"` |
| What's in this file | `graft skeleton <file>` |
| Who calls this / blast radius | `graft callers <sym> --depth 2` |
| First look at a repo/area | `graft map` |
| Graph freshness | freshness check |

Next: Chapter 2 — [mcp.md](mcp.md).
