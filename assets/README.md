# Game Assets

## Build the playable package

From the repository root, run:

```sh
node scripts/build-assets.mjs
```

This cross-platform Node.js script validates the character manifest and registered media paths, regenerates the standalone icons and runtime icon bundle, then copies the playable static site into `dist/`. The package includes the game pages, `assets/`, `css/`, `js/`, design/story/management files, and `asset-manifest.json`. Preview the package locally with:

```sh
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000/` and test the actual packaged game. `dist/` is generated output and is ignored by Git. Rebuild after changing project assets; do not deploy a stale `dist/` folder.

## Characters

`character/<id>/` contains one standalone SVG per animation frame: `idle.svg`, `walk-a.svg`, `walk-b.svg`, and `attack.svg`. `portrait.svg` is the static selection/HUD portrait. `character/manifest.json` records frame paths, dimensions, and render anchors. The game loads these SVGs directly, and the packager verifies that each registered frame exists.

Regenerate the initial pixel-art exports with `node scripts/build-character-assets.mjs` only when changing the source sprite definitions in `js/sprites.js` or `js/sprite_defs.js`; this overwrites edited character SVGs. Re-run `node scripts/build-assets.mjs` after regeneration.

## Icons

`icons/<symbol-id>.svg` contains standalone, openable icons. The game uses `icons.bundle.svg` so its UI only references one sprite sheet. `game-icons.svg` is the editable source collection. The management console synchronizes these when saving an icon; rebuild the standalone exports and bundle with `node scripts/build-icons.mjs` or run the full package command above. The icon build script uses Node.js and does not require Windows PowerShell.

## Audio and illustrations

The management console imports audio into `audio/` and illustrations into `illustrations/`, and records them in `../design/management/asset-catalog.json`. The package validates and includes registered files and catalog metadata; imported files can be fetched from the packaged site by their recorded path.

Packaging does not automatically connect an imported sound to a gameplay event or place an illustration on a game screen. The current hit/kill sound effects are synthesized by Web Audio in `../js/sound.js`; replacing them with recordings or adding illustration slots requires a deliberate runtime feature change in addition to importing and packaging files.