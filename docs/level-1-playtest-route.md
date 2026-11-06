# Level 1 Playtest Route

Use this route after changes to maps, story flags, warps, encounters, battle, menus, or save/load.

## Setup

1. Open the game in normal mode with no `?debug` query string.
2. Start `New Game`.
3. Accept the default player and rival names.

## Route

1. Confirm the player starts in the bedroom with no debug overlay.
2. Walk down onto the visible stairs.
3. Confirm downstairs loads, Mom dialogue starts once, and the front door is visible.
4. Close Mom dialogue, walk left to the door, then step down into Pallet Town.
5. Walk north toward the Route 1 exit.
6. Confirm Oak intercept triggers once and transfers the player to the lab.
7. Walk to a starter capsule, confirm the starter choice, and advance Rival dialogue.
8. In the Rival battle, choose `Fight`, use attacks until the battle ends, and confirm the lab post-battle dialogue opens Route 1.
9. Leave the lab through the visible door.
10. Walk north through Pallet Town onto Route 1.
11. Confirm wild encounters can trigger in grass.
12. In a wild battle, choose `Run` and confirm the player returns to the same Route 1 position.
13. Continue north to Viridian.
14. Confirm the Viridian stub loads and the “To be continued” dialogue triggers.
15. Refresh the page, choose `Continue`, and confirm the player restores in Viridian with story progress intact.

## Debug Check

1. Reload without `?debug` and confirm no map, coordinate, or flag text is visible.
2. Reload with `?debug` and confirm the compact map, coordinate, and flag panel appears at the top-left of the canvas.
3. Press `F3` and confirm the debug panel hides and shows without affecting movement.
