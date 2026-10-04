# Graphics, simulation & shell selection (verbatim extract of AGENTS.md §4 fragments)

- Graphics & simulation granularity matrix (autonomous selection):
  - Standard DOM: Svelte+Tailwind → forms, admin tables, metrics, static dashboards. Never WebGL for text/CRUD.
  - Client ECS: Miniplex → frame-by-frame polymorphic entity state, archetypes, and zero-allocation query loops.
  - 3D Declarative: Threlte → Svelte-native spatial scenes, GLTF, orbital cameras, 3D viewports. Never for 2D maps.
  - 3D Engine & WebGPU: Babylon.js → native Havok physics, complex particle shaders, WebGPU compute, CAD/tooling.
  - 2D perf: PixiJS → >1,000 nodes, tactical grids, particles. Never when turnkey physics needed.
  - 2D engine: Phaser → full game loops, rigid-body/arcade physics, Tiled tilemaps, sprite trees, audio. Never for app UI.
  - Headless compute & ML: pure Rust+Axum+Rayon+Candle → CPU-bound parallel workloads, Monte Carlo, batch solvers, in-process GGUF/embeddings, high-throughput RPCs. Never in request handlers.
- Telegram/TMA ONLY when required: grammY on Bun + `@telegram-apps/sdk`.
- Native Shell ONLY when required: Tauri v2 shell packaging static SvelteKit SPA for Desktop (macOS/Linux/Windows) and Mobile (iOS/Android) via Rust IPC.

