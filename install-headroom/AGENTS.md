<!-- headroom:start -->
## headroom skill — context compression layer

Skill installed at `~/.agents/skills/headroom/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- large tool outputs, log dumps, diffs, JSON blobs, or RAG chunks about to enter context — compress first (`headroom_compress`), same answers at a fraction of the tokens
- needing the exact original bytes back after compression — retrieve via CCR (`headroom_retrieve`)
- answering "how much is this saving" — `headroom_stats`

**Preference:** when the headroom MCP server is configured, prefer the `headroom_*` tools over pasting raw bulk content. Compression is local — nothing leaves the machine — but never feed secrets assuming compression hides them.

**Activation:**
- pi: `/skill:headroom <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/headroom/SKILL.md` and follow its outline into `references/`

**Boundary:** `wrap`/`learn`/`init`/`mcp install`/`proxy` are USER operations (they mutate agent configs or launch daemons) — never run them from agent flows.
<!-- headroom:end -->
