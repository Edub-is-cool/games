# Battle Strategy Game — Real-Time Strategy (AoE-style)

## Engine & Stack

- **Engine**: Phaser 3 (v3.80+)
- **Language**: TypeScript
- **Build Tool**: Vite
- **Package Manager**: npm

## Game Type

Real-time strategy (RTS) inspired by Age of Empires. Core pillars:
- **Resource gathering**: Villagers collect food, wood, stone, gold
- **Base building**: Construct buildings to unlock units and tech
- **Unit production & control**: Train military units, group select, attack-move
- **Combat**: Rock-paper-scissors unit counters, formation matters
- **Fog of war**: Only see what your units can see
- **AI opponent**: Computer player with basic economic and military AI

## Project Structure

```
battle/
├── src/
│   ├── main.ts              # Phaser game config & entry point
│   ├── scenes/
│   │   ├── BootScene.ts     # Asset preloading
│   │   ├── MenuScene.ts     # Main menu
│   │   ├── GameScene.ts     # Core RTS gameplay scene
│   │   └── HUDScene.ts      # Overlay UI (resources, minimap, commands)
│   ├── entities/
│   │   ├── Unit.ts          # Base unit class (move, attack, gather)
│   │   ├── Building.ts      # Base building class (produce, research)
│   │   └── Resource.ts      # Resource nodes (trees, mines, farms)
│   ├── systems/
│   │   ├── GameWorld.ts     # Central game state, entity registry
│   │   ├── CommandSystem.ts # Unit command queue (move, attack, build, gather)
│   │   ├── CombatSystem.ts  # Damage calc, armor types, unit counters
│   │   ├── EconomySystem.ts # Resource tracking, costs, income rates
│   │   ├── Pathfinding.ts   # A* or flow-field on the tile grid
│   │   ├── FogOfWar.ts      # Visibility per player
│   │   ├── AISystem.ts      # Computer player decision-making
│   │   └── SelectionSystem.ts # Box select, click select, control groups
│   ├── ui/
│   │   ├── Minimap.ts       # Minimap renderer
│   │   ├── CommandPanel.ts  # Bottom-center action buttons
│   │   └── ResourceBar.ts   # Top resource display
│   ├── config/
│   │   ├── units.ts         # Unit stats, costs, speeds
│   │   ├── buildings.ts     # Building stats, costs, what they unlock
│   │   └── tech.ts          # Tech tree / age advancement
│   └── utils/
│       ├── TileGrid.ts      # Grid helpers, coordinate conversion
│       └── QuadTree.ts      # Spatial indexing for entity queries
├── public/
│   └── index.html
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Development

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (Vite)
npm run build      # Production build
```

## Architecture Principles

- **ECS-lite**: Entities (units, buildings, resources) hold data. Systems operate on them each frame. Scenes render.
- **Game loop**: Phaser's `update(time, delta)` drives all systems. Systems process in order: Input → Commands → Economy → Pathfinding → Combat → AI → FogOfWar → Render.
- **GameWorld** is the single source of truth for all game state. Systems read/write GameWorld, scenes read it for rendering.
- **Command pattern**: Player actions become commands queued on units (move, attack, build, gather). This keeps input decoupled from execution.
- **Config-driven**: Unit stats, building costs, tech trees defined in `src/config/` data files — not hardcoded in logic.

## Conventions

- One class per file, named to match the class (e.g., `Unit.ts` exports `Unit`)
- Scenes extend `Phaser.Scene` and live in `src/scenes/`
- All game logic lives in `src/systems/`, never in scene files
- Use Phaser's tilemap for terrain; entities are sprites positioned on the grid
- Keep rendering separate from game state
- Prefer composition over inheritance for entities
- Use `delta` time for all movement/cooldowns — never assume fixed frame rate
