# Dragon Cave — Dungeon Crawler

## Overview
A browser-playable dungeon crawler set in a dragon's cave. Explore procedurally generated floors, fight monsters, collect loot, and descend deeper toward the dragon's lair.

## Stack
- **Engine**: Phaser 3 (v3.80+)
- **Language**: TypeScript
- **Bundler**: Vite
- **Target**: Web (browser) — no native dependencies

## Development

```bash
cd "Dragon cave"
npm install
npm run dev      # Dev server with hot reload
npm run build    # Production build to dist/
```

## Project Structure
```
Dragon cave/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html            # Vite entry point
├── public/               # Static assets (sprites, tilemaps, audio)
│   └── assets/
└── src/
    ├── main.ts           # Phaser game config & bootstrap
    ├── scenes/           # Phaser scenes (Boot, Menu, Game, GameOver)
    ├── entities/         # Player, enemies, items
    ├── systems/          # Combat, inventory, dungeon generation
    ├── ui/               # HUD, menus, dialogs
    └── utils/            # Helpers (RNG, pathfinding, constants)
```

## Game Design

### Core Loop
1. Enter a dungeon floor
2. Explore rooms / corridors (fog of war, tile-based movement)
3. Fight enemies in real-time or turn-based combat
4. Collect loot and manage inventory
5. Find the stairs down to the next floor
6. Reach and defeat the dragon boss

### Key Features
- Procedural dungeon generation (rooms + corridors algorithm)
- Tile-based movement with smooth tweened transitions
- Fog of war / line-of-sight visibility
- Enemy AI with basic pathfinding
- Simple inventory and equipment system
- Multiple dungeon floors with increasing difficulty
- Dragon boss encounter on the final floor

### Art Style
- Top-down 2D pixel art (16x16 or 32x32 tile size)
- Use free/open-source asset packs or programmatic placeholder graphics

## Conventions
- All game logic lives in `src/` — no logic in `index.html`
- Scenes handle lifecycle; entities and systems hold reusable logic
- Keep Phaser-specific API calls in scenes and entities; systems should be engine-agnostic where practical
- Use Phaser's built-in tilemap support for dungeon rendering
- No external runtime dependencies beyond Phaser — keep the bundle lean
- Assets go in `public/assets/`, organized by type (sprites, tilemaps, audio)
