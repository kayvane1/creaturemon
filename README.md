# Creaturemon Level 1

A Phaser 3 + TypeScript vertical slice inspired by the opening loop of Gen 1 monster RPGs: bedroom, home, town, lab, starter choice, first rival battle, Route 1 encounters, Viridian stub, pause menu, and single-slot save/load.

## Run

```sh
npm install
npm run dev
```

Controls: arrow keys move, `Z`/`Enter` confirms, `X`/`Escape` cancels, `M`/`Space` opens the pause menu.

## Art And License Notes

The code in this prototype is original and may be licensed separately. Creature battle sprites, selected character sprites, and reference tilesets are vendored from <https://github.com/Tuxemon/Tuxemon> and are distributed under Creative Commons share-alike terms by the Tuxemon contributors. See `public/assets/TUXEMON_LICENSE` and `public/assets/TUXEMON_ATTRIBUTIONS.md`.

The overworld still uses generated placeholder tile textures for fast iteration, while the exported map JSON and vendored tilesets are ready for a full Tiled art pass.
