# Ore-bit

## Overview
A top-down space game where the player pilots a mining ship through an asteroid field, harvests ore, dodges (or fights) pirates, and spends earnings on ship upgrades. The name is a pun on *orbit* — you're in orbit, you're after ore.

## Tech Stack
- **HTML5 Canvas** — rendering
- **CSS3** — HUD layout and menus
- **Vanilla JavaScript** — game loop, physics, input, state
- No external dependencies or frameworks (matches `emoji-battle/` and `FARKLE/`)

## Gameplay
- **Movement** — thrust (W/↑), brake (S/↓ — bleeds speed in current direction), rotate (A D / ← →), inertia/drift in vacuum
- **Mining** — fire the mining laser with Space; targets the closest pirate or asteroid in a forward cone
- **Cargo** — ore goes into a weight-limited hold and must be sold at the station for credits
- **Station** — at world origin. Approach within 130u and press **E** to dock. Sell cargo and buy upgrades.
- **Zones** — three concentric belts:
  - **Inner Belt** (0–1500u): iron, copper, gold, crystal. Safe — no pirates, no hazard.
  - **Mid Reach** (1500–2900u): titanium, plasma. Requires Shielding tier 1; raiders patrol here.
  - **Deep Void** (2900–4500u): dark matter, antimatter. Requires Shielding tier 2; marauders patrol here.
- **Pirates** — chase the ship, fire bullets, ram on contact. Killed by mining laser. Drop a yellow bounty token (auto-collects to credits, doesn't take cargo). Spawn capped per zone.
- **Upgrades** — Hull, Cargo, Laser, Thrusters, Shielding. Each has 3–4 tiers with rising costs.
- **Persistence** — credits and upgrades save to `localStorage` (key `orebit-save-v1`). Cargo is lost on death.
- **Loss** — when hull reaches 0; restart with full hull and same upgrades.

## Project Structure
```
ore-bit/
├── CLAUDE.md
├── index.html      — entry point, canvas + HUD
├── style.css       — HUD, menus, station UI
└── game.js         — game loop, entities, physics, input
```
If `game.js` grows large, split by concern: `entities.js`, `physics.js`, `ui.js`.

## Conventions
- ES6+ (const/let, classes, modules optional via `<script type="module">`)
- Single shared `state` object for game state; avoid globals scattered across files
- Fixed timestep game loop (`requestAnimationFrame` + accumulator) for stable physics
- Render in world coordinates with a camera transform; HUD draws in screen coordinates
- No build step — open `index.html` directly in a browser

## Design Goals
- Feels good to fly: weighty inertia, satisfying laser/explosion feedback
- Readable at a glance: ore types color-coded, threat indicators on edge of screen
- Short loop (1–3 min runs) with persistent upgrades to keep the player coming back
- Works on desktop; mobile is a stretch goal (touch controls)

## Landing Page Integration
After the first playable build, add a card to the root `index.html` linking to `ore-bit/index.html`, following the pattern used by the other games.
