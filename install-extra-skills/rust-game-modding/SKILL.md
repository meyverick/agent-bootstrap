---
name: rust-game-modding
description: >
  Author, optimize, and audit Facepunch Rust dedicated server plugins and mods
  using Carbon and Oxide frameworks on Unity 6 (net48 C#).
  Use when developing Facepunch Rust plugins, Carbon mods, Oxide scripts,
  Harmony patches for Rust, LUI or CUI v2 interfaces, or optimizing server hook performance.
  Do NOT use when writing Rust systems code in the Rust programming language (Cargo/Tokio/Axum),
  developing non-Rust Unity games, or working on web APIs.
allowed-tools: Bash(*)
license: MIT
compatibility: Requires bun >= 1.0; runtime timeout 30s, JSON output.
metadata:
  author: agentic
  version: "1.0"
---

# Rust Game Modding (Carbon & Oxide on Unity 6)

Author, optimize, and audit Facepunch Rust dedicated server plugins and mods using Carbon and Oxide frameworks on Unity 6 (Unity 6.3 engine, Mono runtime, targeting .NET Framework 4.8 `net48`).

> [!IMPORTANT]
> **DISAMBIGUATION**: This skill targets **Facepunch Rust game plugins in C# on Unity 6 Mono (`net48`)**.
> It is strictly separate from systems programming in the **Rust programming language** (Cargo/Tokio/Axum, governed by `rust-systems`).
> Strictly ZERO Cargo crates, Rust compiler flags, or web frameworks in this domain.

---

## Pre-Flight Checks & Environment Probes

Before authoring code or modifying plugins:
1. Verify Bun runtime availability: `bun --version` (required for bundled audit and query tools).
2. Validate hook signatures and parameters using `scripts/query-hooks.ts <hook-name>`.
3. Inspect item shortnames and prefab paths using `scripts/query-metadata.ts <query>`.
4. Audit candidate plugins for allocations, boxing, and leaks using `scripts/audit-plugin.ts <path>`.

---

## Core Engineering Invariants

### 1. Game Tick Budget (<1ms)
The server simulation runs at a fixed 30Hz or 60Hz (~16.6ms–33.3ms tick). Hook executions MUST execute in <1ms (target <0.1ms). Never block the main thread with synchronous I/O, heavy JSON parsing, or deep collection loops.

### 2. Unity 6 Main-Thread Affinity [CRITICAL]
Unity engine objects (`BasePlayer`, `BaseEntity`, `GameObject`, `Transform`, `Item`) MUST ONLY be queried or mutated on the Unity main thread. Background work (web requests, heavy compute, disk persistence) MUST marshal back via `NextFrame(() => { ... })` or `UniTask.SwitchToMainThread()`.

### 3. Memory & GC Allocation Hygiene (Zero-Allocation Hot Paths)
Unity 6 incremental GC slices must not be overwhelmed. Managed heap churn triggers emergency full GC freezes:
* **Mandatory Pooling**: Use `Facepunch.Pool.Get<T>()` and `Facepunch.Pool.Free(ref obj)` (or `Pool.FreeUnmanaged(ref obj)`) inside `try / finally` blocks for all temporary collections (`List<T>`, `HashSet<T>`).
* **BANNED in Hot Hooks** (`OnTick`, `OnPlayerTick`, `OnEntityTakeDamage`, `CanNetworkTo`):
  - Zero LINQ (`.Where()`, `.Select()`, `.OrderBy()`, `.ToList()`).
  - Zero closures and lambda allocations.
  - Zero implicit boxing (string interpolation `$"..."`, `string.Format`, `Puts`, enum dictionary keys without integer casting).

### 4. UI Delta Streaming (`cui.v2` / LUI)
Never destroy and re-transmit full CUI JSON hierarchies on ticks or frequent state changes:
* Send the static base CUI container panel once upon player connection.
* Transmit only minimal targeted delta updates via `cui.v2.UpdateText`, `cui.v2.UpdateColor`, or `cui.v2.UpdatePosition`.
* All UI button commands MUST use `[ProtectedCommand]` or `Community.Protect(command)` to randomize command identifiers against client console forgery.

### 5. Dynamic Hook Subscription
Feature-gated or configurable hooks MUST call `Unsubscribe(nameof(OnHookName))` during `Loaded()` or `OnServerInitialized()` if disabled in configuration; re-subscribe only when enabled.

### 6. Clean Hot-Reload Teardown (`Unload`)
Plugins hot-reload without server reboot. `Unload()` MUST be leak-free:
* Destroy all active CUI/LUI panels (`CuiHelper.DestroyUi`, `cui.v2`).
* Destroy all running timers (`Timer.Destroy()`).
* Remove custom vitals (`CustomVitalManager.RemoveSharedVital`).
* Unpatch manual Harmony instances (`HarmonyInstance.UnpatchAll()`).

---

## Contrast: Anti-Patterns vs Unity 6 / Carbon SOTA

| Anti-Pattern (Naïve Modding) | Modern Carbon / Unity 6 SOTA | Why Different |
| :--- | :--- | :--- |
| `var list = new List<BasePlayer>();` | `var list = Pool.Get<List<BasePlayer>>(); try { ... } finally { Pool.Free(ref list); }` | Eliminates managed heap churn; prevents emergency full GC freezes. |
| `$"Damage: {info.damageTypes.Total()}"` in `OnEntityTakeDamage` | Fast integer/float checks, custom reusable string buffers | String interpolation allocates heap garbage every bullet hit. |
| Re-creating full CUI JSON panel on each tick | Base panel sent once; stream `cui.v2.UpdateText(...)` deltas | Drastically cuts network bandwidth and eliminates client UI redraw hitches. |
| `[Command("myplugin.action")]` on UI buttons | `[ProtectedCommand]` or `Community.Protect()` | Prevents players from forging F1 console commands without UI access. |
| Background `Task.Run(() => player.ChatMessage(...))` | `NextFrame(() => { if (player?.IsConnected == true) player.ChatMessage(...); })` | Unity objects are not thread-safe; off-thread engine calls crash Mono. |
| Synchronous `File.WriteAllText` in `OnServerSave` | Staggered timer save or async background blit | Synchronous disk I/O stalls the server tick for multiple frames. |

---

## Grounded Anti-Examples

### Anti-Example 1: Managed Heap Churn in Damage Hook
```csharp
// ❌ DO NOT: Allocate lists and use LINQ in recurring damage paths
void OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
{
    var nearby = BasePlayer.activePlayerList.Where(p => p.Distance(entity) < 10f).ToList(); // Managed garbage!
    Puts($"Entity took {info.damageTypes.Total()} damage"); // Managed string allocation!
}

// ✅ DO: Pool collections and perform zero-alloc validation
void OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
{
    if (entity == null || info == null || entity.IsDestroyed) return;
    var nearby = Facepunch.Pool.Get<List<BasePlayer>>();
    try
    {
        for (int i = 0; i < BasePlayer.activePlayerList.Count; i++)
        {
            var p = BasePlayer.activePlayerList[i];
            if (p != null && p.IsConnected && p.Distance2D(entity) < 10f)
                nearby.Add(p);
        }
        // Process players without string interpolation
    }
    finally
    {
        Facepunch.Pool.Free(ref nearby);
    }
}
```

### Anti-Example 2: Zombie Hot-Reload Leaks in `Unload`
```csharp
// ❌ DO NOT: Leave active timers and UI panels dangling on unload
void Unload()
{
    Puts("Plugin unloaded"); // Timers still tick, CUI stays on screen!
}

// ✅ DO: Destroy all registered resources cleanly
void Unload()
{
    _repeatTimer?.Destroy();
    _repeatTimer = null;
    foreach (var player in BasePlayer.activePlayerList)
    {
        if (player != null && player.IsConnected)
            CuiHelper.DestroyUi(player, "MyPlugin_HUD");
    }
    CustomVitalManager.RemoveSharedVital("MyPlugin_Vital");
}
```

---

## Progressive Disclosure & Reference Architecture

For advanced engine and framework mechanics, consult on-demand references:
* [Unity 6 Engine Internals](references/unity6-engine-internals.md): GPURD, BatchRendererGroup, Burst, RaycastCommand batching, APV, and GC modes.
* [Carbon Framework Architecture](references/carbon-api-architecture.md): CarbonPlugin vs RustPlugin, LUI v2 delta streaming, CustomVitalManager, and Bridge RPC.
* [Harmony Patching Guide](references/harmony-patching-guide.md): AutoPatch, Prefix/Postfix/Transpiler contracts, and memory safety.

Bundled CLI Utilities:
* `bun run scripts/audit-plugin.ts <file.cs> [--fix]`: Static AST linter and autonomous repair tool.
* `bun run scripts/query-hooks.ts <hook>`: Fast signature and cancellation behavior lookup.
* `bun run scripts/query-metadata.ts <query>`: Instant prefab, item shortname, and convar lookup.
* `bun run scripts/scaffold-plugin.ts <PluginName>`: Scaffolds modern `CarbonPlugin` template.
