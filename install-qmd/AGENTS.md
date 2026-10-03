<!-- qmd:start -->
## qmd skill — local markdown knowledge search

Ability installed at `~/.agents/skills/qmd/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- finding/recalling content in indexed markdown — notes, docs, wikis, ADRs, specs, transcripts, meeting notes
- answering questions about project knowledge before considering web search
- qmd itself: search/query/get syntax, collections, metadata filters, embeddings, index health, MCP wiring

**Activation:**
- pi: `/skill:qmd <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/qmd/SKILL.md` and follow its outline into `references/`

**Fallback (no skill load):** MCP tools `mcp__qmd__*` are registered; CLI is `qmd search|query|get`. Search → retrieve full source → answer citing `#docid`/path. Never answer facts from snippets.
<!-- qmd:end -->
