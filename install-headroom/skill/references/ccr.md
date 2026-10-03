# Chapter 2 — CCR & Compression Model

Self-contained reference. Read when deciding what compression preserves and how to get originals back.

## Three-stage pipeline

```
input → content-type router → compressor → CCR store
                                    │
                                    ▼
                          compressed text (to the model)
```

1. **Router** picks a per-type compressor: JSON (SmartCrusher — statistical
   array/object compression, 70–90% on tool outputs), code (AST-aware via
   tree-sitter — preserves imports/signatures/types), logs, diffs, plain text.
2. **Compressor** produces the reduced representation actually sent.
3. **CCR store** caches the original locally — compression never deletes data.

## What survives, what doesn't

- **Survives by design:** the router preserves structure the type demands —
  code keeps signatures and imports; critical lines in logs (FATAL, errors)
  are exactly what the benchmarks verify surviving.
- **Lossy by design:** the compressed form is a *representation*, not the
  original. Treat any exact-value question (hash, byte-for-byte quote, precise
  numeric) as **retrieve-first**.
- **Reversible:** originals live in the local CCR cache; `headroom_retrieve`
  pulls them on demand. Reversal is why compressing is safe for workflows that
  might need the source later.

## The retrieve loop

```
1. headroom_compress(bulk)        -> compressed + handle
2. model works on compressed      -> tokens saved
3. task needs exact bytes?        -> headroom_retrieve(handle) -> original
4. quote/assert from the ORIGINAL, never from compressed text
```

Rule of thumb: **compressed for reasoning, retrieved for asserting.**

## Output token reduction (second axis)

Headroom also trims what the model *writes back* (output side), not only what
it receives — a separate feature from input compression; stats distinguish the
two when reporting savings.

## Cost reading

Every savings number is local accounting: tokens before vs after, per content
type. `headroom_stats` reports session + stored totals — quote them when the
user asks, without turning savings into a task goal.

Next: Chapter 3 — [concepts.md](concepts.md).
