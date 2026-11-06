Level 1 maps are authored as typed tile grids in `src/data/maps.ts` and exported here as Tiled-style JSON with:

The object/layer schema mirrors the intended Tiled export:

- `ground`
- `decoration`
- `above_player` (`above` in the typed prototype data)
- `collision`
- `warps`
- `npcs`
- `props`
- `encounter_zones`
- `spawn_points`
- `script_triggers`

Encounter zones require `table` and may set `requiredFlag` to gate wild battles behind story progress.

Run `npm run export:maps` after editing `src/data/maps.ts`.

When replacing placeholders with production maps, export Tiled JSON files here and keep the same object properties consumed by `src/systems/MapLoader.ts`.
