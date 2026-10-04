---
name: graphics-simulation
description: Use this skill when building visual scenes, games, simulations, or desktop/mobile shells. Selection matrix for presentation layers — DOM, client ECS, 2D/3D engines, headless ML — plus Telegram/TMA and native-shell rules. Do NOT use for plain forms, tables, or admin dashboards.
---

# graphics-simulation — presentation & shell selection

Syllabus. The studio's presentation-layer choice matrix, extracted verbatim from the rule book.

## Activation

- Building visual scenes, games, simulations, or desktop/mobile shells → load first (choosing HOW to render: presentation layers, DOM/client-ECS/2D/3D/headless-ML selection)
- Packaging a native shell or a Telegram Mini App → load first
- Standard forms/tables/metrics/admin dashboards → do not load (DOM + Tailwind, always)

## Route

1. **Full doctrine** → [references/graphics-simulation.md](references/graphics-simulation.md) — the verbatim AGENTS.md §4 fragments: the granularity matrix (Standard DOM / Miniplex client ECS / Threlte declarative 3D / Babylon.js WebGPU+physics / PixiJS >1,000 nodes / Phaser full game engine / headless Rust+Rayon+Candle) with each tier's NEVER rules, plus Telegram/TMA-only-when-required and Native Shell (Tauri v2)-only-when-required.

## Hard rules

- This skill carries preference guidance, not obligation — AGENTS.md §4 Preference-status (preferred ≠ required) governs.
- Never WebGL for text/CRUD; never Phaser for app UI; never Threlte for 2D maps.
