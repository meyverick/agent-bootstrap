# Chapter 2 — MUNCH & Format Handling

Self-contained reference. Read when a tool response does not look like JSON.

## The default is compact, not JSON

`format="auto"` (the default) returns a **MUNCH-encoded string** whenever the
savings clear ~15%; `format="compact"` forces it; `format="json"` forces plain
JSON. A MUNCH payload starts with:

```
#MUNCH/1 tool=... enc=...
```

If you cannot parse the payload confidently: **re-issue the call with
`format="json"`** — the server skips encoding for that call. This is the
supported escape hatch, always.

## Reading a MUNCH payload (essentials)

Structure after the header, blank-line separated:

1. **Optional legend lines** `@N=prefix` — `@N` + remainder of the value.
2. **One scalar line** of `key=value` pairs (space separated; values with
   spaces/commas/equals are double-quoted, doubled-quote escaped):
   - `__tables` — `tag:key:col1|col2|...:t1|t2|...` per table
   - `__stypes` — `name:type` for non-string scalars
   - `_meta.<X>` / `parent.child` — flattened, re-nest as `_meta.X` / `parent.child`
   - `__json.<X>` — JSON blob encoded as a string, parse into `X`
3. **Table sections** — CSV rows; column 0 is a 1-char tag matching `__tables`;
   types `int|float|bool|str`; `T`/`F` booleans, empty = null.

If any of this is ambiguous for your case → `format="json"` next call. Do not
hallucinate fields you could not decode.

## Server-wide escape

For environments where no agent should ever see MUNCH, set on the MCP server
env: `JCODEMUNCH_DEFAULT_FORMAT=json`. That is a **user config** change (server
`env` in the MCP config) — not something agents edit.

## Why it exists

MUNCH is a compact wire encoding — median ~45% fewer bytes than the JSON form,
on top of the tool-level savings. Decoding is optional leverage; correctness
always wins over byte count, hence the escape hatch.

Next: Chapter 3 — [concepts.md](concepts.md).
