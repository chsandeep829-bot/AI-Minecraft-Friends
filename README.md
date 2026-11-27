# AI Minecraft Friends

A Minecraft Bedrock add-on for spawning and managing player-style companion characters.

## Current status — Phase 2 prototype

Implemented:
- Behavior Pack + Resource Pack with linked manifests.
- Custom humanoid companion geometry and included 64×64 texture.
- Spawn up to 8 named companions per player in the current Android-oriented performance profile.
- Follow, stay, teleport, list, rename, and remove commands.
- Per-companion role, task, and inventory ledger stored as entity dynamic properties.
- Offline text intent shortcuts for the implemented commands.
- **Nearby item pickup:** companions can collect dropped item entities into their own persistent virtual inventory ledger.
- **Limited mining tasks:** companions can move toward and remove nearby supported blocks, recording the configured output in their ledger.
- Roles: companion, miner, collector.
- GitHub Actions validation and `.mcaddon` packaging.

Important Phase 2 limitations:
- The companion inventory is a persistent add-on ledger, not a vanilla player/container inventory UI.
- Mining is a controlled prototype: it supports a fixed allowlist of logs, stone/cobblestone, and coal/iron/copper ores. It records mapped outputs in the ledger; it does not yet simulate tool requirements, enchantments, block loot tables, or vanilla drops.
- The companion uses simple impulse movement toward nearby targets, not full pathfinding. It may fail around obstacles or uneven terrain.
- Item collection only searches dropped item entities close to the companion.
- Building, combat, independent exploration/survival, custom skin importing, online AI, and a graphical management screen are not implemented yet.

## Compatibility
The pack targets the stable `@minecraft/server` 2.0.0 module and declares minimum engine version 1.21.90. The requested label “Bedrock 26.66” is not verified as a public Bedrock release/API target here. Compatibility must be tested in the exact Android Minecraft build; GitHub validation does not replace an in-game test.

## Install on Android
1. Download the `.mcaddon` from the latest successful GitHub Actions build artifact.
2. Open it with Minecraft and allow both packs to import.
3. Enable **AI Friends BP** and **AI Friends RP** in a world.
4. Enable any Script API/Beta APIs experiment required by your installed Minecraft build.
5. Enter the world and use the chat commands below.

## Chat commands
- `!friends help`
- `!friends spawn Alex` or `!friends spawn 3`
- `!friends list`
- `!friends follow Alex` / `!friends follow all`
- `!friends stay Alex` / `!friends stay all`
- `!friends come Alex`
- `!friends rename Alex Nova`
- `!friends role Alex miner` (also `collector` or `companion`)
- `!friends mine Alex oak_log` (also `stone`, `coal_ore`, `iron_ore`, etc.)
- `!friends collect Alex`
- `!friends inventory Alex`
- `!friends task Alex`
- `!friends stop Alex`
- `!friends remove Alex`

The mining task works on nearby supported blocks and is capped at 12 blocks per task. To gather more, issue the command again after the friend finishes.

## Source layout
- `behavior_pack/` — entity behavior, manifest, and Script API logic
- `resource_pack/` — entity client definition, humanoid geometry, texture, and manifest
- `scripts/validate.mjs` — local source validation
- `.github/workflows/build-addon.yml` — validation and `.mcaddon` packaging

## Security
No API key is embedded. Online AI is not implemented yet. Any future online AI service must keep credentials server-side and expose only a restricted HTTPS endpoint to the add-on.
