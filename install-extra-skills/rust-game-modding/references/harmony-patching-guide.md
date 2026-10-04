# Harmony Patching Guide for Facepunch Rust

## Overview

Harmony allows runtime method interception and IL bytecode manipulation of vanilla Facepunch Rust server assemblies (`Assembly-CSharp.dll`) without modifying files on disk. In Carbon, Harmony integration is streamlined via the `[AutoPatch]` attribute and managed lifecycles.

---

## 1. Automated Patching with `[AutoPatch]`

In Carbon plugins, mark patch classes with `[AutoPatch]`. Carbon automatically scans, applies, and unpatches them when the plugin loads and unloads:

```csharp
[AutoPatch]
[HarmonyPatch(typeof(BasePlayer), "OnKilled")]
public static class BasePlayer_OnKilled_Patch
{
    // Prefix: return false to suppress original execution
    [HarmonyPrefix]
    public static bool Prefix(BasePlayer __instance, HitInfo info)
    {
        if (__instance.IsAdmin)
        {
            __instance.ChatMessage("Admin immortality prevented death.");
            return false; // Skip original method
        }
        return true; // Continue original method
    }

    // Postfix: inspect or modify returned result
    [HarmonyPostfix]
    public static void Postfix(BasePlayer __instance)
    {
        // Execute post-death logic
    }
}
```

---

## 2. Parameter Injection Conventions

Harmony resolves method arguments by exact type and special naming conventions:

| Parameter Name | Type / Meaning | Usage |
| :--- | :--- | :--- |
| `__instance` | Declaring type | References the instance executing the method (omit for static methods). |
| `__result` | Method return type | In `Postfix`, access or modify return value (`ref T __result`). |
| `__state` | Any user-defined type | Passes temporary state computed in `Prefix` into `Postfix`. |
| `___privateField` | Tripled underscore | Accesses private fields on `__instance` by name. |

---

## 3. Method Interception Invariants

### 1. Prefixes & Simulation Integrity
* Keep Prefix execution under 0.1ms. A slow prefix on high-frequency methods (e.g. `BasePlayer.ServerUpdate` or `BaseCombatEntity.OnTakeDamage`) instantly degrades server ticks.
* Never call `Thread.Sleep` or synchronous I/O inside a patch.

### 2. Transpilers (IL Manipulation)
* Transpilers consume and emit `IEnumerable<CodeInstruction>`.
* Used to alter specific OpCodes without rewriting the entire method body.
* Always check OpCode operands before replacement:
```csharp
[HarmonyTranspiler]
public static IEnumerable<CodeInstruction> Transpiler(IEnumerable<CodeInstruction> instructions)
{
    foreach (var instruction in instructions)
    {
        // Replace ldc.r4 100.0f with custom multiplier
        if (instruction.opcode == OpCodes.Ldc_R4 && (float)instruction.operand == 100f)
            yield return new CodeInstruction(OpCodes.Ldc_R4, 250f);
        else
            yield return instruction;
    }
}
```

---

## 4. Teardown & Unpatching Invariants

* **Dynamic Unload Contract**: Patched methods reside in process memory. If patches are applied manually via `new Harmony("id").Patch(...)`, they remain resident even after plugin unloading unless explicitly unpatched in `Unload()`:
```csharp
void Unload()
{
    _harmonyInstance?.UnpatchAll(_harmonyInstance.Id);
}
```
* **Prefer `[AutoPatch]`**: `[AutoPatch]` is bound directly to the `CarbonPlugin` instance lifecycle, preventing zombie patches when plugins hot-reload during server execution.
