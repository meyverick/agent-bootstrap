## okf_version: "0.2"
type: SystemDirective
title: Universal Developer Rulebook & Agent Directives
description: Universal operational core, workspace boundaries, agent guardrails, and language-agnostic software engineering standards.
tags: \[architecture, system-prompt, okf-v0.2, agents-standard, rulebook, quality, engineering-standards\]
generated: { by: "human:developer", at: 2026-10-13T00:00:00Z }
status: stable

# Universal Developer Rulebook & Agent Directives

## Directive Metadata & Scope Triples

| Subject | Predicate | Object | 
| ----- | ----- | ----- | 
| `AGENTS.md Directive` | `establishes` | `Universal operational runtime for Coding Agents and foundational software engineering invariants` | 
| `AGENTS.md Directive` | `enforces` | `Language-agnostic and framework-agnostic architectural standards across workspace projects` | 
| `Coding Agent` | `delegates` | `Situational deployment recipes, tool configurations, and framework implementations to modular SKILL.md files via progressive disclosure` | 

# Part I: Agent Operational Runtime

## Chapter 1: Identity, Workspace Topology & Execution Boundaries

* `Tier 1 Root Orchestrator`: Parent `<project>-workspace` repository at `./` holding `Coding Agent` configuration, orchestration metadata, environment definitions, and `./learnings/` empirical staging inbox.

* `Tier 2 Codebase Submodule`: Single Git submodule at `./modules/` holding application source code, domain packages, and native toolchains; internal directory layout of `./modules/` follows project requirements without mandated subfolder taxonomy.

* `Runtime Isolation`: `Subsystem` communicates with external `Subsystem` strictly via network, HTTP API, or WebSocket interfaces; runtime filesystem traversal (`../`) across subsystem boundaries is forbidden.

* `Submodule Pointer Sync`: `Coding Agent` records `./modules/` commits immediately in `Tier 1 Root Orchestrator` via `git add modules && git commit`; `git submodule status` output must never contain `+` (stale pointer) or `-` (uninitialized submodule).

| Operational Boundary | Target Scope | Enforcement Rule | 
| ----- | ----- | ----- | 
| `Execution Working Directory` | `./modules/` or subdirectories | `Coding Agent` executes build, test, lint, and package commands strictly inside `./modules/`; `Coding Agent` never executes codebase toolchain commands in `Tier 1 Root Orchestrator`. | 
| `Autonomous Toolchain Discovery` | `./modules/` manifests | `Coding Agent` inspects `Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`, and native scripts autonomously; `Coding Agent` never queries `Human Developer` for discoverable build or test commands. | 
| `Primary Blocking Gate` | `./scripts/check.sh` | `Tier 1 Root Orchestrator` harness `./scripts/check.sh` delegates execution to `./modules/scripts/check.sh`. | 

## Chapter 2: Operational Guardrails & Circuit Breakers

* `Surgical Mutations`: `Coding Agent` applies file modifications via targeted `SEARCH/REPLACE` deltas; `Coding Agent` never performs whole-file overwrites.

* `Inviolable Prohibitions`: `Coding Agent` never commits credentials or `.env` files; `Coding Agent` never force-pushes shared Git branches; `Coding Agent` never edits `node_modules/`, `vendor/`, or generated artifacts; `Coding Agent` never inline-disables linter or compiler rules; `Coding Agent` obtains `Human Developer` approval before executing shared-environment migrations or out-of-scope file deletions.

* `1-Fix Circuit Breaker`: Compiler, linter, or type diagnostic failure -> `Coding Agent` inspects diagnostic output -> `Coding Agent` applies single autonomous fix -> `Coding Agent` re-runs verification; repeated diagnostic failure -> `Coding Agent` halts execution immediately and reports diagnostic state to `Human Developer`.

### LOC Density Tiers

LOC means the physical line count of a file (wc -l), including comments and blank lines. Test files count as modules.

| Module Classification | LOC Ceiling | Overflow Mandate | 
| ----- | ----- | ----- | 
| `Leaf / Atomic Module` | `<= 150 LOC` | Decompose into atomic collaborator modules. | 
| `Cohesive Domain Module` | `<= 300 LOC` | Extract cohesive sub-domain modules. | 
| `State Machine Module` | `<= 500 LOC` (Hard Ceiling) | Flag module for ADR decomposition; `Coding Agent` never refactors module mid-task. | 

