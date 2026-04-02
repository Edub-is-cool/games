# The Jumping Cup

## Overview
A "follow the cup" shell game built for the browser. Three cups are shown, a ball is placed under one, the cups shuffle, and the player must pick the correct cup.

## Stack
- Phaser 3
- TypeScript
- Vite

## Development
```bash
cd "The Jumping Cup"
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

## Structure
```
The Jumping Cup/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── CLAUDE.md
├── src/
│   ├── main.ts          # Phaser game config and entry point
│   └── scenes/
│       └── GameScene.ts  # Main game scene — cup display, shuffling, selection
└── dist/                 # Production build output
```

## Game Mechanics
- 3 cups displayed on screen
- Ball is shown under one cup, then cups lower to hide it
- Cups shuffle with animated sliding movements
- Player clicks a cup to guess where the ball is
- Score tracks correct/incorrect guesses
- Difficulty increases over rounds (more shuffles, faster speed)

## Conventions
- Keep all game logic in `src/scenes/GameScene.ts`
- Use Phaser 3 graphics primitives (no external sprite assets)
- Follow the same Phaser + TypeScript + Vite pattern as sibling projects (battle/, Dragon cave/)
