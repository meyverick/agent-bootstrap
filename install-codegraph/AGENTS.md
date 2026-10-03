<!-- codegraph:start -->
## codegraph skill — semantic code intelligence

Skill installed at `~/.agents/skills/codegraph/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves code exploration:**
- understanding an area (`explore`), building task context (`context`), reading one symbol with its call trail (`node`)
- what-calls/what-breaks questions: `callers`/`callees`/`impact`, affected tests
- symbol search, project structure, index status in an indexed repo

**Preference:** when the codegraph MCP server is configured AND the repo is indexed, use its `codegraph_*` tools BEFORE falling back to Read/Grep. Honor `⚠️` staleness banners in tool responses — when a file is pending sync, read it directly as the banner directs. Native tools remain the fallback when the server is absent or the repo is unindexed.

**Activation:**
- pi: `/skill:codegraph <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/codegraph/SKILL.md` and follow its outline into `references/`

**Index note:** per-repo `.codegraph/` is built by `codegraph init` — a USER action you may offer but never run automatically.
<!-- codegraph:end -->
