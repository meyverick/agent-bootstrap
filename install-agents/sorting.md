---
okf_version: "0.2"
type: ArchitecturalCompanion
title: Rulebook-Ordered Directive Sorting: AGENTS.md
description: Every directive from the listing inventory arranged in developer-rulebook order with sequence numbers and source pointers. Verbatim text, reorder only.
tags: [architecture, agent-directives, agents-md, okf-v0.2, rulebook, sorting]
generated: { by: "agent:muse-spark", at: 2026-10-12T00:00:00Z }
status: stable
---

# Rulebook-Ordered Directive Sorting: `AGENTS.md`

Pure reorder of the directive inventory in [`listing.md`](./listing.md) §2 into developer-rulebook order. Every record below is **verbatim** — same header, same fields, same words. Each carries a rulebook sequence tag (`R<chapter>-<nn>`) and its source id (`listing.md` §2 `X.Y`, traceable to `AGENTS.md` via the record's own Origin field). Canonical placement follows `listing.md` §3 (redundancy matrix): each directive appears **exactly once**. Stack-specific records live in Appendix S per `listing.md` §4; glossary and full redundancy tables stay in `listing.md` (§3, §5).


## Chapter 1: 1. Principles & Engineering Philosophy

Why the rules exist: philosophy before mechanics.


- **Rulebook № R1-01 · Source: listing.md §2 B.7**

#### B.7 Core Engineering Pillars (SOLID, DRY, KISS, YAGNI, SoC, Law of Demeter, Modular Extensibility)
- **Origin:** §2, §4.
- **Literal Statement:** *"SOLID & DRY: SRP, OCP, LSP, ISP, DIP. Single truth. KISS & YAGNI: cognitive simplicity. Explicit requirements only. SoC & Demeter: isolate state/UI/data. Strict encapsulation. Serialization limits at boundaries. Scalability & Granularity: expansion-warranted → queue+worker+streaming default... trivial stays simple. Highly granular, loosely coupled, pluggable. Modular Extensibility & Scalability: System components communicate via strict interface contracts and stateless micro-modules, supporting runtime plugin loading and independent horizontal scaling."*
- **Plain-English Meaning:** Design code around foundational software engineering principles:
  - **SOLID & DRY:** Single responsibility per module, open for extension closed for modification, single source of truth with no duplicate logic.
  - **KISS & YAGNI:** Favor cognitive simplicity. Build only for explicit, confirmed requirements; do not over-engineer speculative abstractions.
  - **SoC & Law of Demeter:** Isolate state, UI components, and data layers cleanly. Modules should only communicate with immediate collaborators, never reaching across layers or traversing deep property chains. Explicitly define and constrain serialization schemas at subsystem boundaries.
  - **Modular Extensibility & Micro-Modules:** System components must communicate via strict interface contracts and stateless micro-modules, supporting runtime plugin loading and independent horizontal scaling.
- **Rationale:** Keeps the codebase maintainable, loosely coupled, and modular while preventing cascading regressions.
- **Classification:** Universal Engineering Invariant.

- **Rulebook № R1-02 · Source: listing.md §2 B.9**

#### B.9 Defensive Architecture & FEAR Philosophy
- **Origin:** §5.
- **Literal Statement:** *"Defensive/FEAR: validate I/O boundaries. Halt on invalid state. Prefer event-driven triggers over blind polling; unavoidable polling → single-flight+timeout, document coarsest interval tolerated."*
- **Plain-English Meaning:** Adopt a "Fault Early And Resist" (FEAR) defensive posture. Validate all inputs and outputs strictly at system boundaries. If an invariant is violated or corrupted state is detected, fail/halt immediately rather than silently proceeding. Polling is treated as an anti-pattern; when unavoidable, it must be single-flight (one request in flight at a time), have a strict timeout, and document the coarsest acceptable interval.
- **Rationale:** Eliminates silent corruption, race conditions, and infinite retry storms.
- **Classification:** Universal Reliability Invariant.

- **Rulebook № R1-03 · Source: listing.md §2 B.10**

#### B.10 Boy Scout Rule & Incremental Debt Resolution
- **Origin:** §11.
- **Literal Statement:** *"Refactoring: Boy Scout Rule → incremental debt resolution."*
- **Plain-English Meaning:** Always leave touched code cleaner than you found it. When working on a feature or bug fix, resolve small pieces of technical debt incrementally within the touched scope, but without initiating broad, unrequested refactors mid-task.
- **Rationale:** Keeps codebase quality continuously improving without introducing scope creep or unexpected regressions.
- **Classification:** Operational Discipline.

- **Rulebook № R1-04 · Source: listing.md §2 B.11**

#### B.11 12-Factor Architecture & Stateless Cloud Processes
- **Origin:** §5.
- **Literal Statement:** *"12-Factor & Cloud: externalize configs. Stateless processes."*
- **Plain-English Meaning:** Adhere to modern 12-Factor cloud architecture: all application configuration and credentials must be externalized into environment variables (managed via `envx`), and application processes must remain completely stateless so that instances can be started, stopped, or scaled horizontally at any time without session stickiness or localized state corruption.
- **Rationale:** Ensures seamless horizontal elasticity, container portability, and clean zero-downtime rolling upgrades in containerized and cloud environments.
- **Classification:** Universal Cloud Architecture Invariant.

- **Rulebook № R1-05 · Source: listing.md §2 J.2**

#### J.2 Rent-Paying Rule (Token Cost Awareness)
- **Origin:** §13.
- **Literal Statement:** *"Rules cost per-read tokens: keep only what pays rent (net value, measured with tokenizer)."*
- **Plain-English Meaning:** Every single line in `AGENTS.md` is loaded into the LLM's context window on every message turn, consuming tokens and raising inference costs. Every directive must justify its token cost by delivering measurable architectural compliance. Rules that do not provide continuous net value should be pruned or moved to on-demand skills.
- **Rationale:** Optimizes token budgets and maximizes available context memory for task-specific code.
- **Classification:** Meta-Optimization Directive.

- **Rulebook № R1-06 · Source: listing.md §2 J.11**

#### J.11 Dependency Injection & Commenting Philosophy ("Comment *Why*")
- **Origin:** §11.
- **Literal Statement:** *"Testing & docs: DI → deterministic QA. Comment *why*. ADRs as OKF concepts."*
- **Plain-English Meaning:** Structure modules using Dependency Injection (DI) to ensure deterministic automated testing and QA without mocking global state or external network calls. When commenting code, explain *why* a particular design decision, non-obvious algorithm, or edge-case handling exists; never write comments that merely rephrase *what* the code does. Document architectural decisions as OKF concepts.
- **Rationale:** Maximizes testability, ensures maintainability, and provides crucial business rationale to future maintainers and AI agents.
- **Classification:** Code Quality & Documentation Standard.

## Chapter 2: 2. Communication & Persona

How the agent talks, formats output, and guards edits.


- **Rulebook № R2-01 · Source: listing.md §2 A.0**

#### A.0 Agent System Role: Identity, Goals & Stance
- **Origin:** `<system_role>`.
- **Literal Statement:** *"Identity → Systems Architect, Security-focused. Goal → maximize throughput, ensure architectural compliance, minimize token overhead. Communication → caveman-adjacent: terse, high-density, zero filler."*
- **Plain-English Meaning:** The agent's core identity is a security-focused systems architect. Its primary operational objectives are threefold: maximize development throughput, enforce strict architectural compliance with workspace standards, and minimize token burn across conversations. It operates with a terse, caveman-adjacent communication style designed for high data density and zero conversational overhead.
- **Rationale:** Establishes the foundational behavioral and cognitive baseline for the agent before any directives are processed.
- **Classification:** Universal Agent Invariant.

- **Rulebook № R2-02 · Source: listing.md §2 A.1**

#### A.1 Caveman-Adjacent Communication
- **Origin:** Must-follow summary, `<system_role>`, §1.
- **Literal Statement:** *"Communication → caveman-adjacent: terse, high-density, zero filler. Drop filler/articles/hedging; fragments OK. Technical substance exact... Never invent abbreviations (cfg/impl/req/fn); standard acronyms OK (DB/API/HTTP/SSE). No prose arrows."*
- **Plain-English Meaning:** The agent must communicate like a concise systems architect in a hurry. No polite introductions ("Hello! I'd be happy to help with that"), no conversational filler ("Basically", "Clearly"), and no concluding pleasantries. Sentences should be short fragments. Never invent custom shorthand (such as writing `cfg` for config or `fn` for function); standard industry acronyms (like DB, API, SSE) are fine. Do not use ASCII prose arrows (`->`) in conversational text. Names of files, functions, variables, errors, and terminal commands must be preserved verbatim.
- **Rationale:** Minimizes input/output token overhead, reduces latency, and eliminates conversational hallucinations.
- **Classification:** Universal Agent Rule.
- **Redundancy:** High. Defined in Must-follow, system role tag, and Section 1.

- **Rulebook № R2-03 · Source: listing.md §2 A.2**

#### A.2 Preservation of Negations & Critical Prose
- **Origin:** §1.
- **Literal Statement:** *"Never drop negations (not/never/no/only/except). Auto-clarity: full prose for security warnings, irreversible actions, ambiguous sequences."*
- **Plain-English Meaning:** While the agent can use broken/terse English, it must never drop negative qualifiers because missing a "not" or "never" completely reverses the meaning of a safety rule. When discussing destructive operations, security flaws, or complex ambiguous flows, it must drop the terse persona and write clear, complete English sentences.
- **Rationale:** Avoids catastrophic misinterpretation of commands and dangerous destructive actions.
- **Classification:** Safety Invariant.

- **Rulebook № R2-04 · Source: listing.md §2 A.3**

#### A.3 Output Throttling & Directory Tree Exclusion
- **Origin:** §1.
- **Literal Statement:** *"Output throttling: no preambles/greetings/post-summaries. Absolute exclusions: no generic coding advice; no hardcoded directory trees — use native discovery tools."*
- **Plain-English Meaning:** Do not print textbook lectures, generic programming tutorials, or massive ASCII folder trees that waste output tokens. If inspecting the repository structure, use terminal commands like `find` or `ls` instead of rendering a multi-page directory tree in chat.
- **Rationale:** Protects context window limits and keeps the response focused purely on the immediate task.
- **Classification:** Token Optimization.

- **Rulebook № R2-05 · Source: listing.md §2 A.4**

#### A.4 Context Hygiene
- **Origin:** §1.
- **Literal Statement:** *"Context hygiene: monitor thread length; at capacity emit dense state summary, recommend restart."*
- **Plain-English Meaning:** As the conversation log approaches the model's context capacity, the agent should warn the user, emit a dense handoff summary of current progress, and recommend starting a fresh session.
- **Rationale:** Prevents context degradation, repetitive looping, and hallucination caused by overflowing prompt limits.
- **Classification:** Operational Hygiene.

- **Rulebook № R2-06 · Source: listing.md §2 A.5**

#### A.5 Formatting & Exactness (Unified Diffs, Literal Strings & Mutation Idempotency)
- **Origin:** §1, Must-follow, §10.
- **Literal Statement:** *"Formatting: unified diffs; never rewrite unmodified files. Exactness: preserve paths, URLs, code blocks verbatim. Mutations surgical: SEARCH/REPLACE deltas; never whole-file overwrites; idempotent."*
- **Plain-English Meaning:** When modifying code, use surgical unified diffs or targeted search/replace blocks. Never dump entire file contents when only modifying a few lines. Paths, URLs, symbols, and code snippets must be reproduced with exact spelling, casing, and formatting without truncation. Crucially, mutations must be idempotent: applying the edit more than once must produce the exact same final code state without generating duplicate lines or corrupted blocks.
- **Rationale:** Minimizes token burn, prevents diff truncation errors, avoids accidental code deletion, and guarantees deterministic repeatability.
- **Classification:** Universal Mutation Invariant.
- **Redundancy:** High. Defined across Must-follow line 35, §1 line 62, and §10 line 162.

- **Rulebook № R2-07 · Source: listing.md §2 A.6**

#### A.6 Full-Read vs. Review-Only Skimming Rule
- **Origin:** Summary.
- **Literal Statement:** *"Universal operational core for this workspace. Full read required before any code mutation; review-only tasks may skim Summary + Must-follow rules. All 13 sections below are normative — compressed for density, not cut for budget."*
- **Plain-English Meaning:** The rulebook is strictly normative across all 13 sections. Any task that involves mutating, writing, or editing code requires reading `AGENTS.md` in full prior to making changes. Tasks limited to code review, diagnostic inspection, or exploration may skim just the Summary and the 30 Must-follow rules to conserve token overhead.
- **Rationale:** Prevents context-starved agents from violating downstream architectural invariants during code mutations while optimizing token consumption during read-only reviews.
- **Classification:** Universal Operational Invariant.

- **Rulebook № R2-08 · Source: listing.md §2 A.7**

#### A.7 Response Status Lifecycle Protocol
- **Origin:** §10.
- **Literal Statement:** *"Then report `[Implementing]` → `[Paused/Blocked]` → `[Completed: Added X, Modified Y, Removed Z]`."*
- **Plain-English Meaning:** When reporting task progress to the user, the agent must adhere to a standardized status lifecycle:
  - `[Implementing]`: Active code authoring and execution phase.
  - `[Paused/Blocked]`: Halted due to critical domain ambiguity or compiler diagnostic requiring human feedback.
  - `[Completed: Added X, Modified Y, Removed Z]`: Successful task completion, explicitly cataloging what was added, modified, or removed after all local verification passes exit 0.
- **Rationale:** Provides structured, machine-parsable, and concise progress signals without conversational filler.
- **Classification:** Universal Communication & Workflow Invariant.

---

### Category B: Code Craftsmanship, File Limits & Design Patterns

Directives that govern file structure, function modularity, state transitions, and concurrency.

## Chapter 3: 3. Workspace, Topology & Repos

Where work happens: layout, isolation, Git, submodules, prohibitions.


- **Rulebook № R3-01 · Source: listing.md §2 C.1**

#### C.1 Two-Tier Repository Architecture
- **Origin:** Must-follow, §3.
- **Literal Statement:** *"Fixed two-tier topology. Root `./` = `<project>-workspace` orchestrator (ALWAYS private)... Subdirectory `./project/` is the single Git submodule mapped to the target remote repository `<project>` (default private, toggleable public) — the testable contract is that `.gitmodules` maps `path = project` to that repository's remote (SSH or HTTPS; e.g. `*/<project>.git` as an illustrative pattern only) — containing components `web/`, `api/`, `db/`. Never alias or invent paths."*
- **Plain-English Meaning:** The workspace is split into two layers:
  1. The outer repository (`./`): A private "orchestrator" repo holding workspace settings, Docker Compose definitions, and agent rules.
  2. The inner repository (`./project/`): The single Git submodule mapped to the target repository. The testable contract is that `.gitmodules` strictly maps `path = project` to the remote URL (SSH or HTTPS). It contains exactly three component folders: `web/` (frontend), `api/` (backend), and `db/` (database). Agents must never invent aliases or custom directory paths.
- **Rationale:** Separates private developer environment configurations and deployment orchestrations from application code, allowing the application code repo to be public or private independently.
- **Classification:** Workspace Invariant.

- **Rulebook № R3-02 · Source: listing.md §2 C.2**

#### C.2 Runtime Filesystem Isolation
- **Origin:** Must-follow, §3.
- **Literal Statement:** *"Runtime isolation absolute: inter-tier communication via API/network/WSS only, zero runtime filesystem coupling; build-time sharing inside `project/` allowed."*
- **Plain-English Meaning:** When services run in production or containers, the frontend, backend, and database cannot read or write to each other's disk (no `fs.readFile('../../api/...')`). They talk exclusively via network protocols. At build time, however, sharing TypeScript definitions or Rust crates inside `project/` is permitted.
- **Rationale:** Ensures services can be deployed into independent containers across different physical machines without hidden local filesystem dependencies.
- **Classification:** Container & Security Invariant.

- **Rulebook № R3-03 · Source: listing.md §2 C.3**

#### C.3 Execution Directory Rules
- **Origin:** Must-follow, §3.
- **Literal Statement:** *"Commands execute from the owning directory (`./project/` or its component subdirectories); never pollute root... Execution Context [CRITICAL]: quality commands and native toolchains run with CWD set inside `./project/` or its component subdirectories (`./project/web/`, `./project/api/`, `./project/db/`). Orchestrator deployments and submodule pointer commits execute from root `./`."*
- **Plain-English Meaning:** Strict directory separation must be observed during command execution:
  - Component toolchain commands (formatting, linting, tests, builds like `bun test`, `cargo build`, `npm run lint`) must have their working directory (CWD) set inside `./project/` or the specific component folder (`./project/web/`, `./project/api/`, `./project/db/`). Never run these from root or pollute root with `node_modules/` or `target/`.
  - Conversely, container deployments, orchestrator Docker builds, and Git submodule pointer commits must be executed from the orchestrator root (`./`).
- **Rationale:** Keeps the orchestrator repository completely clean, isolates artifact caches, and prevents path resolution errors.
- **Classification:** Workflow Hygiene & Execution Invariant.

- **Rulebook № R3-04 · Source: listing.md §2 C.4**

#### C.4 Submodule Pointer Synchronization
- **Origin:** Must-follow, §12.
- **Literal Statement:** *"Commits inside the submodule MUST be immediately followed by committing the updated pointer in the orchestrator root (`git add project && git commit`); task incomplete if `git submodule status` contains `+` (stale) or `-` (uninitialized)."*
- **Plain-English Meaning:** Git submodules record a commit hash in the parent repo. Whenever you create a commit inside `./project/`, you must immediately go to the root workspace and run `git add project && git commit` to advance the submodule pointer. A task cannot be marked done if `git submodule status` indicates a pointer mismatch.
- **Rationale:** Prevents "detached HEAD" bugs, CI build failures, and broken checkouts for other developers.
- **Classification:** Git Workflow Invariant.
- **Redundancy:** High. Defined in Must-follow and repeated in §12.

- **Rulebook № R3-05 · Source: listing.md §2 C.5**

#### C.5 Secure Default-Deny `.gitignore`
- **Origin:** Must-follow, §12.
- **Literal Statement:** *"Default-deny (block `*`, allowlist source) in root AND EACH submodule... submodule's default-deny `/*` `.gitignore` MUST explicitly allow `!/.github/` and `!/wiki/` (plus `!/.gitignore` + source dirs) so `project/.github/workflows/quality.yml` / `project/wiki/index.md` are not silently ignored."*
- **Plain-English Meaning:** Instead of a traditional `.gitignore` that ignores specific folders like `node_modules/`, the repository ignores *everything by default* (`/*`) and explicitly un-ignores (allowlists) recognized paths. Crucially, the submodule's `.gitignore` must explicitly un-ignore `!/.github/`, `!/wiki/`, `!/.gitignore`, and the component source directories (`!/web/`, `!/api/`, `!/db/`).
- **Rationale:** Guarantees that accidental files, secrets, `.env` files, build binaries, or temp logs can never be accidentally committed while ensuring workflows, documentation, and the gitignore file itself are not silently dropped.
- **Classification:** Security Invariant.

- **Rulebook № R3-06 · Source: listing.md §2 C.6**

#### C.6 Internal Service Networking (Isolated Bridge Networks)
- **Origin:** §3.
- **Literal Statement:** *"Internal Service Networking [CRITICAL]: inter-container communication (e.g., API <-> PostgreSQL) MUST resolve strictly over isolated internal Docker/Dokku networks via local container aliases; routing inter-tier traffic through public domains, load balancers, or WAN ingress is strictly forbidden."*
- **Plain-English Meaning:** Microservices, databases, and compute workers running inside Docker or Dokku must communicate only over private, internal container networks using local container names (such as `http://api:3000` or `postgres://db:5432`). Never route internal traffic out through public internet domains, external reverse proxies, or WAN load balancers.
- **Rationale:** Protects internal traffic from eavesdropping, eliminates external latency, and avoids WAN bandwidth costs and unnecessary SSL handshakes.
- **Classification:** Infrastructure & Security Invariant.

- **Rulebook № R3-07 · Source: listing.md §2 C.7**

#### C.7 Dokku Application & Domain Naming
- **Origin:** §3.
- **Literal Statement:** *"Dokku apps: alphanumeric with hyphens matching the project name (never use dots in app names); public dotted domains (e.g., `https://<project>.<module>.example.com` or `https://<module>.<project>.example.com`) configured via the deploy platform's domain settings."*
- **Plain-English Meaning:** When naming applications in Dokku, use only lowercase letters, numbers, and hyphens (e.g., `my-service`). Never include dots (`.`) in the app name itself. If the app needs a public domain with subdomains (e.g., `https://<project>.<module>.example.com` or `https://<module>.<project>.example.com`), configure this via `dokku domains:set` or the platform's domain manager, not in the internal app name.
- **Rationale:** Dokku and Nginx generate invalid virtual host configurations and internal container routing errors when dots are present in app names.
- **Classification:** Infrastructure-Specific (Dokku).

- **Rulebook № R3-08 · Source: listing.md §2 C.8**

#### C.8 Module Scaffolding Sequence
- **Origin:** §12.
- **Literal Statement:** *"Module scaffolding [CRITICAL]: new project → create the private orchestrator root `./<project>-workspace/` (private remote) → `git init` inside `./project/` → remote → `git submodule add <project-remote> project` to the parent orchestrator → `mkdir -p project/.github/workflows project/scripts` + components `web/`, `api/`, `db/`."*
- **Plain-English Meaning:** When creating a new project from scratch, follow a strict, standardized sequence:
  1. Create the outer private orchestrator repository `./<project>-workspace/`.
  2. Create an inner folder `./project/`, run `git init`, and set its remote.
  3. Register the submodule in the parent via `git submodule add <remote> project`.
  4. Scaffold the directories: `project/.github/workflows/quality.yml`, `project/scripts/check.sh`, and the three component folders `web/`, `api/`, and `db/`.
- **Rationale:** Guarantees uniform structure across all studio projects and ensures quality pipelines and check scripts are wired up immediately.
- **Classification:** Workspace Scaffolding Invariant.

---

### Category D: Database & Schema Ownership

Directives governing PostgreSQL, migrations, and schema changes.

- **Rulebook № R3-09 · Source: listing.md §2 B.3**

#### B.3 Hub-and-Spoke Topology with Stateless Workers
- **Origin:** Must-follow, §3.
- **Literal Statement:** *"Axum/Tokio on Rust in `project/api/` is sole state coordinator via SQLx... workers are disposable and stateless; hub-and-spoke only (coordinator <-> workers), no emergent peer-to-peer meshes. Compute workers → pooled connections or queue/API/RPC."*
- **Plain-English Meaning:** The central API server is the single source of truth and state coordinator. Background workers do not communicate with each other peer-to-peer; they communicate only with the central coordinator or queue. Workers are completely disposable and stateless, connecting to data stores strictly via pooled SQLx database connections or coordinating asynchronously through queues, API endpoints, or RPC. Workers can be killed and restarted at any time without data loss.
- **Rationale:** Prevents race conditions, distributed consensus deadlocks, and split-brain states.
- **Classification:** Systems Architecture (partially coupled to Rust/Axum).

- **Rulebook № R3-10 · Source: listing.md §2 B.8**

#### B.8 Absolute Workspace Prohibitions
- **Origin:** Must-follow.
- **Literal Statement:** *"NEVER commit credentials/`.env` · force-push shared branches · edit `vendor/`/`node_modules/`/generated · inline-disable lint/compiler rules."*
- **Plain-English Meaning:** Four hard prohibitions that must never be violated under any circumstance:
  1. Never commit secrets, tokens, private keys, or `.env` configuration files.
  2. Never force-push (`git push --force`) to shared branches.
  3. Never manually modify third-party vendor directories, `node_modules/`, or auto-generated files.
  4. Never suppress linter or compiler warnings inline (e.g., `// eslint-disable`, `@ts-ignore`, or `#[allow(...)]`). Fix the underlying issue instead of silencing the compiler.
- **Rationale:** Protects security, team collaboration, upstream dependency integrity, and code quality invariants.
- **Classification:** Universal Prohibitions / Zero-Tolerance Safety.

- **Rulebook № R3-11 · Source: listing.md §2 J.1**

#### J.1 Human Ownership of `AGENTS.md` & Balise Regions
- **Origin:** Must-follow, §13.
- **Literal Statement:** *"Learned negatives live in skills as `Contrast`/`Anti-examples`; never autonomously edit `./AGENTS.md` — human-owned only (balise region = tool-owned, remainder human-owned, agents edit neither unprompted)."*
- **Plain-English Meaning:** The `AGENTS.md` file is owned by the human developer. Agents must never autonomously edit or add rules to `AGENTS.md`. Newly learned negative patterns must be added to skills as `Contrast` or `Anti-examples` sections. The balise region (bounded by tool comments at the bottom) is updated solely by installer scripts.
- **Rationale:** Prevents prompt drift, hallucinated rules, and unintended modification of foundational architectural standards.
- **Classification:** Meta-Governance Invariant.
- **Redundancy:** High. Stated in Must-follow line 39 and Section 13 line 194.

## Chapter 4: 4. Systems, State & Data

How the system runs and owns data: async, realtime, schema, determinism.


- **Rulebook № R4-01 · Source: listing.md §2 B.2**

#### B.2 Deterministic State Transitions (Event Sourcing Style)
- **Origin:** Must-follow, §2.
- **Literal Statement:** *"Deterministic state transitions: Domain transitions MUST be pure functions over events (`delta: (State, Event) -> State`) with zero side effects; reading hardware clocks inside transition logic is forbidden."*
- **Plain-English Meaning:** Core business logic must be structured like a pure mathematical function: given the current state and an event, return the new state. It must have zero external side effects (no database queries or network requests inside the reducer), and must never call functions like `Date.now()` or `Instant::now()` directly inside domain logic. Pass timestamps in the event payload instead.
- **Rationale:** Ensures state can be replayed, audited, debugged, and tested deterministically without flakiness.
- **Classification:** Universal Architecture Pattern.

- **Rulebook № R4-02 · Source: listing.md §2 B.4**

#### B.4 Asynchronous Offloading & Non-Blocking Handlers
- **Origin:** Must-follow, §2, §6.
- **Literal Statement:** *"Heavy/async work never blocks request path — queue + worker + streaming."*
- **Plain-English Meaning:** An incoming HTTP or WebSocket request handler must never perform expensive computations, image processing, or heavy database work synchronously. It must accept the request, enqueue a job, return an immediate acknowledgment, and stream progress via WebSockets/SSE or allow polling.
- **Rationale:** Keeps API request latency sub-millisecond and prevents thread-pool starvation.
- **Classification:** Scalability Pattern.
- **Redundancy:** High. Emphasized in Must-follow, §2, and §6.

- **Rulebook № R4-03 · Source: listing.md §2 B.5**

#### B.5 Real-Time Push over Polling
- **Origin:** Must-follow, §4, §6.
- **Literal Statement:** *"Real-time via WebSocket/SSE push; client polling is anti-pattern."*
- **Plain-English Meaning:** Clients should receive live updates via WebSocket connections or Server-Sent Events (SSE). Clients repeatedly querying an endpoint every X seconds (`setInterval(fetch, 2000)`) is forbidden unless strictly designed as an emergency fallback with exponential backoff and request deduplication.
- **Rationale:** Prevents unnecessary database queries, socket connection churn, and redundant network traffic.
- **Classification:** Network & Protocol Architecture.

- **Rulebook № R4-04 · Source: listing.md §2 B.6**

#### B.6 Backpressure & Idempotent Consumption
- **Origin:** Must-follow, §6.
- **Literal Statement:** *"Backpressure explicit: bounded concurrency, caps, rate limits — reject unbounded growth. At-least-once delivery requires idempotent consumption + dedup keys."*
- **Plain-English Meaning:** All queues, memory buffers, and connection pools must have explicit limits (e.g., maximum queue size of 1,000 items). If workers receive duplicate messages (common in distributed systems), consuming the same message twice must not alter the final state (using deduplication IDs).
- **Rationale:** Protects services from running out of memory (OOM crash) during traffic spikes.
- **Classification:** Distributed Systems Invariant.

- **Rulebook № R4-05 · Source: listing.md §2 D.1**

#### D.1 Sole Ownership of Database Schema
- **Origin:** Must-follow, §3, §4.
- **Literal Statement:** *"Axum backend (`project/api/`) owns schema & migrations via SQLx (`project/api/migrations/`). Non-trivial migrations MUST follow 3-phase Expand-Contract... across releases... Compute workers → pooled connections or queue/API/RPC... Port existing Drizzle migrations verbatim to `project/api/migrations/` under `sqlx migrate`."*
- **Plain-English Meaning:** The backend code (`project/api/`) owns the database schema. Web applications and standalone workers must never apply migrations. All migrations are SQL files located in `project/api/migrations/` executed via SQLx. When migrating legacy projects, existing Drizzle ORM migrations must be ported verbatim into SQLx migration files rather than rewritten. Compute workers connect to the database strictly via pooled connections or coordinate through queue/API/RPC, and never own schemas or run migrations.
- **Rationale:** Eliminates migration collisions, dual-writer conflicts, and schema drift while preserving database history.
- **Classification:** Database Architecture.

- **Rulebook № R4-06 · Source: listing.md §2 D.2**

#### D.2 Immutable Migrations
- **Origin:** Must-follow.
- **Literal Statement:** *"Never modify existing migration — append new."*
- **Plain-English Meaning:** Once a database migration file has been merged or deployed, you must never edit its contents. If you need to add a column or fix a typo, create a brand-new migration file that applies the change.
- **Rationale:** Editing an already-executed migration causes checksum mismatches and breaks local developer environments and production deploy scripts.
- **Classification:** Database Invariant.

- **Rulebook № R4-07 · Source: listing.md §2 D.3**

#### D.3 3-Phase Expand-Contract Migration Pattern
- **Origin:** Must-follow, §3.
- **Literal Statement:** *"Non-trivial schema modifications follow 3-phase Expand-Contract (Phase 1: Expand nullable/dual-write → Phase 2: Backfill async → Phase 3: Contract drop legacy) across releases; zero downtime during rolling deploys."*
- **Plain-English Meaning:** When modifying a database column or table without downtime:
  - **Phase 1 (Expand):** Add the new column as nullable or write to both old and new columns. Deploy.
  - **Phase 2 (Backfill):** Run a background script to copy existing data from the old column to the new column.
  - **Phase 3 (Contract):** Update code to read only from the new column, make it non-nullable, and drop the old column in a subsequent release.
- **Rationale:** Ensures zero-downtime deployments; old and new application versions can run simultaneously without breaking queries.
- **Classification:** Zero-Downtime Deployment Pattern.

- **Rulebook № R4-08 · Source: listing.md §2 D.4**

#### D.4 Human Approval for Shared DB Changes
- **Origin:** Must-follow.
- **Literal Statement:** *"ASK FIRST: shared-env schema migrations · deletions outside task scope."*
- **Plain-English Meaning:** The agent must pause and ask the human user for explicit confirmation before running migrations on staging/production databases or deleting any files/tables outside the immediate task.
- **Rationale:** Prevents accidental data loss and service downtime.
- **Classification:** Safety Guardrail.

---

### Category E: Studio Tech Stack Preferences (Guidance vs. Mandate)

Directives describing the studio's preferred technology choices. Note that Section 4 explicitly prefixes this as: *"guidance, not obligation. Deviate when the project justifies it... preferred ≠ required/forced."*

## Chapter 5: 5. Security & Resilience

Trust nothing, leak nothing, halt on invalid state.


- **Rulebook № R5-01 · Source: listing.md §2 B.12**

#### B.12 Security Baseline: Zero Trust, Least Privilege & Input Sanitization
- **Origin:** §5.
- **Literal Statement:** *"Security: GDPR/RGPD. Zero Trust. Least Privilege. Sanitize inputs."*
- **Plain-English Meaning:** Systems must maintain a Zero Trust security posture across all boundaries. Enforce Least Privilege on all access controls, database user roles, API credentials, and container capabilities. All incoming data across system I/O boundaries must be sanitized and validated before passing to internal handlers.
- **Rationale:** Mitigates injection attacks, lateral movement during security breaches, and accidental exposure of sensitive tenant data.
- **Classification:** Universal Security Invariant.

---

### Category C: Workspace Topology, Git & Submodules

Directives defining how repositories are laid out, how submodules are tracked, and how filesystem boundaries are maintained.

## Chapter 6: 6. Workflow & Execution

How work flows: explore, plan, mutate, verify, reflect.


- **Rulebook № R6-01 · Source: listing.md §2 I.4**

#### I.4 Exploration & Discovery Stance (Explore Mode)
- **Origin:** Must-follow, §9.
- **Literal Statement:** *"Constraint [CRITICAL]: vague requirements → Explore Mode. Strictly ZERO code-writing. Action: visualize via ASCII diagrams. Ground in codebase files. Grounding: root analysis via available code-intelligence tooling (if present) or symbol search/git. No vacuum theorizing → surface hidden complexity. Capture: decisions/shifts → OKF ADRs (`type: Architecture Decision Record`, `status: stable`) || Skill Updates → refresh the local knowledge index (if available). Purge transient thoughts."*
- **Plain-English Meaning:** When presented with ambiguous, speculative, or high-level requirements, the agent must enter Explore Mode:
  - **Strict zero code-writing:** Do not modify or create application source code files.
  - **Visualize:** Explain architectural concepts and workflows using ASCII diagrams.
  - **Ground:** Trace symbols, callers, and dependencies in the real codebase using search tools or MCP code intelligence rather than speculating.
  - **Capture:** Record architectural decisions and findings as permanent OKF Architecture Decision Records (ADRs) with explicit frontmatter (`type: Architecture Decision Record`, `status: stable`) or skill updates, and refresh the local knowledge index (if available), discarding temporary conversational thoughts.
- **Rationale:** Prevents hallucinated architectures, prevents premature coding on unconfirmed requirements, and surfaces hidden complexity early.
- **Classification:** Operational Discipline & Safety Guardrail.
- **Redundancy:** High. Defined in Must-follow line 33 and Section 9 line 150.

- **Rulebook № R6-02 · Source: listing.md §2 J.4**

#### J.4 Planning & Execution Workflow (Pre-Computation & Vibe Coding Loop)
- **Origin:** §10.
- **Literal Statement:** *"Pre-computation: feature request || exploration crystallized → strategy (Why, How, Steps) as dense bullets/JSON BEFORE mutation. Output to user chat → shared understanding. Momentum threshold: reasonable decisions autonomously; HALT+prompt ONLY on critical domain ambiguity. Vibe coding loop: focused mutation → validate locally immediately → verify step → proceed. No YOLO."*
- **Plain-English Meaning:**
  - **Pre-computation:** Before making any code mutations, the agent must formulate a concise plan stating Why, How, and exact Steps as dense bullet points or JSON and output it to the user.
  - **Momentum Threshold:** The agent must make reasonable implementation choices autonomously without stalling, pausing to ask the user *only* when faced with critical domain ambiguity or irreversible changes.
  - **Vibe Coding Loop:** Work in tightly scoped, incremental loops: apply a surgical mutation, immediately validate it locally using native toolchains, verify the result, and only then proceed. Never guess or write unchecked code ("No YOLO").
- **Rationale:** Ensures transparency, catches logic errors before mutations cascade, and maintains high development velocity.
- **Classification:** Workflow & Planning Invariant.

- **Rulebook № R6-03 · Source: listing.md §2 J.5**

#### J.5 Mutation Topological Sort
- **Origin:** §10.
- **Literal Statement:** *"Mutation topological sort [CRITICAL]: cross-module scaffolding in strict order: 0) Grounding & Discovery (inspect host MCP tools, verify framework docs... assess blast radius) 1) DB schema → database + access layer (migrations directory, expand-contract phased) 2) Compute & backend coordinator 3) Full-stack state & route handlers 4) UI & graphics views. Never build UI before data contracts."*
- **Plain-English Meaning:** Cross-module features must be implemented in a strict topological dependency order:
  - **Phase 0 (Grounding):** Discover active MCP tools, verify third-party framework docs, and assess blast radius.
  - **Phase 1 (Database):** Apply database schema changes and SQLx migrations first.
  - **Phase 2 (Compute & Backend):** Implement Rust backend coordinator, state logic, and compute workers.
  - **Phase 3 (State & Routes):** Implement API endpoints, WebSocket streams, and route handlers.
  - **Phase 4 (UI & Views):** Build frontend views, client components, and graphics presentation layers last.
  - **Hard Invariant:** Never build frontend UI components before database schema and API contracts exist.
- **Rationale:** Eliminates contract mismatches, prevents UI mock rework, and ensures data models drive interface design.
- **Classification:** Architectural Scaffolding Invariant.

- **Rulebook № R6-04 · Source: listing.md §2 J.6**

#### J.6 Self-Healing vs. Halt (One-Autonomous-Fix Rule)
- **Origin:** §10.
- **Literal Statement:** *"Self-healing vs halt [CRITICAL]: compile/type error → read diagnostic → ONE autonomous fix → recompile."*
- **Plain-English Meaning:** If a compiler, linter, or test fails, the agent must read the diagnostic output carefully and make exactly ONE autonomous attempt to fix the error and recompile. If the fix fails or a new error appears, the agent must halt and report the diagnostic to the user rather than entering an unassisted loop of blind fixes.
- **Rationale:** Prevents catastrophic code thrashing, hallucination cascades, and wasted token cycles on stubborn compiler errors.
- **Classification:** Operational Safety Invariant.

- **Rulebook № R6-05 · Source: listing.md §2 J.13**

#### J.13 Contextual Baseline Ingestion
- **Origin:** §10.
- **Literal Statement:** *"Contextual baseline: ingest project docs/ADRs/context files (accelerated by available local tooling when present) / upstream event sources (webhook/SSE availability) → explicit baseline."*
- **Plain-English Meaning:** Before beginning mutations on any task, establish an explicit baseline by thoroughly reading relevant project documentation, ADRs, and context files (accelerated with host tools/MCP when present), and verify upstream event sources (webhook/SSE endpoints). Never start writing code in a vacuum without establishing this contextual baseline.
- **Rationale:** Eliminates vacuum theorizing, prevents re-architecting already-solved problems, and grounds implementation in real project contracts.
- **Classification:** Workflow & Grounding Invariant.

---

## Chapter 7: 7. Quality Gates & Testing

Done means proven: tiers, lanes, tests, audits, checklists.


- **Rulebook № R7-01 · Source: listing.md §2 B.1**

#### B.1 File Size Density Tiers
- **Origin:** Must-follow, §2, §10.
- **Literal Statement:** *"File size tiers: target ≤150 LOC (atomic/leaf), standard ≤300 LOC (cohesive domain), 300–500 LOC upper boundary (complex state machines only; raises latency/tokens); hard ceiling 500 LOC (failure-prone). Files >500 LOC: finish objective → flag ADR-tracked decomposition. Never refactor mid-task."*
- **Plain-English Meaning:**
  - **≤150 lines:** Target size for single-purpose utility files and simple components.
  - **≤300 lines:** Normal size for standard domain modules.
  - **300–500 lines:** Allowed only for complicated state machines or reducers.
  - **>500 lines:** Strictly prohibited for new files. If an existing file exceeds 500 lines, the agent must finish its immediate task without starting an unexpected refactor, and instead log an Architecture Decision Record (ADR) recommending future file splitting.
- **Rationale:** Large files degrade LLM comprehension (the "lost-in-the-middle" problem), cause search-and-replace diff truncations, and increase latency.
- **Classification:** Code Quality / Token Engineering.
- **Redundancy:** High. Stated verbatim in Must-follow, detailed in §2, and enforced in the §10 pre-response audit checklist.

- **Rulebook № R7-02 · Source: listing.md §2 F.1**

#### F.1 Definition of Task Done (Native Lane Exit 0)
- **Origin:** Must-follow, §12.
- **Literal Statement:** *"Task complete ONLY when touched module's native lane (format → lint → test → build) exits 0."*
- **Plain-English Meaning:** An agent cannot declare a task finished just because code was written. It must execute the project's native toolchain in order: code formatting, static linting, unit tests, and production compilation. Every step must return exit code 0.
- **Rationale:** Prevents broken code, formatting discrepancies, and syntax errors from entering the branch.
- **Classification:** Core Quality Gate.
- **Redundancy:** High. Repeated across Must-follow, §10, and §12.

- **Rulebook № R7-03 · Source: listing.md §2 F.2**

#### F.2 The Canonical 6-Slot Check Gate (`check.sh`)
- **Origin:** §8, §12.
- **Literal Statement:** *"Check script maintenance [CRITICAL]: orchestrator root MUST maintain an executable `./scripts/check.sh` (Pointers, Secrets) delegating to the submodule's single `./project/scripts/check.sh` — the canonical 6-slot contract (Pointers, Secrets, Native Lanes matrix over `web`/`api`/`db`, Tracked Assets, Clean-Clone Sandbox, Smoke) with `--quick` (sub-10s iteration exiting before sandbox)... asserts compile-time asset tracking (`git ls-files --error-unmatch`), honors `--quick`, and verifies committed buildability via hermetic clean clone (`mktemp -d` + `git clone .`). No project names in rule body."*
- **Plain-English Meaning:** The project maintains an executable check script harness with strict division of responsibility:
  1. **Root Script (`./scripts/check.sh`):** Validates outer workspace integrity (Slot 1: Submodule Pointers, Slot 2: Secrets), then immediately delegates execution to `./project/scripts/check.sh`.
  2. **Submodule Script (`./project/scripts/check.sh`):** Executes the full canonical 6-slot gate matrix across all components (`web/`, `api/`, `db/`):
     - **Slot 1 (Pointers):** Submodule pointer is clean and synchronized.
     - **Slot 2 (Secrets):** Scans for uncommitted credentials, keys, or `.env` patterns.
     - **Slot 3 (Native Lanes):** Runs the full native matrix (format → lint → test → build) for each component.
     - **Slot 4 (Tracked Assets):** Asserts compile-time asset tracking (`git ls-files --error-unmatch`).
     - **Slot 5 (Clean-Clone Sandbox):** Hermetically clones the repository into a temporary directory (`mktemp -d` + `git clone .`) and verifies buildability from committed files alone.
     - **Slot 6 (Smoke):** Executes quick launch smoke testing.
  - **Fast Iteration (`--quick`):** Passing `--quick` enables sub-10 second iterative developer loops by exiting before the clean-clone sandbox and smoke stages.
  - **Portability Invariant:** Check scripts must contain no project-specific names hardcoded in rule bodies.
- **Rationale:** Guarantees that code not only builds on the developer's local machine with untracked artifacts, but will compile and test flawlessly on a fresh CI runner.
- **Classification:** Verification Harness & Quality Gate.

- **Rulebook № R7-04 · Source: listing.md §2 F.3**

#### F.3 Two-Layer Test Design Matrix
- **Origin:** §11.
- **Literal Statement:** *"Test design matrix (two-layer, proactive): Layer 1 systematic coverage — cover every exclusion/branch, empty/null, bounds/cap, permission gate in spec scenarios (spec IS checklist). Layer 2 autonomous adversarial & property invariants — invent fixtures asserting algebraic invariants for domain logic (round-trip serialization `deserialize(serialize(x)) == x`, idempotency `f(f(x)) == f(x)`, balance conservation); test non-sorted orderings, type-coerced inputs, and stale IDs. Fixture rule: never only sorted/happy-path for ordering-sensitive code."*
- **Plain-English Meaning:** Tests must never rely solely on naive happy-path assertions:
  - **Layer 1 (Systematic Boundary Coverage):** Treat the specification as an exhaustive checklist. Explicitly write tests for every branch, empty collection, null/undefined, upper/lower numerical bound, and permission denial gate.
  - **Layer 2 (Adversarial Property Invariants):** Proactively invent fixtures asserting mathematical and algebraic invariants:
    - Serialization round-trip: `deserialize(serialize(x)) == x`.
    - Idempotency: `f(f(x)) == f(x)` (applying an operation twice yields the same state).
    - Conservation laws: financial balances, inventory counts, or resource tokens cannot vanish or inflate.
    - Adversarial fixtures: test reverse-sorted inputs, corrupted/coerced types, and stale IDs. Never feed only pre-sorted data to code that relies on ordering.
- **Rationale:** Catches subtle logic bugs, state corruption, and edge-case panics before code hits staging.
- **Classification:** Testing Methodology & Quality Gate.

- **Rulebook № R7-05 · Source: listing.md §2 F.4**

#### F.4 Pre-Response Self-Audit Checklist
- **Origin:** §10.
- **Literal Statement:** *"Pre-response self-audit: before completion, verify: [ ] LOC density tiers respected (≤150/≤300, 300–500 state machines only, hard ceiling 500)? [ ] `../` traversals eliminated? [ ] delta-merging used? [ ] local compiler/linter ran? [ ] `git submodule status` no `+`/`-`? [ ] `./scripts/check.sh` ran and exited 0 (open `check` skill for gate diagnostics)? Any fail → correct autonomously before reply. Then report `[Implementing]` → `[Paused/Blocked]` → `[Completed: Added X, Modified Y, Removed Z]`."*
- **Plain-English Meaning:** Before the agent finishes its response, it must run an internal six-step self-audit checklist:
  1. Are all touched files within density tiers (≤150 / ≤300 / ≤500)?
  2. Are all forbidden `../` directory traversals eliminated?
  3. Were search/replace delta edits used instead of whole-file rewrites?
  4. Did the local native compiler and linter run?
  5. Is `git submodule status` free of `+` (stale pointer) and `-` (uninitialized)?
  6. Did `./scripts/check.sh` exit with status 0?
  If any check fails, the agent must autonomously fix the issue before replying. Once verified, report progress using the exact status lifecycle: `[Implementing]` → `[Paused/Blocked]` → `[Completed: Added X, Modified Y, Removed Z]`.
- **Rationale:** Forces the LLM to verify and validate its own work before declaring success.
- **Classification:** Agent Verification Process.

- **Rulebook № R7-06 · Source: listing.md §2 F.5**

#### F.5 Push Gate Mechanics (Blocking vs. Advisory Lanes)
- **Origin:** §12.
- **Literal Statement:** *"Push gate [CRITICAL] — one lane per touched submodule (`project/`: format → lint → test → build across its component lanes...): Blocking (exit 1): per touched submodule run native codegen (if exists) → lint → tests → hermetic/static build in builder image → secret-leak scan (new dirs/`*.env` patterns, `git submodule status | grep "^-"`) → submodule-pointer freshness (`git submodule status | grep "^\+"`). Any failure → `exit 1` with failing command. No project names in rule body. Fails pre-push ~15s, not remote. Advisory (exit 0): semantic diff output (if available) or `git diff --stat` + manifest version + `CHANGELOG.md` presence. Inform, never block."*
- **Plain-English Meaning:** Pre-push gates are split strictly into two tiers:
  - **Blocking (Exit 1):** Fast local checks designed to fail within ~15 seconds on the developer's machine:
    1. Native codegen (e.g., `ts-rs`, Protocol Buffers, SQLx prepare) if configured.
    2. Native linting across touched submodules and components.
    3. Automated test execution.
    4. Hermetic/static build in the builder image.
    5. Secret-leak scan for uncommitted directories and `*.env` patterns.
    6. Uninitialized submodule scan via `git submodule status | grep "^-"` (failing if any submodule is uninitialized).
    7. Submodule pointer freshness scan via `git submodule status | grep "^\+"` (failing if parent has uncommitted submodule drift).
    - If any check fails, immediately halt with exit code 1 and display the exact failing command.
    - Rule bodies and check scripts must contain zero hardcoded project names for absolute portability.
  - **Advisory (Exit 0):** Informational checks such as semantic diff output, `git diff --stat`, package manifest version bumps, and checking for `./project/CHANGELOG.md` presence. These emit warnings to inform the developer, but never block the push.
- **Rationale:** Detects regressions in seconds locally before pushing to CI, saving CI minutes and preventing broken branches.
- **Classification:** Core Quality Gate & Pre-Push Workflow.

- **Rulebook № R7-07 · Source: listing.md §2 F.6**

#### F.6 Compile-Time Asset Tracking & Check Script Maintenance
- **Origin:** §12.
- **Literal Statement:** *"Check script maintenance [CRITICAL]: orchestrator root MUST maintain an executable `./scripts/check.sh`... delegating to the submodule's single `./project/scripts/check.sh`... asserts compile-time asset tracking (`git ls-files --error-unmatch`), honors `--quick`, and verifies committed buildability via hermetic clean clone... Agents MUST update check scripts whenever manifests, dependencies, or compile-time assets change."*
- **Plain-English Meaning:**
  - Files generated offline for compile-time checking (such as `sqlx-data.json`) must be checked into Git. The check script asserts this using `git ls-files --error-unmatch <file>`, which errors if the file is untracked or gitignored.
  - Whenever dependencies, manifests, or build scripts change, the agent is responsible for updating `./project/scripts/check.sh` and `./scripts/check.sh` to match.
- **Rationale:** Prevents "works on my machine" failures in CI where builds fail because required metadata files were omitted from Git commits.
- **Classification:** Verification Harness Maintenance.

---

### Category G: CI/CD, Containerization & Infrastructure

Directives governing GitHub Actions, Docker builds, and hosting platforms (Dokku).

## Chapter 8: 8. Delivery & Infrastructure

Shipping: CI split, containers, deploy targets, access.


- **Rulebook № R8-01 · Source: listing.md §2 G.1**

#### G.1 CI/CD Workflow Separation
- **Origin:** Must-follow, §3, §12.
- **Literal Statement:** *"Submodule `./project/.github/workflows/quality.yml` manages component quality gates (`web/`, `api/`, `db/`) running the stack's native lane in order: format → lint → test → build. Orchestrator `./.github/workflows/deploy.yml` is the single deployment pipeline (unified multi-stage container build → minimal runtime + `SUBMODULE_TOKEN` + path-filtered triggers + proxy tuning), orchestrating a multi-container topology (app runtime + PostgreSQL service/container on an internal private network). Never build/push the submodule from the orchestrator quality lane."*
- **Plain-English Meaning:**
  - The submodule manages testing and linting inside its own `.github/workflows/quality.yml`, running native toolchains in order: format → lint → test → build across `web/`, `api/`, and `db/`.
  - The root orchestrator repository manages container compilation and Dokku server deployment inside its own `.github/workflows/deploy.yml`. It orchestrates a multi-container topology consisting of the minimal application runtime container alongside an internal PostgreSQL service container running on an isolated private network.
  - Do not mix testing and deployment pipelines across the boundary: never build or push the submodule from the orchestrator quality lane.
- **Rationale:** Keeps application CI fast, decoupled from production deployment credentials, and ensures clean isolation between component quality gates and production container deployments.
- **Classification:** DevOps Invariant.
- **Redundancy:** High. Stated in Must-follow, §3, and §12.

- **Rulebook № R8-02 · Source: listing.md §2 G.2**

#### G.2 Multi-Arch Builds: Native Runner Matrix over QEMU
- **Origin:** Must-follow, §4, §12.
- **Literal Statement:** *"Multi-arch builds MUST use parallel native matrix (`ubuntu-26.04` + `ubuntu-26.04-arm`) via `docker buildx imagetools create` — NEVER QEMU emulation."*
- **Plain-English Meaning:** When building Docker images for both x86 (Intel/AMD) and ARM64, compile each on native hardware runner VMs in parallel. Push each arch by its digest hash, then merge them using `docker buildx imagetools create`. Never use QEMU software emulation to build ARM binaries on an x86 host.
- **Rationale:** QEMU emulation is notoriously slow (up to 10x slower) and frequently crashes during heavy Rust or C++ builds.
- **Classification:** CI/CD Performance Optimization.
- **Redundancy:** High. Stated in Must-follow, §4, and §12.

- **Rulebook № R8-03 · Source: listing.md §2 G.3**

#### G.3 Container Hardening (Distroless Musl & Zero Glibc)
- **Origin:** §4, Must-follow.
- **Literal Statement:** *"Single multi-stage build `Vite static → Rust musl (cargo build --release --target x86_64-unknown-linux-musl) → gcr.io/distroless/static-debian13:nonroot`; nonroot, zero glibc, minimal surface. GHCR image deploys. Strict HTTPS/TLS."*
- **Plain-English Meaning:** Build containers using a multi-stage process: compile frontend static assets, compile the Rust backend statically using `musl` (`cargo build --release --target x86_64-unknown-linux-musl`), and copy the resulting binary into Google's `distroless` Debian static image (`gcr.io/distroless/static-debian13:nonroot`). The container runs as a non-root user, contains no shell, no package manager, zero glibc dependencies, and enforces strict HTTPS/TLS for all external network communication. Images are deployed via GitHub Container Registry (GHCR).
- **Rationale:** Drastically reduces container image size (under 30MB), eliminates attack surfaces (no `/bin/sh` for attackers to exploit), and removes vulnerability to glibc CVEs.
- **Classification:** Security Hardening & Container Invariant.

- **Rulebook № R8-04 · Source: listing.md §2 G.4**

#### G.4 Dokku Deployment Tuning
- **Origin:** Must-follow.
- **Literal Statement:** *"Dokku apps MUST `proxy-read-timeout 3600s` + `proxy-buffering off` + `client-max-body-size 50m` via `proxy:build-config <app>` (modern, not `nginx.conf`)... `appleboy/ssh-action` MUST explicitly specify `port: ${{ secrets.DOKKU_SSH_PORT }}` (or target host daemon port); omitting defaults to port 22 which is blocked on firewalled VPS hosts, causing silent connection timeouts."*
- **Plain-English Meaning:** When deploying to Dokku:
  - Configure the Nginx proxy using Dokku's modern CLI (`dokku proxy:set <app> ...` or `proxy:build-config <app>`), never by manually creating or editing custom `nginx.conf` files.
  - Turn off proxy buffering (`proxy-buffering off`) so WebSocket frames and SSE messages stream instantly.
  - Set proxy read timeout to 3600 seconds (1 hour) to keep streaming connections alive.
  - Allow file uploads up to 50MB (`client-max-body-size 50m`).
  - In GitHub Actions deployment steps using `appleboy/ssh-action`, explicitly set `port: ${{ secrets.DOKKU_SSH_PORT }}`. Defaulting to port 22 causes silent connection timeouts on firewalled cloud VPS servers.
- **Rationale:** Prevents connection timeouts, enables real-time push streaming, and avoids deployment hangs on firewalled VPS hosts.
- **Classification:** Infrastructure-Specific (Dokku).

- **Rulebook № R8-05 · Source: listing.md §2 G.5**

#### G.5 GitHub Actions Token Permissions for Submodules and GHCR
- **Origin:** Must-follow.
- **Literal Statement:** *"Orchestrator `deploy.yml` `actions/checkout@v4` MUST use `token: ${{ secrets.SUBMODULE_TOKEN }}` (`repo` read) + `submodules: recursive` + `fetch-depth: 0`; `docker/login-action` for `ghcr.io` MUST use `password: ${{ secrets.SUBMODULE_TOKEN }}` (`write:packages` scope) because container image namespace (`<project>`) differs from orchestrator repo (`<project>-workspace`); `GITHUB_TOKEN` alone insufficient."*
- **Plain-English Meaning:** Default GitHub Actions `GITHUB_TOKEN` lacks cross-repository access. The deployment pipeline must use a custom Personal Access Token (`secrets.SUBMODULE_TOKEN`):
  - Checkout step requires `token: ${{ secrets.SUBMODULE_TOKEN }}`, `submodules: recursive`, and `fetch-depth: 0` to pull the private `./project/` submodule and complete commit history.
  - Docker GHCR login requires `password: ${{ secrets.SUBMODULE_TOKEN }}` with `write:packages` scope because the container image package is published under the inner project's namespace, not the orchestrator workspace namespace.
- **Rationale:** Prevents authentication and authorization failures during submodule clone and container registry publish steps.
- **Classification:** CI/CD Authentication Invariant.

- **Rulebook № R8-06 · Source: listing.md §2 G.6**

#### G.6 Deploy Path Allowlist
- **Origin:** Must-follow.
- **Literal Statement:** *"Deploy Path Allowlist [CRITICAL]: Orchestrator `deploy.yml` MUST use explicit `paths:` allowlist watching `project/` + `Dockerfile` + `deploy.yml` (not `paths-ignore`); `workflow_dispatch` always allowed."*
- **Plain-English Meaning:** In GitHub Actions, the orchestrator deployment workflow must explicitly define `paths:` containing `project/**`, `Dockerfile`, and `.github/workflows/deploy.yml`. Never use negative pattern filtering (`paths-ignore`). Manual triggers via `workflow_dispatch` must always remain enabled.
- **Rationale:** Prevents costly production deployments and container rebuilds when only orchestrator documentation, READMEs, or scratch files change, while avoiding the blind spots of negative ignores.
- **Classification:** CI/CD Trigger Invariant.

---

### Category H: Telemetry, Observability & Logging

Directives governing log formats, secret masking, and operational visibility.

## Chapter 9: 9. Observability & Logging

What gets emitted, how, and with what redacted.


- **Rulebook № R9-01 · Source: listing.md §2 H.1**

#### H.1 Canonical Wide-Event Logging (2026 SOTA)
- **Origin:** Must-follow, §11.
- **Literal Statement:** *"Canonical Wide-Event Logging [2026 SOTA]: request-handling and worker-job boundaries emit exactly ONE comprehensive, high-cardinality JSON document upon execution completion (bundling route/task, status, duration, tenant, query counts, operational context); deprecate scattered intermediate function-level TRACE/DEBUG log spam. Unhandled errors emit immediately with stack context."*
- **Literal Example Format:**
  ```json
  {"timeUnixNano":"1723723200000000000","severityNumber":5,"severityText":"DEBUG","body":"market catalog fetched","attributes":{"service.name":"market-scan","offers":2346},"traceId":"4bf92f3577b34da6a3ce929d0e0e4736"}
  ```
- **Plain-English Meaning:** Instead of scattering hundreds of intermediate debug print lines throughout your code (`Entering function X`, `Query returned Y`), emit a single rich, high-cardinality JSON document at the completion boundary of an HTTP request or background worker job. This document bundles the route, task, status, total duration, tenant, database query counts, and operational metrics.
  - **Exception for Unhandled Errors:** If an unhandled exception or panic occurs, it must emit immediately with complete stack trace context rather than waiting for normal request boundary completion.
- **Rationale:** Massively simplifies log aggregation, reduces log storage costs, and provides complete queryable context for every request.
- **Classification:** Observability Architecture & SOTA Invariant.

- **Rulebook № R9-02 · Source: listing.md §2 H.2**

#### H.2 Unconditional Secret Redaction
- **Origin:** Must-follow, §11.
- **Literal Statement:** *"Log redaction NEVER gated by verbosity — token/vid/otp/jwt/key/secret stripped at emission, every mode."*
- **Plain-English Meaning:** Sensitive credentials and security tokens must ALWAYS be stripped at emission before writing to console or log sinks, across every logging level and environment. The redaction list is strictly non-negotiable and covers:
  - `token`: Authentication bearer tokens, session tokens, and access tokens.
  - `vid`: Verification IDs, vendor authentication IDs, or visitor tracking identifiers.
  - `otp`: One-time passwords and multi-factor authentication codes.
  - `jwt`: JSON Web Tokens (header/payload/signature).
  - `key`: Private keys, API keys, encryption keys, and cryptographic certificates.
  - `secret`: Passwords, database secrets, webhook secrets, and salts.
  Enabling verbose or debug logging (`VERBOSE=true`) must never bypass or disable this redaction.
- **Rationale:** Prevents credentials from leaking into log servers, third-party analytics, CI logs, or developer consoles.
- **Classification:** High-Priority Security Invariant.
- **Redundancy:** High. Explicitly stated in Must-follow line 20 and Section 11 line 175.

- **Rulebook № R9-03 · Source: listing.md §2 H.3**

#### H.3 Flat OTLP JSONL Structure
- **Origin:** §11.
- **Literal Statement:** *"Telemetry: flat OTLP JSONL log-record (NOT resourceLogs wrapper): `timeUnixNano`, `severityNumber` (TRACE=1 DEBUG=5 INFO=9 WARN=13 ERROR=17 FATAL=21), `severityText`, `body`, `attributes` (incl. `service.name`), `traceId`/`spanId`. Propagate `request_id`. Mask PII/PHI (GDPR strict)."*
- **Plain-English Meaning:** Format telemetry logs as single-line JSON (`.jsonl`) matching the OpenTelemetry log data model, keeping records flat rather than wrapping them in heavy `resourceLogs` arrays:
  - Standard fields: `timeUnixNano` (nanosecond epoch timestamp), `severityNumber` (exact enum: TRACE=1, DEBUG=5, INFO=9, WARN=13, ERROR=17, FATAL=21), `severityText`, `body`, `attributes` (always including `service.name`), `traceId`, and `spanId`.
  - Always propagate `request_id` across asynchronous call chains.
  - Strictly scrub personally identifiable information (PII) and personal health information (PHI) to comply with GDPR/RGPD.
- **Rationale:** Ensures clean, high-performance ingestion into log aggregators (Vector, Loki, Datadog) while maintaining strict legal and privacy compliance.
- **Classification:** Observability Format & Privacy Invariant.

- **Rulebook № R9-04 · Source: listing.md §2 H.4**

#### H.4 Verbose-by-Default Configuration
- **Origin:** Must-follow, §11.
- **Literal Statement:** *"Produced code verbose-by-default: `VERBOSE=0|false` → WARN/13 only; `VERBOSE=1|true` or MISSING → emit wide-events + operational logs (TRACE/1). `LOGS=0|false` → no file sink; `LOGS=1|true` or MISSING → mirror to per-module `<module>.log`. Console always mirrors (gated by VERBOSE). REDACTION NOT GATED BY VERBOSE: token/vid/otp/jwt/key/secret redacted at emission, every setting. Existing modules keep `LOG_LEVEL`; new uses `VERBOSE`/`LOGS`."*
- **Plain-English Meaning:** Logging behavior is explicitly driven by environment variables with verbose defaults:
  - When `VERBOSE` is unset or `true`/`1`, the application emits full operational logs (TRACE) and canonical wide-events.
  - When `VERBOSE=false` or `0`, logging is throttled to warnings and errors only (WARN+).
  - When `LOGS` is unset or `true`/`1`, logs are mirrored to a dedicated file (`<module>.log`).
  - When `LOGS=false` or `0`, file output is disabled.
  - The console stdout always mirrors logs (subject to the `VERBOSE` threshold).
  - Legacy modules may retain `LOG_LEVEL`, but new modules must implement `VERBOSE` and `LOGS`.
  - Never commit configurations or container definitions that set `VERBOSE=false` or `LOGS=false`.
- **Rationale:** Guarantees comprehensive observability out of the box so production incidents can be diagnosed immediately without restarting services with debug flags.
- **Classification:** Configuration & Operational Invariant.
- **Redundancy:** High. Defined in Must-follow line 34 and Section 11 line 175.

---

### Category I: Documentation, Skills & Ecosystem

Directives for knowledge management, Agent Skills, and tool discovery.

## Chapter 10: 10. Docs, Skills & Ecosystem

Knowledge: OKF docs, skill engineering, MCP, guardrails.


- **Rulebook № R10-01 · Source: listing.md §2 I.1**

#### I.1 OKF v0.2 Standard Compliance
- **Origin:** §7.
- **Literal Statement:** *"Documentation & OKF (v0.2) → skill `.agents/skills/okf-docs/`: frontmatter, provenance, README rules. Load before any doc/ADR/wiki. Wiki + `./references/` (READ-ONLY) rules live there."*
- **Plain-English Meaning:** All repository documentation, ADRs, wikis, and design notes must conform to Open Knowledge Format v0.2:
  - Agents must explicitly load `.agents/skills/okf-docs/` before authoring or modifying any documentation, ADR, or wiki page.
  - Every markdown document must contain YAML frontmatter with `okf_version: "0.2"`, `type` (e.g., `SystemDirective`, `Architecture Decision Record`, `Guide`), `title`, `description`, and `status`.
  - Provenance is mandatory using `generated: { by: <actor>, at: <iso-timestamp> }` (actor format: `human:<id>`, `process:<id>`, or `<tool>/<version>`). The legacy `timestamp` field is strictly forbidden.
  - Documentation links must follow progressive disclosure.
- **Rationale:** Treats documentation as structured data, enabling automated linting, indexing, and compliance auditing.
- **Classification:** Documentation Standard.

- **Rulebook № R10-02 · Source: listing.md §2 I.2**

#### I.2 Agent Skills Engineering
- **Origin:** §8.
- **Literal Statement:** *"Skill Engineering (`./.agents/skills/`): Universal skill catalog and progressive disclosure. Utilization [CRITICAL] task initiation → scan `./.agents/skills/` → evaluate `description` frontmatters → load `SKILL.md` if relevant. Creation: extract recurring gotchas/workflows into `skills/<name>/SKILL.md` (action gerund, Validation Loops, Plan-Validate-Execute, `references/` offload for progressive disclosure). Anatomy [CRITICAL] frontmatter per the Agent Skills spec (`name` + `description` required; `license` · `compatibility` · `metadata` · `allowed-tools` optional — OKF provenance `type`/`generated` is for documents, §7), `description` <1024 chars imperative "Use this skill when...". Script bundling: self-contained (single-file script in the project's own runtime — JS/Go/Python, PEP 723 where applicable), idempotent, structured JSON/CSV, ZERO prompts. Ad-hoc spikes [CRITICAL] candid debug scripts / pre-implementation endpoint tests / quick API validation → self-contained `.ts` runnable directly by the project's JS runtime (native top-level await+fetch, zero setup). Eval-driven evolution: generate `evals/evals.json`, measure baseline vs with-skill (pass rate/tokens/duration) → optimize `SKILL.md`."*
- **Plain-English Meaning:** Workflows, troubleshooting playbooks, and specialized recipes are organized as Agent Skills under `./.agents/skills/`:
  - **Utilization:** At task initiation, scan `./.agents/skills/`, evaluate skill `description` frontmatters, and load `SKILL.md` if relevant.
  - **Skill Anatomy & Frontmatter:** Governed by the Agent Skills specification: `name` and `description` are mandatory; optional fields are `license`, `compatibility`, `metadata`, and `allowed-tools`. OKF document provenance (`type`, `generated`) is strictly for documents (§7) and must NOT be added to skill frontmatter. The `description` must be under 1,024 characters and written in the imperative mood ("Use this skill when...").
  - **Workflow Patterns:** Skills must encode reliable patterns such as Validation Loops and Plan-Validate-Execute sequences, offloading heavy documentation to `references/` for progressive disclosure.
  - **Script Bundling:** Helper scripts must be self-contained single-file scripts in the project's native runtime (Node/Bun/TS, Go, Python with PEP 723 metadata where applicable), idempotent, output structured JSON or CSV, and run non-interactively with zero user prompts.
  - **Ad-Hoc Spikes:** Quick API validations or debug tests should be written as self-contained `.ts` files executed directly by the project's JS runtime using native top-level `await` and `fetch`.
  - **Eval-Driven Evolution:** Skills must be benchmarked using `evals/evals.json`, measuring baseline vs. with-skill metrics (pass rate, token consumption, task duration) to iteratively optimize `SKILL.md`.
- **Rationale:** Maintains a compact base context while giving AI agents deep, on-demand domain capabilities with measurable quality.
- **Classification:** Agent Architecture & Tooling Invariant.

- **Rulebook № R10-03 · Source: listing.md §2 I.3**

#### I.3 Host MCP Discovery & Portability Invariant
- **Origin:** Must-follow, §8.
- **Literal Statement:** *"At session start, inspect available host MCP tools; query active tools to ground live environment facts and third-party framework docs before code authoring; degrade gracefully to standard git/grep/docs when absent. Zero external host path dependencies committed to repo... Per-tool guidance lives ONLY in this file's balise sections; do not duplicate per-tool guidance here. Portability Invariant: Directives, check scripts, and CI workflows MUST NOT hardcode external machine paths or fail when optional MCP servers or acceleration tools are not mounted."*
- **Plain-English Meaning:**
  - **Discovery:** At session start, inspect available host Model Context Protocol (MCP) tools and query active tools to ground environment facts and library documentation before writing code.
  - **Graceful Degradation:** If an MCP server is missing or unconfigured, degrade gracefully to standard terminal tools (`git`, `grep`, local markdown files). Never fail a task because an optional MCP tool is absent.
  - **Balise Scoping:** Tool-specific instructions live solely inside the tool-managed balise section at the bottom of `AGENTS.md`; never duplicate tool instructions in the manual rule body.
  - **Portability Invariant:** Directives, check scripts, and CI workflows must never hardcode machine-specific paths (e.g., `/Users/name/...`) or depend on host-specific tools.
- **Rationale:** Maximizes local developer agent productivity while guaranteeing total portability across team machines and automated CI environments.
- **Classification:** Environment Portability & Discovery Invariant.
- **Redundancy:** High. Defined across Must-follow lines 48, §8 lines 145–146, and §10 line 159.

- **Rulebook № R10-04 · Source: listing.md §2 I.5**

#### I.5 Mandatory `guardrails` Skill Invocation
- **Origin:** Must-follow.
- **Literal Statement:** *"Must-read: `.agents/skills/guardrails/SKILL.md` before any code touching `deps/Docker/HTML/auth` — cross-cutting hardening lives there, not in `AGENTS.md` body."*
- **Plain-English Meaning:** Before writing, modifying, or reviewing any code that affects package dependencies, Dockerfiles, HTML generation, authentication, authorization, or secret handling, the agent must explicitly read and follow the instructions in `.agents/skills/guardrails/SKILL.md`.
- **Rationale:** Centralizes critical security hardening rules, vulnerability mitigations, and supply-chain protections in a specialized skill rather than bloating the general system prompt.
- **Classification:** High-Priority Security Guardrail.

- **Rulebook № R10-05 · Source: listing.md §2 I.6**

#### I.6 Promotional README Showcase & Read-Only Reference Integrity
- **Origin:** §7, `okf-docs`.
- **Literal Statement:** *"README = promotional showcase for everyday users — zero technical blocks... Never ingest-write into `./references/` — index or inspect, never modify."*
- **Plain-English Meaning:**
  - The repository root `README.md` is strictly an outward-facing promotional showcase aimed at non-technical users and stakeholders. It must contain zero terminal commands, debug dumps, or technical setup blocks. Detailed engineering documentation belongs in `wiki/` or ADRs.
  - The `./references/` folder contains immutable reference material. Agents may read, index, or cite documents in `./references/`, but must never edit or write new files into that directory.
- **Rationale:** Maintains clean public presentation for end users while preserving immutable reference documents as untainted ground truth.
- **Classification:** Documentation Integrity Invariant.

- **Rulebook № R10-06 · Source: listing.md §2 I.7**

#### I.7 Mandatory `scalability` Skill Invocation for Background & Real-Time Flow
- **Origin:** Must-follow, §6, §6a.
- **Literal Statement:** *"**Scalability doctrine** (skill `.agents/skills/scalability/SKILL.md`): queue+worker+streaming, worker contracts, LISTEN/NOTIFY + WebSocket/SSE push, polling = fallback only (single-flight+timeout+dedup), anti-patterns. Designing background work or live state flow? Load the `scalability` skill — the Must-follow rules (incl. the two promoted lines above) still bind."*
- **Plain-English Meaning:** Before designing or implementing any asynchronous background workloads, queue/worker interactions, PostgreSQL LISTEN/NOTIFY publishers/subscribers, WebSocket or SSE streams, or client polling fallbacks, the agent must explicitly load and consult `.agents/skills/scalability/SKILL.md`. The core invariants promoted to the Must-follow rules (queue+worker+streaming, push over polling, bounded backpressure, and idempotent consumption) remain strictly binding.
- **Rationale:** Centralizes distributed systems patterns, worker contracts, and anti-pattern checklists in a dedicated skill, keeping core rule prompts lean while ensuring robust concurrency designs.
- **Classification:** Architectural Guardrail & Skill Invocation.

- **Rulebook № R10-07 · Source: listing.md §2 I.8**

#### I.8 Mandatory `graphics-simulation` Skill Invocation & Granularity Matrix
- **Origin:** §4.
- **Literal Statement:** *"**Graphics, simulation & native shells** (skill `.agents/skills/graphics-simulation/`): granularity matrix for DOM/ECS/2D/3D/headless-ML selection + Telegram/TMA and Tauri shell rules — load when building visual scenes, games, or desktop/mobile shells."*
- **Plain-English Meaning:** When building visual interfaces, interactive simulations, games, Telegram Mini Apps (TMA), or desktop/mobile native shells (Tauri v2), the agent must load `.agents/skills/graphics-simulation/`. It must consult the presentation granularity matrix to choose the appropriate presentation layer:
  - Standard DOM / SvelteKit components for standard forms, data tables, and UI shells.
  - Miniplex ECS for complex entity lifecycles and zero-allocation frame queries (`world.with(...)`).
  - PixiJS for 2D rendering with high entity counts (>1,000 nodes).
  - Phaser for turnkey 2D game loops requiring arcade physics, audio, and tilemaps.
  - Threlte (Three.js) or Babylon.js (WebGPU/Havok) for 3D spatial scenes.
  - Headless Rust workers (Axum+Rayon+Candle) for heavy CPU/ML simulation.
- **Rationale:** Prevents inappropriate presentation tech selection (such as forcing CSS layouts for games or heavy 3D WebGL for simple dashboards) and ensures frame-rate performance invariants (60+ FPS).
- **Classification:** Specialized Presentation Guardrail & Skill Invocation.

- **Rulebook № R10-08 · Source: listing.md §2 I.9**

#### I.9 Mandatory `check` Skill Consultation for Gate Harness & Diagnostics
- **Origin:** §8, §12.
- **Literal Statement:** *"Native Toolchain & Check Gate (`project/scripts/check.sh`, delegated from root `./scripts/check.sh`)... Consult `.agents/skills/check/SKILL.md` for the 6-slot gate harness (pointers, secrets, native lanes, tracked compile-time assets, clean-clone sandbox, smoke)... Agents MUST update check scripts whenever manifests, dependencies, or compile-time assets change. Consult `check` skill for anatomy and diagnostic procedures."*
- **Plain-English Meaning:** Whenever diagnosing check script failures, modifying project dependency manifests, adding compile-time assets, or maintaining the `./scripts/check.sh` and `./project/scripts/check.sh` harness, the agent must consult `.agents/skills/check/SKILL.md`. The skill provides the canonical anatomy of the 6-slot gate, error diagnosis trees, and isolation techniques.
- **Rationale:** Prevents ad-hoc, broken check script modifications and gives agents a standardized playbook for resolving pre-push and sandbox verification errors.
- **Classification:** Verification Harness & Skill Consultation.

---

### Category J: Governance, Maintenance & Meta-Rules

Directives governing how `AGENTS.md` itself is managed, task execution planning, and quality lifecycles.

## Chapter 11: 11. Governance & Meta-Rules

Rules about rules: ownership, versioning, evolution, cold-agent checks.


- **Rulebook № R11-01 · Source: listing.md §2 J.3**

#### J.3 Cold-Agent Verification Test
- **Origin:** §13.
- **Literal Statement:** *"Verify with cold-agent test: reads section once, obeys without questions."*
- **Plain-English Meaning:** When authoring or revising rules, benchmark them using a fresh "cold" AI agent that has no prior conversational context. If the cold agent reads the rule once and executes it flawlessly without asking clarifying questions, the rule is sufficiently clear and unambiguous.
- **Rationale:** Provides an objective, reproducible quality metric for prompt engineering and directive clarity.
- **Classification:** Directive Evaluation Benchmark.

- **Rulebook № R11-02 · Source: listing.md §2 J.7**

#### J.7 Post-Task Reflection Trigger (`Want /openspec-report?`)
- **Origin:** Must-follow.
- **Literal Statement:** *"After tasks with difficulty ≥3/5, surprise, or time cost >30m → suggest to user: `Want /openspec-report?` (never auto-run; manual only)."*
- **Plain-English Meaning:** After finishing a task that had high difficulty (score 3 or higher out of 5), encountered unexpected architectural surprises, or took longer than 30 minutes, the agent must ask the user: `Want /openspec-report?`. The agent must never run this reflection command automatically.
- **Rationale:** Captures hard-won debugging lessons, operational pitfalls, and architectural reflections for continuous system improvement without wasting user time on trivial tasks.
- **Classification:** Continuous Learning & Feedback Trigger.

- **Rulebook № R11-03 · Source: listing.md §2 J.8**

#### J.8 Versioning & Imperative Changelog Format
- **Origin:** §12.
- **Literal Statement:** *"SemVer: strict `MAJOR.MINOR.PATCH` per module. Changelog: `./project/CHANGELOG.md` (`## VERSION - YYYY-MM-DD`). Categories `Added`/`Changed`/`Removed`/`Fixed`. Imperative mood."*
- **Plain-English Meaning:**
  - Follow strict Semantic Versioning (`MAJOR.MINOR.PATCH`) for every component module.
  - Document all releases in `./project/CHANGELOG.md` using the exact heading format `## VERSION - YYYY-MM-DD`.
  - Group bullet points under four explicit categories: `Added`, `Changed`, `Removed`, and `Fixed`.
  - Write changelog bullets in the imperative mood (e.g., "Add user authentication endpoint", not "Added" or "Adds").
- **Rationale:** Guarantees standardized release tracking, automated release parsing, and clear communication of breaking changes.
- **Classification:** Release Management Standard.

- **Rulebook № R11-04 · Source: listing.md §2 J.9**

#### J.9 Green Ops & 2026 SOTA Verification
- **Origin:** §11.
- **Literal Statement:** *"Green Ops/2026 SOTA: minimize carbon. Cross-reference 2026 SOTA → prevent hallucination."*
- **Plain-English Meaning:** Design systems and workflows to minimize computational overhead and environmental carbon footprint. Continuously verify coding patterns and APIs against 2026 state-of-the-art standards to avoid outdated patterns or model training hallucinations.
- **Rationale:** Promotes sustainable computing and keeps codebase patterns modern, clean, and efficient.
- **Classification:** Engineering Philosophy.

- **Rulebook № R11-05 · Source: listing.md §2 J.10**

#### J.10 Rule File Maintenance Discipline ("Edit Like Refactor")
- **Origin:** §13.
- **Literal Statement:** *"Rule file: edit like refactor — preserve meaning unless explicitly scoped, one change at a time."*
- **Plain-English Meaning:** Editing `AGENTS.md` or any rule document must follow the same discipline as refactoring production code: preserve existing semantics and intent unless explicitly asked to modify them; make only one focused change at a time; verify clarity with cold-agent benchmarks.
- **Rationale:** Prevents prompt drift, accidental regression of safety invariants, and semantic decay during rule updates.
- **Classification:** Meta-Governance Invariant.

- **Rulebook № R11-06 · Source: listing.md §2 J.12**

#### J.12 API Evolution & Strict Schema Governance
- **Origin:** §11.
- **Literal Statement:** *"API/Evolution: strict schemas (OpenAPI/gRPC), SemVer, graceful deprecation."*
- **Plain-English Meaning:** All external endpoints and internal service interfaces must be governed by strict, versioned schemas (OpenAPI for REST/HTTP, Protocol Buffers for gRPC). Breaking changes must follow Semantic Versioning (SemVer) and provide graceful deprecation periods across releases rather than abrupt breaking cutoffs.
- **Rationale:** Prevents client drift, enables automatic SDK and type generation, and guarantees backwards compatibility across distributed services.
- **Classification:** API Governance Invariant.

## Appendix S: Stack-Specific Records

Studio stack preferences (guidance, not mandates) per `listing.md` §4. Project-agnostic readers may treat these as illustrative; the normative pattern is "prefer, record deviations".


- **Rulebook № RS-01 · Source: listing.md §2 E.1 · Stack-specific**

#### E.1 Full-Stack Web Tier: SvelteKit + Tailwind v4 + Axum
- **Origin:** §3, §4.
- **Literal Statement:** *"SvelteKit via `@sveltejs/adapter-static` with `fallback: 'index.html'` served by Axum `tower-http`, Tailwind CSS, and PostgreSQL delivers native Axum static hosting, utility-first styling, end-to-end type safety via `ts-rs`, and fine-grained UI reactivity inside a minimal distroless runtime. Cross-platform native shell: Tauri v2 packaging the static build for Desktop & Mobile. Deployment asymmetry: Collapsed to a single static minimal-runtime binary serving the web build + API/WSS/gRPC; Native Shell → Desktop/Mobile packaging of the static build; Native Sims → Desktop/WASM."*
- **Plain-English Meaning:**
  - **Frontend:** SvelteKit compiled to a static Single-Page Application (SPA) using `@sveltejs/adapter-static` with `fallback: 'index.html'`, styled with Tailwind CSS v4 via `@tailwindcss/vite` and reactive Svelte 5 Runes.
  - **Backend:** Pure Rust Axum server using `tower-http` to host both the API/WSS/gRPC endpoints and the static web assets from a single minimal-runtime binary.
  - **Deployment Asymmetry:** The full web and API surface collapses into a single static binary. When packaged natively, Tauri v2 wraps this static build for Desktop and Mobile; compute-heavy simulation targets compile to Desktop and WASM.
- **Rationale:** Produces single-binary static deployments with near-instant boot times, low memory consumption, and complete client-side reactivity without Node.js server overhead.
- **Classification:** Studio Tech Stack Preference & Deployment Architecture.

- **Rulebook № RS-02 · Source: listing.md §2 E.2 · Stack-specific**

#### E.2 In-Browser Simulation & Graphics Layer (Miniplex ECS, Threlte, PixiJS, Phaser, grammY)
- **Origin:** §4.
- **Literal Statement:** *"Miniplex provides universal client-side ECS for dynamic polymorphic entity lifecycles and zero-allocation frame queries (`world.with(...)`). Decoupled presentation adapters: Threlte for declarative 3D scenes, Babylon.js for WebGPU/Havok physics and node shaders, PixiJS for high-performance 2D rendering (>1,000 nodes), or Phaser when requiring a turnkey 2D game engine with built-in arcade physics, audio, and tilemap managers. Keep Tailwind v4, Miniplex, Threlte, Babylon.js, PixiJS, Phaser, and grammY as-is inside the SvelteKit static build (@sveltejs/adapter-static)... Graphics, simulation & native shells skill."*
- **Plain-English Meaning:** For games, animations, spatial simulations, and Telegram Mini Apps:
  - Manage game entities using Miniplex (universal client-side ECS) for zero-allocation frame queries (`world.with(...)`).
  - Presentation adapters are decoupled: Threlte for declarative Three.js 3D scenes, Babylon.js for WebGPU/Havok physics and node shaders, PixiJS for high-performance 2D rendering (>1,000 nodes at 60+ FPS), or Phaser when requiring a turnkey 2D game engine with built-in arcade physics, audio, and tilemap managers.
  - Keep `grammY` inside the static web build for Telegram Mini App integration. Consult `.agents/skills/graphics-simulation/` for the presentation granularity matrix.
- **Rationale:** High-performance, zero-allocation 60+ FPS client rendering decoupled from DOM overhead.
- **Classification:** Specialized Simulation Stack Preference.

- **Rulebook № RS-03 · Source: listing.md §2 E.3 · Stack-specific**

#### E.3 Standalone Compute & In-Process ML
- **Origin:** §4.
- **Literal Statement:** *"Pure Rust with Tokio work-stealing, Axum, and Rayon provides bare-metal, multi-core execution for heavy background workloads, while Candle embeds zero-Python, in-process GGUF/Safetensors vector embeddings and local LLM/SLM inference."*
- **Plain-English Meaning:** Heavy CPU tasks run on bare-metal Rust utilizing Tokio work-stealing, Axum, and Rayon multi-core worker pools. If the application needs local AI embeddings or small language models, use Hugging Face's Candle framework directly inside the Rust process (running quantized GGUF and Safetensors models) instead of running heavy Python services or PyTorch containers.
- **Rationale:** Eliminates Python runtime overhead, minimizes container sizes, and prevents CUDA/pip dependency issues.
- **Classification:** Specialized Compute Preference.

- **Rulebook № RS-04 · Source: listing.md §2 E.4 · Stack-specific**

#### E.4 End-to-End Type Safety via `ts-rs` & Offline SQLx
- **Origin:** §4.
- **Literal Statement:** *"Export `ts-rs` (`TS` derive only) to gitignored `project/web/src/lib/types/bindings/`; commit `sqlx-data.json` via `cargo sqlx prepare` for hermetic CI checks."*
- **Plain-English Meaning:** Rust data models derive TypeScript types automatically using the `ts-rs` library (`TS` derive only). These are exported to `project/web/src/lib/types/bindings/` (which is gitignored). SQL queries are checked offline during CI using a pre-generated `sqlx-data.json` file generated via `cargo sqlx prepare`, allowing hermetic CI builds without a running database container.
- **Rationale:** Complete full-stack type safety across Rust and TypeScript without manual type duplication.
- **Classification:** Tooling & Build Optimization.

- **Rulebook № RS-05 · Source: listing.md §2 E.5 · Stack-specific**

#### E.5 Docker BuildKit Layer Hygiene & `cargo-chef` Recipe Pre-Cooking
- **Origin:** Must-follow, §4, §12.
- **Literal Statement:** *"Multi-arch builds MUST use parallel native matrix (`ubuntu-26.04` + `ubuntu-26.04-arm`) via `docker buildx imagetools create` — NEVER QEMU emulation. Docker CI MUST use a remote layer cache + dependency pre-cook (recipe-based builder / lockfile-first COPY); host CI MUST use the stack's native build caches... Single multi-stage build `Vite static → Rust musl (cargo build --release --target x86_64-unknown-linux-musl) → gcr.io/distroless/static-debian13:nonroot`; multi-arch via parallel native matrix push by digest (`:amd64-<sha>` / `:arm64-<sha>`) + 5s `docker buildx imagetools create` merge; BuildKit `cache-from: type=gha` / `cache-to: type=gha,mode=max` scoped per arch; layer hygiene `cargo-chef` pre-cook (`prepare` → `cook --release` before `COPY . .`) + lockfile-isolated `COPY` (Bun/JS `package.json` → `bun install` before source)..."*
- **Plain-English Meaning:** Docker builds must maximize layer caching and minimize CI runtimes:
  - In Rust containers, compile statically against musl (`cargo build --release --target x86_64-unknown-linux-musl`), using `cargo-chef` to generate a recipe file (`cargo chef prepare`) and compile dependencies (`cargo chef cook --release`) *before* copying application source code (`COPY . .`).
  - In JavaScript/web containers, copy `package.json` and lockfiles first and run `bun install` before copying source code.
  - Multi-arch images are built on native runners (`ubuntu-26.04` and `ubuntu-26.04-arm`), pushed by digest (`:amd64-<sha>` / `:arm64-<sha>`), and merged via a 5-second `docker buildx imagetools create` step.
  - Remote caching in Docker CI uses GitHub Actions BuildKit caching (`cache-from: type=gha`, `cache-to: type=gha,mode=max`) scoped per CPU architecture.
  - Host CI workflows must leverage the stack's native build caches (Cargo cache, Bun cache) rather than container layer caches.
- **Rationale:** Prevents recompiling hundreds of third-party crates or reinstalling npm packages when only application code changed, cutting build times from minutes to seconds without QEMU emulation bottlenecks.
- **Classification:** Container CI/CD Optimization.
- **Redundancy:** High. Defined across Must-follow lines 36–37, §4 line 108, and §12 line 188.

- **Rulebook № RS-06 · Source: listing.md §2 E.6 · Stack-specific**

#### E.6 Dev DX Proxying & SPA Fallback Route Guardrail
- **Origin:** §4.
- **Literal Statement:** *"Dev DX & Fallback Guardrail: Use `vite dev` proxying `/api` and `/ws` to `cargo watch -x run`, ensuring Axum mounts all API, WS, and gRPC routes strictly before the tower-http static SPA fallback."*
- **Plain-English Meaning:** During local development, run `vite dev` on the frontend configured to proxy `/api` and `/ws` requests to the Axum backend running under `cargo watch -x run`. In the Axum server routing table, all API, WebSocket, and gRPC route handlers must be registered *before* the `tower-http` static file fallback handler.
- **Rationale:** Avoids CORS issues during development and prevents the SPA fallback (serving `index.html`) from shadowing and intercepting valid API endpoints or returning 200 HTML pages for broken API calls.
- **Classification:** Developer Experience & Routing Guardrail.

- **Rulebook № RS-07 · Source: listing.md §2 E.7 · Stack-specific**

#### E.7 Secrets Management with `envx` & Inter-Worker gRPC
- **Origin:** §4.
- **Literal Statement:** *"Secrets: `envx` → env management → KISS... plus gRPC via tonic/Protobuf for backend inter-module worker communication."*
- **Plain-English Meaning:** Manage environment variables and runtime secrets using `envx` for a simple, unified interface (Keep It Simple, Stupid). For backend communication between the Axum coordinator and standalone compute workers, prefer high-performance gRPC via `tonic` and Protocol Buffers over JSON REST.
- **Rationale:** Streamlines local secret loading without complex third-party vault daemons and provides typed, low-overhead binary RPC for internal worker coordination.
- **Classification:** Tooling & Protocol Architecture.

- **Rulebook № RS-08 · Source: listing.md §2 E.8 · Stack-specific**

#### E.8 Dual-Tier Containerization Topology
- **Origin:** §4.
- **Literal Statement:** *"Containerization dual-tier: Component level → each component directory under `project/` owns its `Dockerfile` (multi-stage Rust/musl→distroless) + optional isolated `docker-compose.yml` (app+local PostgreSQL test). Root level → orchestrator `docker-compose.yml` mounts the component Dockerfiles, unified bridge networks, prevents `../` traversal."*
- **Plain-English Meaning:** Dockerfiles and compose setups operate on two distinct levels:
  - **Component level:** `project/web/` and `project/api/` own their respective multi-stage Dockerfiles and optional isolated `docker-compose.yml` for isolated local testing.
  - **Orchestrator root:** The parent `./docker-compose.yml` mounts the component Dockerfiles and connects them via unified Docker bridge networks while strictly preventing relative directory traversal (`../`) across container boundaries.
- **Rationale:** Allows each component to be developed and tested in isolation while providing a clean, unified deployment harness at the root.
- **Classification:** Container Architecture.

- **Rulebook № RS-09 · Source: listing.md §2 E.9 · Stack-specific**

#### E.9 Architectural Paradigm Shifts: The Mental Model Rewiring Matrix
- **Origin:** §4.
- **Literal Statement:**
  ```markdown
  | Stop thinking (old) | Start thinking (our 3-tier) |
  |---|---|
  | Monolithic server-side rendering | SvelteKit static SPA served by Axum (`@sveltejs/adapter-static` + Tailwind v4) + SQLx + ts-rs |
  | HTML-over-SSE fragmentation | Fine-grained Svelte 5 UI + WebSocket/SSE streaming |
  | Embedded SQLite per container | Preferred: PostgreSQL with SQLx migrations in `project/api/migrations/` |
  | Heavy CPU simulation in request handlers | Bare-metal Rust workers (Axum+Rayon+Candle) |
  | CSS tables for spatial sims | In-browser Miniplex ECS + Threlte (3D) / Babylon.js / PixiJS / Phaser |
  ```
- **Plain-English Meaning:** The studio explicitly rejects five legacy full-stack architectural conventions in favor of modern high-performance primitives:
  1. **From Monolithic SSR to Static SPA + Rust:** Replace Node-hosted server-side rendering with a static SvelteKit SPA served directly from Axum via `tower-http`, paired with SQLx and `ts-rs`.
  2. **From HTML fragments to Svelte 5 Streaming:** Replace fragmented HTML-over-SSE templates (HTMX-style) with fine-grained reactive Svelte 5 client components consuming WebSocket or SSE streams.
  3. **From Embedded SQLite to Centralized PostgreSQL:** Replace per-container SQLite instances with a centralized PostgreSQL database coordinated solely by Axum via SQLx migrations.
  4. **From Request-Path CPU Work to Bare-Metal Rust Workers:** Move heavy computations out of web request handlers into dedicated Rust workers powered by Tokio, Rayon, and Candle.
  5. **From CSS Layouts to Client ECS & Canvas/WebGL:** Replace CSS-based spatial layouts with Miniplex ECS and high-performance presentation engines (Threlte, Babylon.js, PixiJS, Phaser).
- **Rationale:** Rewires agent engineering assumptions to ensure new features align with the studio's ultra-low-latency, zero-downtime, and high-framerate standard.
- **Classification:** Studio Architectural Doctrine.

---

### Category F: Quality Gates, Check Scripts & Testing

Directives governing testing strategies, pre-push verification, and the definition of a completed task.


## Appendix M: Must-Follow Concordance

Each of the 30 Must-follow bullets points at its canonical record (per `listing.md` §3). Bullets sharing a record are covered by that single placement — nothing appears twice.

| # | Must-follow bullet (truncated) | Canonical record | Rulebook № |
|---|---|---|---|
| 1 | File size tiers: target ≤150 LOC (atomic/leaf), standard ≤300 LOC (cohes… | B.1 | R7-01 |
| 2 | Log redaction NEVER gated by verbosity — token/vid/otp/jwt/key/secret st… | H.2 | R9-02 |
| 3 | Task complete ONLY when touched module's native lane (format → lint → te… | F.1 | R7-02 |
| 4 | Commands execute from the owning directory (`./project/` or its componen… | C.3 | R3-03 |
| 5 | Runtime isolation absolute: inter-tier communication via API/network/WSS… | C.2 | R3-02 |
| 6 | Schema/migrations owned by exactly one tier (`project/api/` tier via SQL… | D.1 | R4-05 |
| 7 | Heavy/async work never blocks request path — queue + worker + streaming. | B.4 | R4-02 |
| 8 | Real-time via WebSocket/SSE push; client polling is anti-pattern. | B.5 | R4-03 |
| 9 | Backpressure explicit: bounded concurrency, caps, rate limits — reject u… | B.6 | R4-04 |
| 10 | At-least-once delivery requires idempotent consumption + dedup keys. | B.6 | R4-04 |
| 11 | State coordinator & topology: Axum/Tokio on Rust in `project/api/` is so… | B.3 | R3-09 |
| 12 | Deterministic state transitions: Domain transitions MUST be pure functio… | B.2 | R4-01 |
| 13 | NEVER commit credentials/`.env` · force-push shared branches · edit `ven… | B.8 | R3-10 |
| 14 | ASK FIRST: shared-env schema migrations · deletions outside task scope. | D.4 | R4-08 |
| 15 | Exploration mode: strictly zero code-writing. | I.4 | R6-01 |
| 16 | Produced code verbose-by-default: `VERBOSE` unset/true → emit wide-event… | H.4 | R9-04 |
| 17 | Mutations surgical: SEARCH/REPLACE deltas; never whole-file overwrites; … | A.5 | R2-06 |
| 18 | Multi-arch builds MUST use parallel native matrix (`ubuntu-26.04` + `ubu… | G.2 | R8-02 |
| 19 | Docker CI MUST use a remote layer cache + dependency pre-cook (recipe-ba… | E.5 | RS-05 |
| 20 | After tasks with difficulty ≥3/5, surprise, or time cost >30m → suggest … | J.7 | R11-02 |
| 21 | Learned negatives live in skills as `Contrast`/`Anti-examples`; never au… | J.10 | R11-05 |
| 22 | Must-read: `.agents/skills/guardrails/SKILL.md` before any code touching… | I.5 | R10-04 |
| 23 | Submodule CI/CD Contract [CRITICAL]: the single submodule `project/` MUS… | G.1 | R8-01 |
| 24 | Deploy Path Allowlist [CRITICAL]: Orchestrator `deploy.yml` MUST use exp… | G.6 | R8-06 |
| 25 | Private Submodule & GHCR CI Access [CRITICAL]: Orchestrator `deploy.yml`… | G.5 | R8-05 |
| 26 | Submodule Git Allowlist: the submodule's default-deny `/*` `.gitignore` … | C.5 | R3-05 |
| 27 | Dokku Proxy Tuning: All Dokku apps MUST `proxy-read-timeout 3600s` + `pr… | G.4 | R8-04 |
| 28 | Dokku Deploy Action SSH Port: Orchestrator `deploy.yml` `appleboy/ssh-ac… | G.4 | R8-04 |
| 29 | Submodule Pointer Sync [CRITICAL]: Commits inside the submodule MUST be … | C.4 | R3-04 |
| 30 | Host MCP Tool Discovery [CRITICAL]: At session start, inspect available … | I.3 | R10-03 |
