---
okf_version: "0.2"
type: Refactoring Plan
title: AGENTS.md section extraction into skills
description: Which parts of install-agents/AGENTS.md can be extracted into always-shipped skills — skill names, extracted parts, rationale, promotion prerequisites, and the exact directive blocks to integrate back.
tags: [okf-v0.2, agent-skills, progressive-disclosure, refactoring, token-optimization]
generated: { by: pi/1.0, at: 2026-10-04T00:00:00Z }
sources: [{ id: agentsmd-format, resource: references/agentsmd/README.md }, { id: agentsstandard, resource: references/agentsstandard-dot-com/README.md }, { id: kit-precedent, resource: agent-bootstrap/install-agents/skill-guardrails/SKILL.md }]
status: draft
stale_after: 2027-04-04
---

# Refactoring plan — extract AGENTS.md sections into skills

## Principle

The book's own §13: *rules cost per-read tokens — keep only what pays rent.*
Extraction moves **task-gated doctrine** out of the always-read directive into
always-shipped skills; the book keeps the **mandate + activation line**. Net
effect: smaller always-read core, same compliance when the relevant skill loads.

```
BEFORE                                AFTER
AGENTS.md                             AGENTS.md
├─ Summary / Must-follow / persona    ├─ Summary / Must-follow (+2 promotions) / persona
├─ §7 OKF (23 lines, always read)     ├─ §7 → lean 2-bullet activation
├─ §4 graphics matrix + shells (10)   ├─ §4 core 3-tier + preference stays; matrix → pointer
├─ §6/6a scalability (21)             ├─ §6/6a → pointer (after Must-follow promotions)
└─ rest                               └─ install-agents/skill-<name>/  (loaded on demand)
```

**Extraction criteria**
- [✅ GOOD] task-gated (only some sessions need it), prose-heavy, self-contained, non-identity
- [❌ BAD] identity (persona, pillars, stack core), always-binding mandates (Must-follow), universal-rent rules (test design matrix, wide-event logging = every coding session), completion-time gates (§10), too-small-to-justify sections (§5 = 3 lines)

**Hard rules for every extraction**
1. **Verbatim move** — doctrine text goes into the skill unchanged; the book loses no rule (compliance identical once loaded).
2. **Activation = prose directive block, NOT balise markers** — the base MUST carry zero `<!-- … -->` markers (spec: *Balise-region single truth*; markers in base = second source, fights the upsert architecture). Precedent: the `guardrails` Must-read line.
3. **Always-shipped kit** — like `check`/`guardrails`: direct refs, no "when present".
4. **Skill anatomy per §8** — `name` = installed dir, `description` <1024 imperative, syllabus `SKILL.md` + `references/`, project-agnostic, no secrets, no delivery-mechanism knowledge.
5. **Promote before you extract** — any always-binding invariant in an extracted section moves into Must-follow FIRST (verbatim promotion lines below), so skill-skipping agents stay bound.

---

## Candidate 1 — `okf-docs` (TIER 1: extract now)

| Field | Value |
|---|---|
| **Skill name** | `skill-okf-docs/` → installed `.agents/skills/okf-docs/` — **aligns with the already-shipped `okf-docs` name** (agentic package + workspace catalog); no competing `okf` skill is created. Ours supersedes at the agentic-removal milestone. |
| **Extracted part** | **§7 Documentation & OKF (v0.2) — entire section body**: README promotion-only rule, wiki location/sync rule, OKF frontmatter + provenance YAML example, trust/lifecycle + actor conventions, progressive-disclosure/absolute links, `[✅ GOOD]`/`[❌ BAD]` conventions, reference-ingestion READ-ONLY rule |
| **Measured cost** | 23 total / 19 non-blank lines (heading included; measured 2026-10-04) |
| **Reason** | Pays rent only on doc/ADR/wiki/README tasks yet costs 23 always-read lines incl. a YAML block. Largest clean block; perfectly task-gated; not identity. |
| **Overlap note** | agentic's `.agentic-manifest.json` owns `okf-docs` → its atomic replace restores the agentic version each run until the removal milestone (transient overwrite expected; ours wins after). |
| **Wiki note** | Separate `skill-wiki` **rejected** — wiki = 2 lines inside §7; covered by `okf-docs` (references/wiki.md if it grows). |

**Directive block to integrate into AGENTS.md (replace §7 body — lean, <200 chars):**

```markdown
## 7. Documentation & OKF (v0.2)

- **OKF v0.2** → skill `.agents/skills/okf-docs/`: frontmatter, provenance, README rules. Load before any doc/ADR/wiki.
- Wiki + `./references/` (READ-ONLY) rules live there.
```

---

## Candidate 2 — `scalability` (TIER 2: after promotions)

