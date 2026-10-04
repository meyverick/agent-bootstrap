---
name: scalability
description: Use this skill when designing or changing background work, queues, workers, realtime state flow, or polling behavior. Holds the studio's orchestrator-workers topology, deterministic-state rules, LISTEN/NOTIFY + WebSocket/SSE push doctrine, and anti-pattern lists. Do NOT load for ordinary request-path features.
---

# scalability — queuing & realtime doctrine

Syllabus. The studio's scalability architecture, extracted verbatim from the rule book.

## Activation

- Designing background jobs, queues, worker pools, or realtime sync → load first
- Deciding push vs polling, or reviewing a state-machine transition design → load first
- Trivial sync request-path work → do not load

## Route

1. **Full doctrine** → [references/scalability.md](references/scalability.md) — the verbatim AGENTS.md §6 + §6a: orchestrator-workers (single state owner, stateless workers, at-least-once + idempotent), hub-and-spoke vs emergent meshes, anti-pattern lists (stateful workers, multiple owners, cron-as-scheduler, unbounded queues, peer-to-peer), LISTEN/NOTIFY + Tokio broadcast push, polling = fallback only with single-flight+timeout+dedup, `HP crossed 90%` example.

## Hard rules

- The always-binding invariants live in AGENTS.md Must-follow (state coordinator & topology · deterministic state transitions) — they bind whether or not this skill is loaded.
- Explicit backpressure everywhere; reject unbounded growth.
- Client polling is an anti-pattern — events push, thresholds fire.