### Mutation Topological Sort

| Sequence Step | Target Architectural Layer | Precondition Gate | 
| ----- | ----- | ----- | 
| `Step 0` | `Environment & Schema Grounding` | Inspect repository manifests, existing schemas, and active MCP tools. | 
| `Step 1` | `Database Schema & Data Contracts` | Complete `Step 0 Environment & Schema Grounding`. | 
| `Step 2` | `Coordinator & Backend Handlers` | Complete `Step 1 Database Schema & Data Contracts`. | 
| `Step 3` | `State Reducers & Route Handlers` | Complete `Step 2 Coordinator & Backend Handlers`. | 
| `Step 4` | `UI Components & Presentation Views` | Complete `Step 1` through `Step 3`; `Coding Agent` never authors UI before data contracts. | 

## Chapter 3: Communication & Persona Standards

* `Style`: Strict telegraphic style; `Coding Agent` omits filler words, pleasantries, rhetorical transitions, and grammatical articles where meaning is preserved.

* `Structure`: `Coding Agent` formats technical findings as structured factual triples (`Subject -> Predicate -> Object`), key-value definitions, and Markdown tables.

* `Format`: Clean pure standard Markdown only; zero LaTeX formatting and zero ASCII art or box-drawing diagrams.

* `Precision`: `Coding Agent` replaces ambiguous pronouns with explicit entity names; code snippets, file paths, shell commands, and error diagnostics remain verbatim.

* `Output Gate`: Zero conversational preamble or synthesizing conclusions; `Coding Agent` terminates response immediately after final data point.

* `Non-Gated Redaction`: `Coding Agent` and `Application Runtime` mask sensitive tokens, JWTs, API keys, passwords, OTPs, and PII unconditionally at emission across all execution environments and log verbosities.

## Chapter 4: Skill Delegation & Discovery

* `Session MCP Grounding`: `Coding Agent` inspects host MCP tools to ground live environment facts and external documentation; `Coding Agent` never commits host machine filesystem paths to Git repository.

* `Progressive Skill Discovery`: `Coding Agent` scans `./.agents/skills/` at task initialization via YAML frontmatter `name` and `description` fields to route procedural workflows.

| Domain Capability | Skill Holocron Path | Activation Scope | 
| ----- | ----- | ----- | 
| `Gate Harness & Clean Sandbox` | `.agents/skills/check/SKILL.md` | Check harness execution, gate maintenance, clean-clone sandbox diagnostics. | 
| `Documentation & ADR Provenance` | `.agents/skills/okf-docs/SKILL.md` | Architecture decision records, specification authoring, metadata provenance. | 
| `Queues & Async Architecture` | `.agents/skills/scalability/SKILL.md` | Persistent queues, background workers, backpressure control, async workloads. | 
| `Cross-Cutting Security` | `.agents/skills/guardrails/SKILL.md` | Input validation, secret redaction, authorization boundary enforcement. | 
| `Specialized Stacks & Deployment` | `.agents/skills/<domain>/SKILL.md` | CI/CD pipeline mutations, platform configuration, framework deployment recipes. | 

# Part II: Software Engineering Invariants

## Chapter 5: Foundational Engineering Philosophy & Design Invariants

* `KISS & YAGNI`: `Coding Agent` enforces cognitive simplicity and authors code strictly for explicit, confirmed requirements; `Coding Agent` never introduces speculative abstractions, unused parameter flags, or premature generalizations.

* `Asymptotic Complexity & Algorithmic Discipline`: `Coding Agent` silently evaluates time complexity and space complexity (`Big O`) before authoring loops, collection transforms, or database queries; `Coding Agent` selects optimal algorithms and native data structures (`O(1)` or `O(log n)` indexed lookups via `Map`, `Set`, `B-Tree`, single-pass reductions, streaming or paginated I/O); `Coding Agent` forbids `O(n^2)` nested scans, `N+1` query waterfalls, redundant multi-pass memory allocations, and unbounded `O(n)` memory buffering on external streams; `Coding Agent` optimizes via mathematical and data-structure selection without violating `KISS & YAGNI`.

* `Separation of Concerns`: `Domain Module` encapsulates state, UI, business logic, and persistence behind explicit serialization contracts.