| Field | Value |
|---|---|
| **Skill name** | `scalability` → `./agent-bootstrap/install-agents/skill-scalability/` → installed `.agents/skills/scalability/` |
| **Extracted part** | **§6 Scalability & Queuing Architecture + §6a Realtime & Event-Driven — bodies**: orchestrator-workers topology detail, worker contracts, temporal isolation mechanics, anti-pattern lists, LISTEN/NOTIFY + WS/SSE push mechanics, polling fallback gates, `HP crossed 90%` example |
| **Measured cost** | 21 total / 17 non-blank lines (both headings; measured 2026-10-04) |
| **Reason** | Design-time-gated (background work / live-state tasks). Must-follow already carries the binding mandates (queue+worker, backpressure, at-least-once, polling anti-pattern) — §6/6a holds the *how*. |
| **Prerequisite** | **Promote the two verbatim lines below into Must-follow BEFORE extraction** (non-redundant always-binding invariants: single state owner, hub-and-spoke, deterministic transitions, clock ban). gRPC transport stays in the §6 body — generic inter-module transport is already bound by Must-follow (*inter-module via API/network only*). |

**Verbatim Must-follow promotion lines (add before extraction):**

```markdown
- State coordinator & topology: Axum/Tokio on Rust is sole state coordinator via SQLx PostgreSQL; workers are disposable and stateless; hub-and-spoke only (coordinator <-> workers), no emergent peer-to-peer meshes.
- Deterministic state transitions: Domain transitions MUST be pure functions over events (`delta: (State, Event) -> State`) with zero side effects; reading hardware clocks inside transition logic is forbidden.
```

**Directive block to integrate into AGENTS.md (replace §6/§6a bodies):**

```markdown
## 6. Scalability & Queuing Architecture

- **Scalability doctrine** (skill `.agents/skills/scalability/SKILL.md`): queue+worker+streaming, worker contracts, LISTEN/NOTIFY + WebSocket/SSE push, polling = fallback only (single-flight+timeout+dedup), anti-patterns. Designing background work or live state flow? Load the `scalability` skill — the Must-follow rules (incl. the two promoted lines above) still bind.
```

*(§6a collapses into the same block; keep a 1-line `## 6a. Realtime & Event-Driven → see §6` stub to preserve cross-references.)*

---

## Candidate 3 — CANCELLED (§11 stays in the book)

§11 Quality/Observability **is not extracted** — moved to *Rejected candidates* below: its Two-Layer Test Design Matrix and Canonical Wide-Event Logging govern **every** coding session (universal rent), and extraction yields only ~8-9 net lines against the risk of unguided happy-path tests and debug-log spam.

---

## Candidate 4 — `graphics-simulation` (TIER 2: task-gated preferences)

| Field | Value |
|---|---|
| **Skill name** | `graphics-simulation` → `./agent-bootstrap/install-agents/skill-graphics-simulation/` → installed `.agents/skills/graphics-simulation/` (or fold as a chapter of the existing `design-craft` skill — decide at implementation) |
| **Extracted part** | **§4 fragments only**: the Graphics & Simulation granularity matrix (8 lines: DOM / client ECS / Threlte / Babylon / PixiJS / Phaser / headless ML selection rules) + Telegram/TMA shell rule + Native Shell (Tauri v2) rule (2 lines) — **~10 lines total / 10 non-blank** (measured 2026-10-04) |
| **Kept in §4** | Preference-status framing + Default 3-tier + all other stack-preference bullets (identity + general-rent) |
| **Reason** | Selection guidance rents only on visual/shell tasks; non-graphics sessions never need it. First §4 split that respects "preferred stack kept as preference": the *preference declaration* stays, the *when-to-use-which* matrix loads on demand. |

**Directive block to integrate into AGENTS.md (inside §4, replacing the extracted bullets):**

```markdown
- **Graphics, simulation & native shells** (skill `.agents/skills/graphics-simulation/`): granularity matrix for DOM/ECS/2D/3D/headless-ML selection + Telegram/TMA and Tauri shell rules — load when building visual scenes, games, or desktop/mobile shells.
```

---

## Prune target — §12 (no skill; fragment-level dedup)

**§12 Version Control & Releases** — remove restatements of Must-follow, keep unique procedure:

| Fragment | Action |
|---|---|
| Orchestrator deploy pipeline bullet (watchers, `SUBMODULE_TOKEN`, GHCR login, `appleboy/ssh-action`, `DOKKU_SSH_PORT`) | **REMOVE** — 4/4 tokens restate Must-follow CI/CD contracts; replace with `see Must-follow deploy contracts` |
| Module scaffolding bullet: `quality.yml (native lane…)` + `orchestrator owns unified deploy.yml (…)` clauses | **REMOVE clause text** (restates Must-follow) — inline cross-reference instead |
| Module scaffolding bullet: `git init` → remote → `git submodule add` → `mkdir -p .github/workflows` procedure + `standalone microservices add deploy.yml` | **KEEP** — unique, never stated elsewhere |

Measured recovery: **~1 physical line** (L225 removed; L224 slimmed in place).

---

## Rejected candidates (keep in book)

