# Carbon Framework API & Architecture

## Overview

The Carbon mod loader extends Facepunch Rust dedicated servers with high-performance C# runtime APIs, Roslyn preview compilation, automated Harmony patching, zero-allocation UI builders, and cross-server networking.

---

## 1. Plugin Base Classes

### `Carbon.Plugins.CarbonPlugin` (Preferred)
Extends `RustPlugin` with native Carbon capabilities:
* Direct access to `LUI` and `cui.v2` fluent builders.
* Integrated `CustomVitalManager` for server HUD status bars.
* Asynchronous server shutdown hook: `public override async ValueTask OnAsyncServerShutdown()` to flush dirty data without freezing the engine process.
* Carbon Vault encryption integration.

### `Oxide.Plugins.RustPlugin` (Compatibility)
Used when cross-compatibility with Oxide/uMod servers is required. Avoids Carbon-only namespaces at the cost of losing LUI v2 and direct Bridge integration.

---

## 2. UI Systems: LUI v2 & CUI Delta Streaming

### The Full-Rebuild Performance Problem
Standard Oxide CUI transmits massive JSON strings over the network to create client canvas hierarchies. Destroying and recreating entire UI trees on state updates causes client FPS hitches and packet stalls.

### `cui.v2` Delta Streaming Protocol
1. **Send Base Structure Once**: Cache and transmit the structural background and containers when a player connects or opens a menu.
2. **Stream Dynamic Deltas**: Mutate only dynamic properties using targeted element names:
```csharp
// Update existing UI text without sending full JSON container
cui.v2.UpdateText(player, "hud_kill_counter", $"Kills: {count}");

// Update element color dynamically
cui.v2.UpdateColor(player, "hud_status_bar", "0.2 0.8 0.2 0.9");

// Update position / anchor coordinates
cui.v2.UpdatePosition(player, "hud_panel", "0.1 0.1", "0.3 0.3");
```

### Protected Commands
All UI button clicks invoke console commands. Untrusted clients can forge F1 console commands to trigger button callbacks with forged arguments.
* Enforce `[ProtectedCommand]` or `Community.Protect(command)` on all UI callback methods to assign randomized command tokens.

---

## 3. Player HUD: `CustomVitalManager`

Carbon provides `CustomVitalManager` to render status bars directly above the player's health HUD:
```csharp
// Register shared server-wide vital
CustomVitalManager.AddSharedVital("radiation_shield", "Shield", "0.1 0.7 0.9 1.0", "{timeleft:ss}");

// Player-specific vital
CustomVitalManager.AddVital(player, "combat_tag", "In Combat", "0.9 0.2 0.2 1.0", 30f);
```
* **Teardown Rule**: Shared vitals MUST be removed in `Unload()` via `CustomVitalManager.RemoveSharedVital("name")` to prevent ghost HUD indicators.

---

## 4. Cross-Server Networking: Carbon Bridge

The `Carbon.Components.Bridge` subsystem enables zero-broker WebSocket RPC communication between Rust dedicated servers:
* Utilizes zero-allocation buffer pooling:
```csharp
var packet = BridgeWrite.Rent();
try {
    packet.WriteString("SyncPlayerInventory");
    packet.WriteUInt64(player.userID);
    Bridge.Send(packet);
} finally {
    BridgeWrite.Return(ref packet);
}
```

---

## 5. Configuration & Sensitive Data Vault

Store configurations in strongly typed C# classes under `carbon/configs/`:
```csharp
public class Configuration
{
    [JsonProperty(PropertyName = "Config Version (DO NOT EDIT)", Order = int.MaxValue)]
    public VersionNumber Version = new VersionNumber(1, 0, 0);

    [JsonProperty(PropertyName = "Database Password")]
    [JsonConverter(typeof(Vault.Protected))]
    public string DatabasePassword = "secret_password";
}
```
* Properties annotated with `[JsonConverter(typeof(Vault.Protected))]` are stored encrypted via Carbon's hardware/server-bound Vault key.
