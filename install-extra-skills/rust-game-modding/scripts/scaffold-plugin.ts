#!/usr/bin/env bun
import { writeFileSync } from "node:fs";

function generatePluginScaffold(name: string, author: string = "Developer", version: string = "1.0.0"): string {
  const [major, minor, patch] = version.split(".").map((n) => parseInt(n, 10) || 0);

  return `using System;
using System.Collections.Generic;
using Carbon.Base;
using Carbon.Components;
using Newtonsoft.Json;
using Oxide.Core;
using Oxide.Core.Plugins;
using UnityEngine;

namespace Carbon.Plugins
{
    [Info("${name}", "${author}", "${version}")]
    [Description("Production-grade Carbon plugin for Facepunch Rust on Unity 6.")]
    public class ${name} : CarbonPlugin
    {
        private Configuration _config;
        private Timer _hudTimer;

        #region Configuration

        public class Configuration
        {
            [JsonProperty(PropertyName = "Config Version (DO NOT EDIT)", Order = int.MaxValue)]
            public VersionNumber Version = new VersionNumber(${major}, ${minor}, ${patch});

            [JsonProperty(PropertyName = "Enabled")]
            public bool Enabled = true;

            [JsonProperty(PropertyName = "HUD Refresh Interval (Seconds)")]
            public float RefreshInterval = 5f;
        }

        protected override void LoadDefaultConfig() => _config = new Configuration();

        protected override void LoadConfig()
        {
            base.LoadConfig();
            try
            {
                _config = Config.ReadObject<Configuration>();
                if (_config == null) throw new Exception();
            }
            catch
            {
                PrintWarning("Configuration file corrupt; creating default configuration.");
                LoadDefaultConfig();
            }
            SaveConfig();
        }

        protected override void SaveConfig() => Config.WriteObject(_config, true);

        #endregion

        #region Lifecycle & Teardown

        private void Init()
        {
            if (!_config.Enabled)
            {
                Unsubscribe(nameof(OnEntityTakeDamage));
                return;
            }
        }

        private void OnServerInitialized(bool initial)
        {
            if (!_config.Enabled) return;

            Puts("${name} initialized successfully.");
            _hudTimer = timer.Every(_config.RefreshInterval, RefreshAllHUDs);
        }

        private void Unload()
        {
            // Destroy all timers
            _hudTimer?.Destroy();
            _hudTimer = null;

            // Destroy all active CUI on clients
            foreach (var player in BasePlayer.activePlayerList)
            {
                if (player != null && player.IsConnected)
                {
                    cui.v2.Destroy(player, "${name}_HUD");
                }
            }
        }

        #endregion

        #region UI & Commands

        private void RefreshAllHUDs()
        {
            for (int i = 0; i < BasePlayer.activePlayerList.Count; i++)
            {
                var player = BasePlayer.activePlayerList[i];
                if (player == null || !player.IsConnected) continue;

                // Stream delta update to avoid recreating full JSON UI trees
                cui.v2.UpdateText(player, "${name}_StatusText", "Status: Active");
            }
        }

        [ProtectedCommand("${name.toLowerCase()}.action")]
        private void OnProtectedAction(BasePlayer player, string command, string[] args)
        {
            if (player == null || !player.IsConnected) return;
            player.ChatMessage("Protected action executed securely.");
        }

        #endregion

        #region Hooks

        private void OnEntityTakeDamage(BaseCombatEntity entity, HitInfo info)
        {
            if (entity == null || info == null || entity.IsDestroyed) return;

            // Hot hook: zero heap allocations, zero LINQ, zero string interpolation
            var players = Facepunch.Pool.Get<List<BasePlayer>>();
            try
            {
                for (int i = 0; i < BasePlayer.activePlayerList.Count; i++)
                {
                    var p = BasePlayer.activePlayerList[i];
                    if (p != null && p.IsConnected && p.Distance2D(entity) < 15f)
                    {
                        players.Add(p);
                    }
                }
            }
            finally
            {
                Facepunch.Pool.Free(ref players);
            }
        }

        #endregion
    }
}
`;
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: bun run scaffold-plugin.ts <PluginName> [Author] [Version] [--out <filepath>]");
  process.exit(args.length === 0 ? 1 : 0);
}

const pluginName = args[0];
const author = args[1] && !args[1].startsWith("--") ? args[1] : "Developer";
const version = args[2] && !args[2].startsWith("--") ? args[2] : "1.0.0";
const outIdx = args.indexOf("--out");
const outFile = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;

const code = generatePluginScaffold(pluginName, author, version);

if (outFile) {
  writeFileSync(outFile, code, "utf-8");
  console.log(`Scaffolded ${pluginName} to ${outFile}`);
} else {
  console.log(code);
}