| Section | Verdict | Why |
|---|---|---|
| Summary, Must-follow, `<system_role>` | **KEEP** | The directive itself — always-read by definition |
| §1 Persona, §2 Pillars, §13 Guide Maintenance | **KEEP** | Identity + how to edit the book (meta-rent every session) |
| §3 Topology, §4 core (3-tier + Preference-status) | **KEEP** | Studio identity; §4 fragments → Candidate 4 |
| §5 Resilience & Security | **KEEP** | 3 lines — smaller than the activation block it would cost |
| §8 Tooling & Skills | **KEEP (slim later)** | Discovery doctrine = always-rent; *Skill Engineering* bullet (~10 lines) = Tier 3 candidate → existing `create-skill` skill (name already shipped by agentic — fold content at migration, then slim §8) |
| **§11 Observability & Debug** | **KEEP (cancelled from extraction)** | Two-Layer Test Design Matrix + Canonical Wide-Event Logging = universal rent (every coding session); 16 total lines only; extracting risks unguided tests + log spam for ~8 net lines |
| §9 Exploration, §10 Workflow | **KEEP** | Governs every task session — maximum rent |
| §12 | **PRUNE ONLY** (above) | Mixed rent: push gate + check script = every push; dedup only, no skill |
| Wiki as own skill (`skill-wiki`) | **REJECTED** | 2 lines of §7 — covered by `okf-docs` |

---

## Impact estimate (matching units; measured 2026-10-04)

| | Section total/nb | Activation + promotions (total/nb) | Delta total/nb |
|---|---|---|---|
| Candidate 1 (`okf-docs`, §7) | 23 / 19 | 4 / 3 | **−19 / −16** |
| Candidate 2 (`scalability`, §6+6a) | 21 / 17 | 3 / 2 block **+ 2 / 2 promotions** | **−16 / −13** |
| Candidate 4 (`graphics-simulation`, §4 fragments) | 10 / 10 | 1 / 1 | **−9 / −9** |
| Prune (§12) | 1 / 1 | 0 / 0 | **−1 / −1** |
| **Total** | 55 / 47 | 10 / 8 | **−45 / −39 ≈ 19% / 16% of 237 lines** |

Arithmetic rule: total-vs-total and non-blank-vs-non-blank never mix; Must-follow promotion costs are deducted (Candidate 2). §11 cancelled (was ~8-9 net — not worth universal-rent risk).

## Constraints & sequencing

1. **New change required** — `fix-install-agents-base` spec mandated *"sections 1–7 and 9–13 byte-unchanged"* (now archived; `agents-base` main spec exists). Extraction amends `agents-base` → sequence: archive this change → new change `extract-agents-skills` (proposal/specs/design/tasks) → apply.
2. Spec amendments inside the new change: `Directive structure preserved` scope (§7/§6/§6a/§4-fragments/§12-bullet become activation lines/pruned), new requirement `Task-gated doctrine lives in always-shipped skills`.
3. Each extracted skill ships in `install-agents/` beside `skill-check/`/`skill-guardrails/` (always-installed kit → direct refs, no hedging).
4. Audit fixes F-1 (stale `project/…` paths), F-2 (`positive_triggers`/`anti_triggers` non-spec keys), and F-7 (Must-follow *never edit `<project>/AGENTS.md`* lacks a balise-region carve-out — add: *balise region = tool-owned, remainder human-owned, agents edit neither unprompted*) ride along in the same change — same kit/book surface.
5. Directory naming convention: `skill-<name>/` at storage, deployed as `.agents/skills/<name>/` (rename at install — same mapping as `skill-check` → `check`, `skill-okf-docs` → `okf-docs`).
6. **Deploy exclusion:** this file (`refactoring.md`) is a planning document living beside the deployable source — the future `install-agents` deployer ships `AGENTS.md` + `skill-*/` ONLY; `refactoring.md` must never be copied into a project tree.

## Cold-worker audit prompt

Copy the paragraph below verbatim to a fresh agent (fresh context, no prior knowledge of this work) and have it audit both files independently: Read `agent-bootstrap/install-agents/AGENTS.md` end to end, then `agent-bootstrap/install-agents/refactoring.md`, and verify the extraction plan without trusting either document: re-measure every line-count and impact claim against the actual file, re-apply the stated extraction criteria yourself to every section (task-gated prose may leave the always-read core; identity, Must-follow, completion-time gates, and always-binding architectural invariants must either stay or be promoted into Must-follow before their section can leave), decide whether the plan's candidates are the right splits or whether better or additional ones exist that it missed — including subsection-level splits and the rejected candidates — check that each proposed activation block preserves or explicitly routes every rule of the section it replaces, that cross-references to the extracted sections still resolve, and that the hard rules hold (verbatim moves, prose activation instead of balise markers, always-shipped kit with direct references, skill anatomy per §8, naming collisions with skills other packages ship); work strictly read-only, ground every finding on the actual file with section/line references, and answer with one numbered findings list grouped into three parts: inaccuracies in the plan, splits the plan missed or should handle differently, and a final verdict on whether the plan is applicable as written or must be revised first.
