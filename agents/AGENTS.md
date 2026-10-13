---
okf_version: "0.2"
type: SystemDirective
title: Universal Developer Rulebook & Agent Directives (AGENTS v2)
description: Universal operational core, workspace boundaries, agent guardrails, and language-agnostic software engineering standards.
tags: [architecture, system-prompt, okf-v0.2, agents-standard, rulebook, quality, engineering-standards]
generated: { by: "human:developer", at: 2026-10-13T00:00:00Z }
status: stable
---

# Universal Developer Rulebook & Agent Directives (AGENTS v2)

## Executive Overview

This directive establishes the universal operational runtime for AI coding agents and the foundational engineering invariants required across all software projects in the workspace.

It is strictly **language-agnostic** and **framework-agnostic**. Situational deployment recipes, tool configurations, and framework implementations are offloaded to modular skills (`SKILL.md`) via progressive disclosure.

---

# Part I: Agent Operational Runtime

## Chapter 1: Identity, Workspace Topology & Execution Boundaries

* **Two-Tier Topology & Naming**:
  - **Tier 1 (Root Orchestrator `./`)**: The parent `<project>-workspace` repository holding agent configuration, orchestration metadata, and environment definitions.
  - **Tier 2 (Codebase Submodule `./module/`)**: The single Git submodule holding all application source code, domain packages, and native toolchains. Internal layout of `./module/` is project-determined (e.g., monolithic `src/`, modular packages, or multi-tier services); no specific subfolder taxonomy (`web/`, `api/`, etc.) is mandated.
* **Command Context & Autonomous Toolchain Discovery [CRITICAL]**:
  - Execution CWD: All build, test, lint, and package commands must execute with working directory set strictly inside the codebase submodule (`./module/` or its subdirectories). Never execute codebase toolchain commands in the orchestrator root.
  - Autonomous Discovery: Agents must autonomously inspect `./module/` to deduce project manifests (`Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`, etc.) and native harness scripts. Never ask the user for build or test commands discoverable from repository manifests. The canonical check harness (`./scripts/check.sh` delegating to `./module/scripts/check.sh`, Chapter 7) is the primary blocking gate.
* **Runtime Isolation**: Inter-tier or inter-service communication occurs strictly via network, API, or WebSocket interfaces; zero runtime filesystem traversal across subsystem boundaries (`../` traversal forbidden).
* **Submodule Pointer Sync**: Submodule commits must be immediately recorded in the orchestrator root (`git add module && git commit`). `git submodule status` must never show `+` (stale) or `-` (uninitialized).

## Chapter 2: Operational Guardrails & Circuit Breakers

* **Surgical Mutations**: Apply changes via targeted SEARCH/REPLACE deltas rather than whole-file overwrites. Respect LOC density tiers: leaf/atomic modules ≤150 LOC, cohesive domain modules ≤300 LOC, state machines ≤500 LOC hard ceiling (files >500 LOC flag ADR decomposition; never refactor mid-task).
* **Inviolable Prohibitions**: NEVER commit credentials or `.env` files · force-push shared branches · edit `node_modules/`, `vendor/`, or generated files · inline-disable linter or compiler rules. Ask first for shared-env migrations or deletions outside task scope.
* **1-Fix Circuit Breaker**: On compiler, lint, or type diagnostics: read error output → make exactly ONE autonomous fix attempt → re-verify. Repeated failure → halt immediately and prompt user with findings.
* **Mutation Topological Sort**: Cross-module scaffolding order: 0) Grounding → 1) DB Schema / Data Contracts → 2) Coordinator & Backend Handlers → 3) State & Route Handlers → 4) UI & Presentation Views. Never build UI before data contracts.

## Chapter 3: Communication & Persona Standards

* **Caveman-Adjacent Density**: Emit high-density technical responses. Drop conversational preambles, greetings, filler transitions, and post-task summaries. Technical substance (code, paths, commands, errors) must be exact and verbatim.
* **Non-Gated Redaction**: Sensitive data (tokens, JWTs, API keys, passwords, OTPs, PII) must be masked unconditionally at emission across all environments and log verbosities.

## Chapter 4: Skill Delegation & Discovery

* **Session MCP Grounding**: Inspect available host MCP tools to ground live environment facts and third-party documentation. Never commit external host machine paths to the repository.
* **Progressive Skill Discovery**: Scan `./.agents/skills/` at task start to discover domain-specific capabilities via `name` and `description` frontmatter. Delegate procedural workflows to dedicated skills:
  - Gate Harness & Clean Sandbox: `.agents/skills/check/SKILL.md`
  - Documentation & ADR Provenance: `.agents/skills/okf-docs/SKILL.md`
  - Queues & Async Architecture: `.agents/skills/scalability/SKILL.md`
  - Cross-Cutting Security: `.agents/skills/guardrails/SKILL.md`
  - Specialized stacks & deployment recipes: Consult dedicated domain skills before mutating CI/CD or platform configs.

---

# Part II: Software Engineering Invariants

## Chapter 5: Foundational Engineering Philosophy & Design Invariants

* **KISS & YAGNI**: Favor cognitive simplicity. Author code strictly for explicit, confirmed requirements. Never introduce speculative abstractions, unused parameter flags, or premature generalizations.
* **SOLID & Single Source of Truth (DRY)**:
  - Single Responsibility (SRP): Each module or function has exactly one reason to change.
  - Open/Closed (OCP): Open for extension via contracts, closed for direct modification.
  - Interface Segregation (ISP): Clients must not depend on interfaces they do not use.
  - Single Truth (DRY): Every piece of domain logic and data contract has a single unambiguous representation.
