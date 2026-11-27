# AI Minecraft Friends

A Minecraft Bedrock add-on for spawning and managing player-style companion characters.

## Current status — Phase 1 foundation
Implemented in this repository:
- Behavior Pack + Resource Pack with linked manifests
- Custom humanoid companion entity and included 64×64 skin texture
- Spawn multiple named companions (configurable, capped at 8 per player by default)
- Follow, stay, teleport, list, rename, and remove commands
- Basic offline natural-language intent matching for the supported commands
- Per-companion owner/name/state tags persisted with the entity
- Android installation guide and JSON/JavaScript validation workflow

Not yet implemented: true block mining, inventory management, construction, combat AI, independent survival, online AI service, custom skin importing, and a full in-game graphical management screen. These are planned phases, not claimed features.

## Compatibility
The requested label “Bedrock 26.66” could not be independently verified as a public Bedrock release/API target. The pack declares a conservative minimum engine version of 1.21.0 and uses the stable `@minecraft/server` 2.0.0 module contract. Actual compatibility must be tested in the exact Android Minecraft build; the version label alone is not treated as proof.

## Install on Android
1. Download the packaged `.mcaddon` from the repository's successful GitHub Actions build artifact.
2. Open the file with Minecraft. Allow Minecraft to import both packs.
3. Create/edit a world, enable **AI Friends BP** and **AI Friends RP** under Behavior Packs and Resource Packs.
4. Enable the **Beta APIs / Script API** experiment if your Minecraft build requires it for the declared script module.
5. Enter the world and use the chat commands below.

## Chat commands
- `!friends help`
- `!friends spawn Alex`
- `!friends spawn 3` (creates Friend1–Friend3; max 8 at once)
- `!friends list`
- `!friends follow Alex` or `!friends follow all`
- `!friends stay Alex` or `!friends stay all`
- `!friends come Alex` or `!friends come all`
- `!friends rename Alex Nova`
- `!friends remove Alex`
- `!friends remove all`

Natural-language shortcuts such as “friends follow me”, “stay here”, and “come to me” are also recognized. Commands are text-chat based.

## Source layout
- `behavior_pack/` — entity behavior, manifest, and Script API logic
- `resource_pack/` — entity client definition, humanoid geometry, texture, and manifest
- `scripts/validate.mjs` — local source validation
- `.github/workflows/build-addon.yml` — validates and packages the `.mcaddon`

## Security
No API key is included. The online AI backend is not part of Phase 1. When added, it will use a server-side secret and a restricted HTTPS endpoint; credentials must never be embedded in the add-on.
