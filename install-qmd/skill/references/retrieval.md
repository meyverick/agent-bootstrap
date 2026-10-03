# Chapter 2 — Retrieval & Slicing

Self-contained reference. Read after a search returns leads, or when asked to open/compare sources.

## Identifiers

- **docid** — `#abc123` (short, stable, shown in every result).
- **virtual path** — `qmd://collection/path/file.md`.
- **on-disk path** — only via `--full-path` (for handing to Read/Edit/editor).

## Fetch

```bash
qmd get "#abc123"                                  # one document, line-numbered
qmd get qmd://concepts/note.md                     # by virtual path
qmd multi-get "#abc123,#def432" --format md        # batch by docids
qmd multi-get 'concepts/{a.md,b.md}' --format md   # brace glob
qmd multi-get 'sources/podcast-2025-*.md' -l 80    # wildcard, 80 lines/doc
```

Use `multi-get` when comparing several hits or gathering cross-page context.

## Line windows — the `:from:count` suffix

`get` slices internally. **Never pipe through `sed`/`head`/`tail`/`awk`** — piping
defeats docid resolution, virtual-path lookup, line numbering, and the header.

```bash
qmd get "#abc123:120:40"                   # 40 lines starting at 120
qmd get qmd://concepts/note.md:200:60       # lines 200-259
qmd get "#abc123:120"                       # from 120 to EOF
qmd get "#abc123" --from 120 -l 40          # flag equivalents (flags override suffix)
qmd get "#abc123" --no-line-numbers         # raw content (e.g. copy a code block)
```

Search results carry a `:line` anchor per hit → feed it straight to
`qmd get path:line:<n>` to read around the match.

Wrong: `qmd get "#abc123" | sed -n '120,160p'`
Right: `qmd get "#abc123:120:40"`

## Output format

```
qmd://concepts/note.md  #abc123
---

1: # Metrics as instruments
2:
3: Treat dashboards like cockpit instruments...
```

- Line numbers and docid header are on by default — cite both (docid + line range).
- `--full-path` replaces the header with the on-disk path (fallback to canonical
  header if the file vanished). Same flag works on `search`/`query`: paths become
  `./`-relative inside `$PWD`, absolute realpath otherwise, per-result docid dropped.

## Citation pattern for answers

```text
Retrieved:
- #abc123 concepts/customer-proximity.md
- #def432 sources/merchant-call.md
```

Compact note only — never paste whole files unless asked. When stating facts,
cite docid + exact lines.

## When the file must be edited

`--full-path` output goes straight to Read/Edit: `qmd get "#abc123" --full-path`.

Next: Chapter 3 — [collections.md](collections.md).
