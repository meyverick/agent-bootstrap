# Prompt: Cold-Agent Forensic Audit of `AGENTS.md` vs `listing.md`

Use this prompt with a fresh, cold AI agent to re-audit `AGENTS.md`, compare it against `listing.md`, identify any omitted directives or nuances, and update `listing.md` to achieve 100% exhaustive coverage.

---

```markdown
You are performing a forensic architectural audit of an AI rulebook and its explanatory companion document.

### Context & Files
- **Source of Truth:** @agent-bootstrap/install-agents/AGENTS.md (the dense, telegraphic rulebook for AI agents)
- **Document Under Audit:** @agent-bootstrap/install-agents/listing.md (the plain-English categorized breakdown and directive index)

### Objective
Audit `listing.md` against `AGENTS.md` to find any missing directives, omitted edge cases, misinterpretations, or incomplete redundancy mappings, and update `listing.md` to achieve 100% exhaustive coverage.

---

### Step-by-Step Instructions

#### 1. Full Ingestion & Grounding
- Read `agent-bootstrap/install-agents/AGENTS.md` in full from disk. Note every clause across:
  - Frontmatter & Summary
  - The 30 upfront "Must-follow rules"
  - `<system_role>`
  - Sections 1 through 13
- Read `agent-bootstrap/install-agents/listing.md` in full from disk.

#### 2. Bi-Directional Gap & Precision Audit
Perform a strict comparative check:

1. **Coverage Check (Forward):**
   - For every single rule, constraint, command pattern, and parameter mentioned in `AGENTS.md`, verify whether it is captured in `listing.md`.
   - Pay special attention to granular details:
     - Specific CLI flags & tooling (e.g., `cargo-chef`, `sqlx prepare`, `cargo watch`, `vite dev` proxying, `--quick`, `envx`, `evals/evals.json`).
     - Commit & Changelog rules (e.g., `## VERSION - YYYY-MM-DD`, imperative mood, `Added`/`Changed`/`Removed`/`Fixed`).
     - Testing & Quality mechanics (e.g., `Boy Scout Rule`, algebraic invariants like `deserialize(serialize(x)) == x`, compile-time tracking via `git ls-files --error-unmatch`).
     - Meta/CI flags (e.g., `SUBMODULE_TOKEN` vs `GITHUB_TOKEN`, Dokku port 22 vs firewalled VPS ports, path allowlists).
2. **Fidelity Check (Reverse):**
   - Did `listing.md` misinterpret any cryptic "caveman" shorthand?
   - Did it correctly distinguish between hard invariants (`MUST`, `[CRITICAL]`, `NEVER`) and studio preferences (Section 4 defaults)?
3. **Redundancy & Classification Verification:**
   - Review the **Redundancy Matrix** in Section 3 of `listing.md`. Are there any duplicate pairs between the "Must-follow rules" and Sections 1–13 that were missed?
   - Review the **Scope Classification** in Section 4. Are any stack-specific rules incorrectly labeled universal, or vice-versa?
4. **Glossary Audit:**
   - Are there specialized terms or acronyms in `AGENTS.md` that remain unexplained in Section 5's glossary?

#### 3. Execution & Deliverable
1. Present an executive summary of your audit findings:
   - **Gaps found:** Directives or clauses present in `AGENTS.md` but missing/under-explained in `listing.md`.
   - **Inaccuracies corrected:** Any nuance that was misinterpreted.
   - **Additional redundancies uncovered:** Any duplicate pairs not yet logged in the matrix.
2. Update `agent-bootstrap/install-agents/listing.md` in place to fill all identified gaps while preserving its clear, structured, and plain-English tone.
```
