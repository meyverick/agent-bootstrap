<!-- context7:start -->
## context7 skill — up-to-date library documentation

Skill installed at `~/.agents/skills/context7/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- library/framework/SDK/CLI questions: API syntax, configuration options, setup steps, code examples, version migrations — React, Next.js, Prisma, Tailwind, Django, Spring, or any library
- verifying API signatures/options before writing code — training data may be outdated; prefer this over web search for library docs
- debugging or explaining library-specific behavior, "how do I" questions naming a tool

**Activation:**
- pi: `/skill:context7 <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/context7/SKILL.md` and follow its outline into `references/`

**Preference:** when the context7 MCP server is configured, use its tools — `resolve-library-id` (library name -> ID) then `query-docs` (ID + single-concept query). CLI fallback: `npx ctx7@latest library <name> "<query>"` / `docs <libraryId> "<query>"` (no global install).

**Config note:** remote MCP entry keeps its `Authorization` header (API key) in the user-global MCP config; without a key the server still works at reduced rate limits. Never embed key material in rules or skills.
<!-- context7:end -->
