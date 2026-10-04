# OKF v0.2 — documentation rules (verbatim extract of AGENTS.md §7)

- README: promotional showcase for everyday users. [CRITICAL] Purge ALL technical details/terminal blocks → strict SoC.
- Wiki (`./<repo_name>/wiki/` or `./<project>/wiki/`): technical docs per module, tracked natively, synced remotely ONLY IF public+enabled.
- OKF v0.2: enforce for all docs, ADRs, memory bundles.
- Frontmatter & Provenance [CRITICAL]: YAML frontmatter (`type` REQUIRED). `generated: {by: <actor>, at: <ISO 8601>}` replaces `timestamp`. Record `sources` list → attribute claims via `[^source-id]` footnotes → replaces `# Citations`.

```yaml
type: Architecture Decision Record
title: <short name>
generated: { by: <producer>/<version> | human:<id>, at: 2026-08-15T00:00:00Z }
sources: [{ id: <source-id>, resource: <url|path> }]
verified: { by: human:<id>, at: 2026-08-15T00:00:00Z }
status: stable
stale_after: 2027-08-15
```

- Trust & lifecycle: `verified.by` → `human:<id>` human-reviewed tier. `status`: `draft|stable|deprecated`. `stale_after`: `YYYY-MM-DD`.
- Actor convention: `generated.by` / `verified[].by` → `<producer>/<version>` (agents) · `human:<id>` (people) · `process:<id>` (automation).
- Progressive disclosure & graph: `index.md` at directory roots → catalogs → minimize overhead. Absolute links (`[/backend/schema.md]`).
- Syntax conventions: `[✅ GOOD]` vs `[❌ BAD]` blocks. No verbose prose.
- Reference ingestion [CRITICAL]: `./references/` present → index via available knowledge-search tooling (if available) or inspect directly → READ-ONLY.
