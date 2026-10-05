# Scalability & realtime doctrine (verbatim extract of AGENTS.md §6 + §6a)

- Heavy/async work never synchronous in request path. Queue+worker+streaming — **orchestrator-workers**: coordinator delegates, stateless workers execute, results synthesize.
- Coordinator (Axum/Tokio on Rust) = single state owner: persisted PostgreSQL records via SQLx, state machine `queued → running → succeeded | failed | cancelled`, stable unique IDs, per-actor scoping where required. Hub-and-spoke (coordinator→workers→coordinator); emergent meshes drift.
- Workers (stateless Rust/Axum+Rayon): disposable, horizontally scalable — register, pull via RPC/queue, report progress+results, heartbeat. Lost worker → re-queue or fail (at-least-once+idempotent).
- Realtime progress/results → WebSocket/SSE; client polling anti-pattern.
- Backpressure explicit: bounded concurrency, queue caps, rate limits — reject unbounded growth.
- Defaults: PostgreSQL (preferred) queue table (SQLx), WebSocket/SSE streaming, lightweight Rust workers — platform primitives over new brokers. Default for heavy/async/batch/rate-limited; trivial sync stays in request path (KISS/YAGNI).
- Anti-patterns: stateful workers · multiple state owners · cron-as-scheduler · unbounded queues · blocking request path · peer-to-peer meshes.
- Temporal isolation & deterministic state: domain state transitions MUST be pure functions over events (`delta: (State, Event) -> State`) with zero side effects; reading hardware clocks (`Instant::now()`, `clock_gettime`) inside transition logic is forbidden — logical timestamps are assigned at the ingress gateway boundary and passed in event payloads.
- WebSocket/SSE: default real-time sync for live Svelte stores.

## 6a. Realtime & Event-Driven

- Maintain strict event-driven push via PostgreSQL-preferred LISTEN/NOTIFY and Tokio broadcast channels; use WebSockets/SSE for frontend UI streaming and gRPC (tonic/Protobuf) for backend inter-module worker communication.
- Every control loop fires on the event (state change, inbound message, threshold crossed), not blind interval.
- Defaults: `WebSocket`/`SSE` push for live state; background jobs use queue+worker (§6) with at-least-once idempotency+dedup keys; platform primitives over new brokers.
- Polling = fallback only — upstream offers no webhook/SSE → coarsest interval tolerated, gated `single-flight+timeout+dedup` (batch/fan-out `N×` sequential RPCs).
- Anti-patterns: bare `setInterval` for live state, cron-as-scheduler, unbounded polling, `N×` sequential RPCs without batching.
- Example: `HP crossed 90%` event → push via WebSocket/SSE Svelte reactive store — not `GET /status` polling.