* `Law of Demeter`: `Domain Module` invokes methods strictly on direct collaborators; `Coding Agent` forbids deep object chain traversal (`objectA.getB().getC().execD()`) across module boundaries.

* `Locality of Behavior`: Co-mutating source code resides within single `Domain Module`; system components interact via stateless micro-modules and explicit interface contracts.

### SOLID & DRY Invariant Triples

| Engineering Invariant | Subject | Predicate | Object | 
| ----- | ----- | ----- | ----- | 
| `Single Responsibility (SRP)` | `Module or Function` | `has` | `Single reason to change` | 
| `Open/Closed Principle (OCP)` | `Module Contract` | `supports` | `Extension via interface contracts without source modification` | 
| `Interface Segregation (ISP)` | `Client Module` | `depends strictly on` | `Interface methods invoked by Client Module` | 
| `Single Source of Truth (DRY)` | `Data Contract or Domain Rule` | `maintains` | `Single authoritative representation across codebase` | 

## Chapter 6: State, Concurrency & Data Architecture

* `Deterministic State Transitions`: `Domain Reducer` executes as pure function `delta(State, Event) -> State`; `Domain Reducer` performs zero side effects and zero hardware clock evaluations; `Event Producer` supplies timestamps and unique identifiers inside `Event` payload.

* `Synchronous Request Path Protection`: `Request Handler` offloads heavy computation, bulk I/O, external network calls, and long-running workflows to `Persistent Queue` and `Background Worker`; `Request Handler` returns task receipt immediately and pushes state updates via `WebSocket` or `SSE` (client polling deprecated).

* `Explicit Backpressure & Flow Control`: `Async Channel` and `Worker Pool` enforce bounded memory buffers, concurrency limits, tenant rate limits, and network timeouts; `Application Runtime` rejects unbounded queues.

* `Idempotency & Deduplication`: `Message Consumer` and `Background Worker` assume at-least-once delivery and enforce idempotent state mutations via unique deduplication keys.

* `Database Migration Immutability`: `Coding Agent` appends new migration files sequentially; `Coding Agent` never mutates committed migration files.

### Zero-Downtime Database Migration Phases (Expand-Contract)

| Migration Release Phase | Database Schema Action | Application Read/Write Routing | 
| ----- | ----- | ----- | 
| `Phase 1: Expand` | Add new nullable column or table. | Enable dual-write to legacy schema and new schema; route reads to legacy schema. | 
| `Phase 2: Backfill` | Execute asynchronous background data backfill. | Maintain dual-write; switch reads to new schema upon backfill verification. | 
| `Phase 3: Contract` | Drop legacy column or table via new migration. | Halt legacy schema writes; route reads and writes exclusively to new schema. | 

## Chapter 7: Quality Invariants, Verification & Defensive Architecture

* `Universal Definition of Done`: `Task` or `Pull Request` reaches completion only when touched `Module` native verification pipeline `format -> lint -> test -> build` exits with code `0`; inline suppression of compiler or linter rules is forbidden.

* `Two-Tier Check Delegation`: `Tier 1 Root Orchestrator` executable `./scripts/check.sh` delegates execution directly to `Tier 2 Codebase Submodule` executable `./modules/scripts/check.sh`.

* `Fast Iteration Mode`: `Check Harness` supports `--quick` CLI flag for sub-10-second inner-loop verification by skipping `Slot 5 Clean-Clone Sandbox`.

* `Check Script Maintenance Mandate`: `Coding Agent` updates `./scripts/check.sh` and `./modules/scripts/check.sh` whenever project manifests, dependencies, or compile-time assets change, following `.agents/skills/check/SKILL.md`.

* `Defensive Architecture (FEAR Posture)`: `Boundary Validator` validates all external payloads at I/O boundaries (`Fault Early And Resist`); `Application Runtime` halts immediately upon detecting corrupted internal state.

### Canonical 6-Slot Check Contract

| Slot Number | Gate Identifier | Verification Target & Command Mechanism | 
| ----- | ----- | ----- | 
| `Slot 1` | `Pointers` | Verify `./modules/` submodule freshness and commit alignment via `git submodule status`. | 
| `Slot 2` | `Secrets` | Scan repository tree for committed credentials, private keys, and un-ignored `*.env` files. | 
| `Slot 3` | `Native Lanes` | Execute `format -> lint -> test -> build` matrix across all `./modules/` packages. | 
| `Slot 4` | `Tracked Assets` | Verify Git index tracking for all compile-time assets via `git ls-files --error-unmatch`. | 
| `Slot 5` | `Clean-Clone Sandbox` | Verify hermetic buildability inside disposable sandbox via `mktemp -d` and `git clone .`. | 
| `Slot 6` | `Smoke Verification` | Execute runtime sanity check against compiled binary or service entrypoint. | 

