<!-- sem:start -->
## sem skill — entity-level code intelligence for Git

Skill installed at `~/.agents/skills/sem/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- understanding what changed in a commit, PR, branch, or working tree at entity level (functions/classes/methods, not line ranges)
- blast radius / impact of changing or deleting an entity; who calls it
- who last modified an entity, or how it evolved across history
- gathering token-efficient code context (entity body + callers/callees) for review, refactor, or an LLM subtask
- repo hotspots, co-change pairs, entity dependency graphs

**Activation:**
- pi: `/skill:sem <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/sem/SKILL.md` and follow its outline into `references/`

**Preference:** when the sem MCP server is configured, prefer `mcp__sem__*` tools (`sem_diff`, `sem_impact`, `sem_context`, `sem_entities`, `sem_blame`, `sem_log`) over shelling out. CLI (`sem diff|impact|blame|log|context|...`) is the fallback for plain terminals and scripts.

**Guardrail:** never run `sem setup` (it globally replaces `git diff`); cloud commands (`sem login/cloud/review`) are user opt-in only.
<!-- sem:end -->
