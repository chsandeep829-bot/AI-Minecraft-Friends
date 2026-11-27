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
- Roles: companion, miner, collector, builder, scout.
- GitHub Actions validation and `.mcaddon` packaging.

Important Phase 2 limitations:
- The companion inventory is a persistent add-on ledger, not a vanilla player/container inventory UI.
- Mining is a controlled prototype: it supports a fixed allowlist of logs, stone/cobblestone, and coal/iron/copper ores. It records mapped outputs in the ledger; it does not yet simulate tool requirements, enchantments, block loot tables, or vanilla drops.
- The companion uses simple impulse movement toward nearby targets, not full pathfinding. It may fail around obstacles or uneven terrain.
- Item collection only searches dropped item entities close to the companion.
- Combat, long-range independent survival, custom skin importing, online AI, and a graphical management screen are not implemented yet.

## Phase 3 prototype — building and cautious exploration

Added:
- `!friends build Alex hut`: asks Alex to build a small 3×3 oak-log shelter near the player.
- Building requires 24 `oak_log) in that companion's virtual inventory ledger.
- The hut builder checks for a flat 3×3 solid foundation and an unobstructed build volume before starting. It places one block per task tick, only into air, and deducts one ledger log per successful placement.
- `!friends explore Alex` (or `scout`) starts short-range cautious wandering. It selects nearby positions only when the target has a solid non-liquid floor and two air blocks above.
- Roles now include `builder` and `scout`.

Phase 3 limitations:
- Only the predefined hut blueprint is supported; this is not free-form natural-language construction or schematic import.
- The hut is made of oak logs, not crafted planks, and its materials are tracked in the add-on's virtual ledger rather than a vanilla inventory.
- Construction uses a fixed offset beside the player and simple movement; it can fail if terrain is obstructed, uneven, or the companion cannot reach the site. A partial build is not automatically rolled back.
- Exploration is a short safe-step wander in the player's current dimension. It does not gather resources, cross caves, travel long distances, or perform independent survival.
- Minecraft Android in-game behavior has not been runtime-tested. GitHub CI validates syntax, JSON and packaging only.

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
- `!friends build Alex hut` (requires 24 oak_log in Alex's virtual inventory)
- `!friends explore Alex` / `!friends scout Alex`
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


Phase 2 source is validated by the repository's automated GitHub Actions workflow.
