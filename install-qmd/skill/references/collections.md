# Chapter 3 — Collections & Metadata

Self-contained reference. Read when scoping searches, inspecting what is indexed, or filtering by metadata.

## Collections

```bash
qmd collection add ~/notes --name notes     # index a folder
qmd collection list                          # what exists
qmd collection show notes                    # per-collection detail
qmd collection remove notes
qmd collection rename old new
qmd ls                                       # files in index (optionally per collection: qmd ls notes/)
```

Scoping a query: `-c` is repeatable; omit it to search everything.

```bash
qmd search "headcount autonomous agents" -c concepts -n 10
qmd query "merchant support product reality" -c concepts -c sources -n 10
```

Naming intuition: `concepts` = synthesized wiki pages, `sources` = transcripts/raw,
docs collections = code/project documentation.

## Metadata: `qmd.metadata` frontmatter

Documents may declare typed metadata (string/number/boolean/flat array).
Filters apply to **documents**, discovery applies to **metadata entries**:

- `--filter` narrows documents (counts are documents).
- `--match` narrows the metadata itself (counts are entries).
- Both take the same predicate AST.

## Filter AST

```bash
qmd search "authentication" --filter '{"field":"status","operator":"eq","value":"published"}'
qmd query "dependency injection" --filter '{"operator":"and","operands":[{"field":"topics","operator":"all","value":["typescript"]},{"field":"status","operator":"nin","value":["draft","archived"]}]}'
```

Node shapes:

- Groups: `and`/`or` take `operands` (array); `not` takes one `operand`.
- Conditions: `field` + `value` + operator:
  - comparison: `eq` `ne` `gt` `gte` `lt` `lte`
  - membership: `in` `nin` `all`
  - text: `contains` `prefix` `suffix`
  - type: `type` (`string`|`number`|`boolean`), `presence`: `exists`
- Optional `"caseInsensitive": true` on string conditions (ASCII fold).

Semantics: matching is typed and exact. Missing keys do **not** match `ne`/`nin` —
add `exists: false` inside an `or` to include them. Every result satisfies the filter.

## Discover before filtering — never guess keys

```bash
qmd collection metadata notes                            # top keys/values
qmd collection metadata notes --match '{"field":"key","operator":"eq","value":"topics"}'
qmd collection metadata notes --match '{"field":"value","operator":"eq","value":"docs-team"}'
```

Read the header — it is the decision:

```
topics  string[]  388 of 480 documents  1,204 distinct
```

- Coverage: a key on 388/480 docs leaves 92 unreachable by value conditions; only
  `exists: false` selects those.
- `"42"` (quoted) = string, `42` = number, `""` = empty — types disagree per-document
  report their own counts; filter by the type you mean.
- `N more values` / footers = windowed → page with `--value-offset`/`--key-offset`
  or raise `--value-limit`.
- Numbers print `min`/`median`/`max` → write `gt`/`lt` thresholds in one call.
- Every displayed value is matchable with `eq` in the same collection scope.

`--filter` after `--match` shows exactly what the filter would leave.

## Related health commands

```bash
qmd status        # index + collection overview (also MCP daemon state)
qmd update        # re-index collections (--pull to git pull first)
qmd embed         # generate/refresh vectors (see Chapter 5 for cost flags)
```

Next: Chapter 4 — [mcp.md](mcp.md).
