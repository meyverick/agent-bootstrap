<!-- graft:start -->
## graft skill — local code-graph context

Skill installed at `~/.agents/skills/graft/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- understanding how something works, finding where code lives, tracing what calls a symbol, scoping an edit, or blast-radius questions ("what breaks if I change this")
- first contact with an unfamiliar repo/area (orientation), or cheap file-API views before editing

**Precondition:** graft tools apply only where a `graft/` graph exists in the current repo. Check for `graft/` before reaching for them. If absent: offer to the user `graft build` (existing repo) or `graft init` (fresh wiring) — those are USER actions, never run them automatically — and meanwhile fall back to grep/source reads.

**Activation:**
- pi: `/skill:graft <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/graft/SKILL.md` and follow its outline into `references/`

**Preference:** when the graft MCP server is configured, prefer `graft_*` tools (`graft_find_code`, `graft_file_api`, `graft_trace_calls`, `graft_find_all`, `graft_repo_map`, `graft_check_freshness`) over shelling out; CLI (`graft ask|grep|skeleton|callers|map`) is the fallback for plain terminals and scripts.
<!-- graft:end -->
