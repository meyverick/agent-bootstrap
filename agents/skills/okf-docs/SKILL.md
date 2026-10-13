---
name: okf-docs
description: Use this skill when writing or reviewing any documentation, ADR, wiki page, memory bundle, or README. Enforces OKF v0.2 — required frontmatter, provenance, lifecycle, actor conventions, README promotion-only rule, and READ-ONLY reference ingestion. Do NOT use for code changes or non-document artifacts.
---

# okf-docs — OKF v0.2 documentation rules

Syllabus. The studio's documentation contract, extracted verbatim from the rule book.

## Activation

- Writing or editing docs, ADRs, wikis, memory bundles, READMEs → load first
- Reviewing documentation for compliance → load first
- Pure code tasks without document artifacts → do not load

## Route

1. **Full doctrine** → [references/okf.md](references/okf.md) — the verbatim AGENTS.md §7: README promotion-only (purge technical details/terminal blocks), wiki location + sync rule, required frontmatter (`type`) + `generated: {by, at}` provenance, `sources`/footnotes, lifecycle (`status`, `stale_after`), actor convention (`<producer>/<version>` · `human:<id>` · `process:<id>`), progressive disclosure + absolute links, `[✅ GOOD]`/`[❌ BAD]` blocks, and reference-ingestion READ-ONLY rule.

## Hard rules

- Frontmatter `type` is REQUIRED on every document; `timestamp` is replaced by `generated`.
- README = promotional showcase for everyday users — zero technical blocks.
- Never ingest-write into `./references/` — index or inspect, never modify.
