<!-- jev:start -->
## jev skill — typed judgment tools (TypeSafe Jev)

Skill installed at `~/.agents/skills/jev/` (Agent Skills spec; `SKILL.md` = syllabus, deep material in `references/`).

**Activate the skill when the task involves:**
- verification/guardrail judgments: fact-checking claims against evidence, screening fetched/pasted content before it enters context, reviewing a diff before declaring done, gating completion claims
- semantic selection by meaning: picking/reranking/classifying candidates (files, notes, passages, issues) where exact match will not decide it
- calibrated probabilities, bounded decisions between 2-6 options, passage comparison, verbatim field extraction with audit

**Activation:**
- pi: `/skill:jev <request>` forces load; model auto-activates when the description matches
- agy/others: read `~/.agents/skills/jev/SKILL.md` and follow its outline into `references/`

**Preference:** when the jev MCP server is configured, prefer the `jev_*` tools (`jev_verify`, `jev_screen`, `jev_noul`, `jev_find`, `jev_rerank`, `jev_classify`, `jev_decide`, `jev_compare`, `jev_extract`, `jev_audit`, `jev_review`, `jev_gate`) over hand-rolled judgment prompts.

**Config note:** the server needs a provider key (`TYPESAFE_API_KEY` or alternatives — names only, see skill references/) in its MCP `env`. Missing key = calls fail closed at runtime; do not embed key values in rules or skills.
<!-- jev:end -->
