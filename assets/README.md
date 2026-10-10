# Game Assets

## Characters

`character/<id>/` contains one standalone SVG per animation frame: `idle.svg`, `walk-a.svg`, `walk-b.svg`, and `attack.svg`. `portrait.svg` is the static selection/HUD portrait. `character/manifest.json` records frame paths, dimensions, and render anchors.

The game loads these files directly. Regenerate the initial pixel-art exports with `node scripts/build-character-assets.mjs`; this overwrites edited character SVGs.

## Icons

`icons/<symbol-id>.svg` contains standalone, openable icons. The game uses `icons.bundle.svg` so its UI only references one sprite sheet. `game-icons.svg` is the editable source collection; after changing it, run `node scripts/build-icons.mjs` to rebuild both the standalone files and bundle.