# Games Portfolio

## Overview
A collection of browser-playable games, published via a static landing page.

## Projects

| Directory      | Game               | Stack                        |
|----------------|--------------------|------------------------------|
| `battle/`      | Battle of the Ages | Phaser 3, TypeScript, Vite   |
| `dark-tunnels/`| Dark Tunnels       | Godot 4 (GL Compatibility)   |
| `FARKLE/`      | Farkle             | Vanilla HTML/CSS/JS          |
| `Dragon cave/` | Dragon Cave        | Phaser 3, TypeScript, Vite   |

## Structure
```
Games/
├── index.html          # Landing page that links to each game
├── battle/             # Phaser 3 RTS — run `npm run dev` or `npm run build`
├── dark-tunnels/       # Godot project — web export in dark-tunnels-web.zip
├── FARKLE/             # Static site — open index.html directly
├── Dragon cave/        # Phaser 3 dungeon crawler — run `npm run dev` or `npm run build`
└── CLAUDE.md
```

## Development

- **Battle**: `cd battle && npm install && npm run dev`
- **FARKLE**: Open `FARKLE/index.html` in a browser (no build step)
- **Dark Tunnels**: Open in Godot 4.x editor, or use the web export zip
- **Dragon Cave**: `cd "Dragon cave" && npm install && npm run dev`

## Conventions
- Each game is self-contained in its own directory with its own CLAUDE.md
- The root `index.html` is a static landing page — no build tools, no dependencies
- Keep the landing page lightweight and purely static HTML/CSS
