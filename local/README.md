# Project Workspace Orchestrator

This repository is the root orchestrator (Tier 1) for this project, adhering to the universal two-tier architecture defined in `AGENTS.md`.

## Workspace Structure

- `AGENTS.md`: Universal developer rulebook and agent directives.
- `scripts/check.sh`: Root push gate validating submodule pointer alignment, credential scans, and submodule health.
- `modules/`: Codebase submodule (Tier 2) containing domain packages, application source, and native toolchains.

## Quick Start

1. Initialize submodule:
   ```bash
   git submodule update --init --recursive
   ```

2. Run pre-push check gate:
   ```bash
   ./scripts/check.sh --quick
   ```