* **Separation of Concerns & Law of Demeter**: Maintain strict encapsulation between state, UI, business logic, and persistence. Modules only interact with direct collaborators. Never traverse deep object chains across boundaries (`a.b().c().d()`). Define strict serialization contracts at every boundary.
* **Locality of Behavior & Modularity**: Code that changes together lives together. System components communicate via strict interface contracts and stateless micro-modules.

## Chapter 6: State, Concurrency & Data Architecture

* **Deterministic State Transitions (Pure Reducers)**: Domain transitions must be pure functions over events:
  $$\text{delta}: (\text{State}, \text{Event}) \rightarrow \text{State}$$
  Zero side effects or hardware clock evaluations inside reducers; pass timestamps and IDs inside event payloads.
* **Protect the Synchronous Request Path**: Heavy compute, bulk I/O, external network calls, and long-running workflows must never block the request/response path. Offload immediately using persistent queues and background workers. Return early with a task receipt and stream progress or notify completion via push transports (WebSockets, SSE). Polling is a deprecated fallback.
* **Explicit Backpressure & Flow Control**: All async channels and worker pools must enforce explicit backpressure: bounded buffers, concurrency caps, tenant rate limits, and network call timeouts. Reject unbounded queues.
* **Idempotency & Deduplication**: Messaging and background workers assume at-least-once delivery. Consumers must be idempotent with unique deduplication keys.
* **Zero-Downtime Database Migrations (3-Phase Expand-Contract)**:
  - Migrations are immutable: never mutate existing migration files; append new migrations only.
  - Non-trivial migrations execute across three separate releases:
    1. Phase 1 (Expand): Add new column/table as nullable; dual-write active.
    2. Phase 2 (Backfill): Async background data migration; switch reads to new structure.
    3. Phase 3 (Contract): Stop legacy writes; deploy final migration dropping legacy structures.

## Chapter 7: Quality Invariants, Verification & Defensive Architecture

* **Universal Definition of Done**: A task or pull request is complete ONLY when the touched module's native verification lane exits 0:
  $$\text{format} \longrightarrow \text{lint} \longrightarrow \text{test} \longrightarrow \text{build} \quad (\text{exit } 0)$$
  Disabling compiler warnings or linter rules inline to bypass checks is strictly forbidden.
* **Canonical Check Harness & Intensive Gate Contract [CRITICAL]**:
  - **Two-Tier Delegation**: Orchestrator root MUST maintain an executable `./scripts/check.sh` delegating directly to the codebase submodule's `./module/scripts/check.sh`.
  - **The Canonical 6-Slot Contract**: The check script enforces an intensive, non-negotiable verification gate:
    1. *Pointers*: Submodule freshness and commit alignment (`git submodule status`).
    2. *Secrets*: Leak scan for committed credentials, private keys, and un-ignored `*.env` files.
    3. *Native Lanes*: Matrix execution of `format` → `lint` → `test` → `build` across all codebase components.
    4. *Tracked Assets*: Compile-time asset tracking verification (`git ls-files --error-unmatch`).
    5. *Clean-Clone Sandbox*: Hermetic verification of committed buildability via disposable sandbox (`mktemp -d` + `git clone .`).
    6. *Smoke Verification*: Fast runtime sanity check.
  - **Fast Iteration (`--quick`)**: Harness MUST honor `--quick` (sub-10s iteration skipping slow clean-clone sandboxes during inner-loop development).
  - **Agent Maintenance Mandate**: Agents MUST update check scripts whenever manifests, dependencies, or compile-time assets change. Consult `.agents/skills/check/SKILL.md` for anatomy and diagnostic procedures.
* **Defensive Architecture & FEAR Posture**: Adopt a "Fault Early And Resist" posture. Validate strictly at all I/O boundaries. Halt immediately upon detecting corrupted internal state rather than proceeding with invalid data.
* **Proactive Two-Layer Testing**:
  - Layer 1 (Systematic Spec Coverage): Test every boundary, empty/null value, numeric limit, authorization gate, and error branch.
  - Layer 2 (Algebraic & Property Invariants): Assert universal properties across arbitrary input sequences: round-trip serialization $\text{deserialize}(\text{serialize}(x)) == x$, idempotency $f(f(x)) == f(x)$, and conservation laws.

## Chapter 8: Observability & Security Standards

* **Canonical Wide Events (Structured Telemetry)**: Request and worker job boundaries emit exactly ONE comprehensive, high-cardinality structured JSON document upon execution completion (route/task, status, duration, tenant, query counts, operational context). Deprecate intermediate log spam. Unhandled errors emit immediately with full stack context.
* **Non-Gated Secret Redaction**: Mask keys, secrets, tokens, and PII unconditionally at emission in all environments. Never gate redaction on verbosity flags.
* **Zero Trust & Least Privilege**: Never trust client-provided state without verification. Enforce authorization checks at the core service layer. Components execute with the least necessary privileges.

## Chapter 9: Team Workflow, Code Hygiene & Release Discipline

* **Surgical Diffs & Small Pull Requests**: Keep mutations minimal, cohesive, and targeted. Every commit/PR addresses a single coherent objective. Never initiate unrequested wide-scale refactors mid-task.
* **The Boy Scout Rule**: Always leave touched code cleaner than you found it via small, local cleanups strictly within touched lines.
* **Zero-Leak Version Control**: Enforce a strict default-deny `.gitignore` (ignore all, allowlist source). Never commit `.env` or credentials. Never force-push shared branches.
* **Semantic Versioning & Imperative Changelogs**: Version modules using `MAJOR.MINOR.PATCH`. Maintain `CHANGELOG.md` (`## VERSION - YYYY-MM-DD`) with entries categorized under `Added`, `Changed`, `Removed`, `Fixed` in the imperative mood.
