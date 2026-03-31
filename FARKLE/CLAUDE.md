# Farkle Dice Game

## Overview
A web-based implementation of the classic Farkle dice game, playable in the browser.

## Tech Stack
- **HTML5** — game structure and layout
- **CSS3** — styling, animations, responsive design
- **Vanilla JavaScript** — game logic, DOM manipulation, state management
- No external dependencies or frameworks

## Game Rules
- Players take turns rolling 6 dice
- After each roll, the player must set aside at least one scoring die
- Scoring combinations:
  - Single 1 = 100 points
  - Single 5 = 50 points
  - Three of a kind: 1s = 1000, 2s = 200, 3s = 300, 4s = 400, 5s = 500, 6s = 600
  - Four of a kind = 2x three-of-a-kind score
  - Five of a kind = 4x three-of-a-kind score
  - Six of a kind = 8x three-of-a-kind score
  - Straight (1-2-3-4-5-6) = 1500
  - Three pairs = 1500
- A "Farkle" occurs when no scoring dice are rolled — the player loses all points accumulated that turn
- A player may stop and bank points after any scoring roll
- If all 6 dice score ("hot dice"), the player may roll all 6 again and continue accumulating points
- First player to reach 10,000 points wins (other players get one final turn)

## Project Structure
```
FARKLE/
├── CLAUDE.md
├── index.html      — main HTML file, entry point
├── style.css       — all styles
└── script.js       — all game logic and UI interaction
```

## Conventions
- Keep all code in three files: `index.html`, `style.css`, `script.js`
- Use semantic HTML elements
- Use CSS custom properties for theming (colors, spacing)
- Use ES6+ JavaScript (const/let, arrow functions, template literals)
- Game state should be managed in a single state object
- No build tools required — open `index.html` directly in a browser to play

## Design Goals
- Clean, modern UI with dice visuals (not just numbers)
- Responsive layout that works on desktop and mobile
- Clear visual feedback for scoring, selection, and farkles
- Support for 2–4 players (local hot-seat multiplayer)
