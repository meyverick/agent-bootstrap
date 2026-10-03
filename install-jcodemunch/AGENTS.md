<!-- jcodemunch:start -->
## jcodemunch skill — token-efficient code retrieval

Skill installed at `~/.agents/skills/jcodemunch/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves code exploration:**
- finding a function/symbol by name or intent, reading one symbol's exact source
- understanding structure (file/repo outlines, trees), full-text search in code
- who imports/references/uses what, blast radius of a change, dead code, orphaned files

**Preference (upstream's most-missed step):** when the jcodemunch MCP server is configured AND the repo is indexed, use its tools BEFORE falling back to Read/Grep/Glob — `resolve_repo` first; if unindexed, `index_folder` (global cache only, zero repo writes) then proceed. Native tools remain the fallback when the server is absent or the repo cannot be indexed.

**Activation:**
- pi: `/skill:jcodemunch <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/jcodemunch/SKILL.md` and follow its outline into `references/`

**Gotcha pointer:** tool responses may arrive MUNCH-encoded (`format=auto` default) — pass `format="json"` when the payload cannot be decoded.
<!-- jcodemunch:end -->
