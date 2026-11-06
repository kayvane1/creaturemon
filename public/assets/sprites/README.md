Character overworld sprites are loaded through the Asset Catalog in `src/systems/assets/AssetCatalog.ts`:

- `player_overworld` -> `upgraded/player_hoodie_walk.png`
- `npc_mom_overworld` -> `upgraded/mom_walk.png`
- `npc_oak_overworld` -> `upgraded/professor_walk.png`
- `npc_rival_overworld` -> `upgraded/rival_walk.png`
- `npc_townie_overworld` -> `upgraded/townie_adult_walk.png`
- `npc_townie_kid_overworld` -> `upgraded/townie_kid_walk.png`
- `npc_townie_trainer_overworld` -> `upgraded/townie_trainer_walk.png`

These upgraded files are 384x256 sheets arranged as four directional rows (`down`, `left`, `right`, `up`) and six 64x64 animation columns. `npm run qa:sprites` reads the same Asset Catalog entries.

Creature battle sprites, props, UI cursors, battle backgrounds, and effect sheets are also cataloged in `AssetCatalog.ts`. Runtime procedural texture generation has been retired.

Final Level 1 art should be replaced with credited Tuxemon-derived sprites or other compatible assets.
