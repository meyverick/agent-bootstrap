<!-- benzi:start -->
## benzi skill — compiler-backed code intelligence

Skill installed at `~/.agents/skills/benzi/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- whole-repo code understanding: who calls this, what breaks if it changes, transitive call trees
- data-flow questions: where a wrong value came from (`backflow`), where a return lands (`forwardflow`), paths between two functions (`trace_path`)
- symbol profiles, definitions, inheritance hierarchies, case-insensitive symbol search across the repo
- gated edits: write checked against the real parser, broken parse auto-reverted, blast radius around the change
- settling ambiguous call sites by running the code (runtime tracer → `observed` state)

**Activation:**
- pi: `/skill:benzi <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/benzi/SKILL.md` and follow its outline into `references/`

**Preference:** when the benzi MCP server is configured, prefer `mcp__benzi__*` index tools (`profile`, `get_callers`, `backflow`, `trace_path`, `search_symbols`, …) for whole-repo questions before falling back to file reads.

**Setup note:** one-time user action — run `benzi-login` (interactive email code) before MCP use; config lives in `~/.benzi/config.json`. BYOK: model key stored there, never in project files. Installer never runs it.
<!-- benzi:end -->
