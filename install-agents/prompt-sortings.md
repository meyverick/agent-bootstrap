# Prompt: Cold-Agent Re-Audit of `sorting.md` vs `listing.md`

Use this prompt with a fresh, cold AI agent to re-audit `sorting.md`, compare it against `listing.md`, identify any misplaced, duplicated, altered, or missing directives, and update `sorting.md` to achieve 100% faithful ordering coverage.

---

```markdown
You are performing a forensic ordering audit of a developer rulebook sorting and its source inventory.

### Context & Files
- **Source of Truth:** @agent-bootstrap/install-agents/listing.md (the categorized directive inventory: §§1–5, categories A–J, redundancy matrix §3, scope classification §4, glossary §5)
- **Document Under Audit:** @agent-bootstrap/install-agents/sorting.md (the rulebook-ordered sorting: chapters 1–11, Appendix S, Appendix M)

### Objective
Audit `sorting.md` against `listing.md` to find any missing directives, duplicated placements, altered wording, wrong chapters, mishandled stack-specific records, or broken source pointers, and update `sorting.md` to achieve 100% faithful ordering coverage.

---

### Step-by-Step Instructions

#### 1. Full Ingestion & Grounding
- Read `agent-bootstrap/install-agents/listing.md` in full from disk. Note every `#### X.Y` record across categories A–J (79 records expected).
- Read `agent-bootstrap/install-agents/sorting.md` in full from disk. Note every `#### X.Y` record across chapters 1–11 and Appendix S, plus Appendix M.

#### 2. Bi-Directional Gap & Precision Audit
Perform a strict comparative check:

1. **Coverage Check (Forward):**
   - For every single `#### X.Y` record in `listing.md` §2, verify it appears in `sorting.md` exactly once.
   - Pay special attention to boundary records (first/last of each category) and the easily-missed ones (e.g. single-record chapters).
2. **Fidelity Check (Reverse):**
   - For every record in `sorting.md`, diff its body word-for-word against the same record in `listing.md`. Only the added `- **Rulebook № …**` tag line may differ — every other line must be byte-identical.
   - Did any chapter description or appendix note restate a normative rule in different words? Descriptions must frame, never restate.
3. **Chaptering & Classification Verification:**
   - Is each record in the rulebook chapter a developer would look for it in? Flag placements that follow source order instead of rulebook logic.
   - Review stack-specific handling: every record `listing.md` §4 classifies as stack-specific must sit in Appendix S (or carry its tag) — none may sit untagged in chapters 1–11.
   - Review Appendix M: does every one of the 30 Must-follow bullets point at its canonical record per `listing.md` §3, with shared records listed once?
4. **Pointer Audit:**
   - Does every record's source pointer (`listing.md` §2 `X.Y`) resolve to a real record?
   - Do the `AGENTS.md` origins cited inside each record still match (spot-check five against `install-agents/AGENTS.md`)?

#### 3. Execution & Deliverable
1. Present an executive summary of your audit findings:
   - **Gaps found:** Records present in `listing.md` but missing in `sorting.md`.
   - **Duplicates found:** Records appearing more than once (outside the Appendix M pointer table, which references by id only).
   - **Wording drift corrected:** Any line differing beyond the Rulebook № tag.
   - **Misplacements fixed:** Records moved to their correct chapter, with reasoning.
2. Update `agent-bootstrap/install-agents/sorting.md` in place to fill all identified gaps while preserving its chapter structure and Rulebook № sequence (renumber the affected chapter if a record moves into it).
```