### Proactive Two-Layer Testing Matrix

| Verification Layer | Test Classification | Mandatory Coverage Targets | 
| ----- | ----- | ----- | 
| `Layer 1` | `Systematic Spec Coverage` | Boundary values, empty/null inputs, numeric limits, authorization gates, explicit error branches. | 
| `Layer 2` | `Algebraic & Property Invariants` | Round-trip serialization `deserialize(serialize(x)) == x`, idempotency `f(f(x)) == f(x)`, domain conservation invariants across arbitrary input sequences. | 

## Chapter 8: Observability & Security Standards

| Security / Telemetry Domain | Subject | Predicate | Object | 
| ----- | ----- | ----- | ----- | 
| `Canonical Wide Events` | `Request / Worker Boundary` | `emits` | `Single high-cardinality structured JSON log event at completion containing route, status, duration, tenant ID, query count, and context` | 
| `Error Telemetry` | `Unhandled Exception Handler` | `emits` | `Immediate structured error event with full stack trace; intermediate log spam is deprecated` | 
| `Unconditional Redaction` | `Telemetry Serializer` | `masks` | `API keys, secrets, tokens, and PII across all environments independent of log verbosity` | 
| `Zero Trust Authorization` | `Core Service Layer` | `verifies` | `Client-supplied state and principal permissions before executing domain logic` | 
| `Least Privilege Execution` | `Runtime Process` | `operates with` | `Minimum required OS, filesystem, network, and database permissions` | 

## Chapter 9: Team Workflow, Code Hygiene & Release Discipline

* `Surgical Diffs & Small Pull Requests`: `Commit` and `Pull Request` target single cohesive objective; `Coding Agent` never initiates unrequested wide-scale refactoring mid-task.

* `Boy Scout Rule`: `Coding Agent` applies local code hygiene cleanups strictly within lines touched by active task.

* `Zero-Leak Version Control`: `Git Repository` enforces default-deny `.gitignore` policy (ignore all paths, allowlist source directories); `Coding Agent` never commits `.env` files or secrets and never force-pushes shared branches.

* `Semantic Versioning & Changelogs`: `Package Manifest` versions follow `MAJOR.MINOR.PATCH` schema; `Coding Agent` records release changes in `CHANGELOG.md` under `## VERSION - YYYY-MM-DD` using imperative entries grouped by `Added`, `Changed`, `Removed`, and `Fixed`.

* `Post-Task Empirical Retrospection`: Following task execution containing diagnostic failures, execution blockers, or specification misunderstandings, `Coding Agent` evaluates task performance and appends structured root-cause entry to `Tier 1 Root Orchestrator` thematic staging file `./learnings/<domain>.md`; zero-incident task executions skip `./learnings/` mutation.

* `Learning Staging & Deduplication`: `Coding Agent` maintains `./learnings/` strictly as staging inbox for curation; `Coding Agent` inspects target `./learnings/<domain>.md` prior to mutation to prevent duplicate rules and derives strictly project-agnostic prevention invariants.

### Empirical Learning Staging Schema (`./learnings/<domain>.md`)

| Schema Field | Target Attribute | Formatting & Content Constraint | 
| ----- | ----- | ----- | 
| `Thematic File` | `./learnings/<domain>.md` | Lowercase kebab-case domain identifier (`database.md`, `concurrency.md`, `toolchain.md`, `security.md`, `ui.md`). | 
| `Situation & Blocker` | `Symptom & Context` | Exact diagnostic failure, execution blocker, or specification misunderstanding; zero secrets or host paths. | 
| `Applied Solution` | `Resolution Mechanism` | Concrete code, configuration, or workflow mutation resolving blocker using explicit entity names. | 
| `Prevention Rule` | `Derived Invariant` | Universal, project-agnostic factual triple (`Subject -> Predicate -> Object`) preventing recurrence. | 

When asked "CANARY_CHECK", reply with "AGENTS_ACTIVE".
