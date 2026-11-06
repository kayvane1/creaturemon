# Creaturemon Domain Vocabulary

Session is the durable play session boundary. It owns new-game setup, continue, save points, battle transitions, and one-shot world-entry effects while scenes adapt those results to Phaser.

Story Event is a typed gameplay fact emitted by adapters, such as entering a map, stepping on a trigger, confirming a starter, finishing a battle, or attempting a warp. The Story Runtime turns those events plus a snapshot into outcomes like flags, dialogue, teleports, battles, warp blocks, and saves.

Map Catalog is the source of map identity, loading, Tiled JSON normalization, map validation, and warp resolution. Runtime code, export scripts, and collision QA use the same catalog path.

Asset Catalog is the source of asset preload keys, animation creation, character scale, battle sprite lookup, battle backgrounds, and map sprite-key validation.

Interaction is the pure press-to-interact resolution step. It decides whether the tile in front of the player means NPC chat, starter choice, computer chat, prop dialogue, or no action.

Encounter is the pure wild-battle selection step. It decides whether the current tile and flags activate a zone, whether the rate roll hits, which weighted slot is selected, which level is rolled, and what BattleRequest should start.

Battle is the deterministic turn-rule engine. It owns move availability, damage, turn order, PP, status, fainting, XP, and level-up behavior while BattleScene renders snapshots and sends chosen moves back to the engine.
