# Royale — Online Multiplayer 3D Battle Royale (.io style)

## Engine & Stack

- **Renderer**: Three.js
- **Language**: TypeScript
- **Build Tool**: Vite
- **Package Manager**: npm
- **Multiplayer**: PartyKit (rooms backed by Cloudflare Durable Objects)
- **Hosting**: Static client on the same surface as the rest of the portfolio; PartyKit deployed separately for the server

## Game Type

A stripped-down, .io-flavored battle royale. Goals are pick-up-and-play accessibility, short matches, and netcode that stays simple enough for one developer to maintain.

Core pillars:
- **Top-down 3D camera** — orthographic-ish or angled follow-cam. Avoids FPS hit-registration complexity, keeps the 3D look.
- **Short matches** — 3–5 minutes, lobby fills to ~10–20 players then drops in.
- **Shrinking zone** — circular safe zone closes in stages; outside the zone deals tick damage.
- **Auto-attack combat** — players aim with the mouse; attacks fire on a cooldown rather than per-click hit-scan. Damage is server-authoritative.
- **Light loot** — 3–4 weapon tiers + a few consumables (heal, shield, speed). Pickups spawn on the ground; no inventory grid.
- **Last player standing wins** — leaderboard at the end, then back to the lobby.

Explicitly out of scope (for v1):
- Full FPS aiming / hit-scan precision
- Building / destruction
- Vehicles
- Persistent accounts, cosmetics, progression

## Project Structure

```
royale/
├── client/
│   ├── src/
│   │   ├── main.ts              # Three.js bootstrap + game loop
│   │   ├── net/
│   │   │   ├── PartyClient.ts   # PartyKit client, room join, snapshot decoding
│   │   │   └── Interpolation.ts # Buffered snapshot interpolation
│   │   ├── scenes/
│   │   │   ├── LobbyScene.ts    # Pre-match waiting room
│   │   │   ├── MatchScene.ts    # In-game scene
│   │   │   └── ResultsScene.ts  # End-of-match leaderboard
│   │   ├── entities/
│   │   │   ├── Player.ts        # Local + remote player rendering
│   │   │   ├── Pickup.ts        # Loot items in the world
│   │   │   └── Projectile.ts    # Bullets/attacks
│   │   ├── systems/
│   │   │   ├── Input.ts         # Mouse/keyboard + touch input
│   │   │   ├── Camera.ts        # Top-down follow camera
│   │   │   ├── ZoneRenderer.ts  # Shrinking zone visuals
│   │   │   └── HUD.ts           # Health, ammo, players-alive, zone timer
│   │   └── world/
│   │       ├── Map.ts           # Static map geometry + collision
│   │       └── Assets.ts        # Loaders, low-poly models
│   ├── public/
│   └── index.html
├── server/                       # PartyKit server
│   ├── src/
│   │   ├── room.ts              # PartyServer entry; player join/leave, tick loop
│   │   ├── match.ts             # Match lifecycle (lobby → countdown → live → ended)
│   │   ├── world.ts             # Authoritative world state
│   │   ├── physics.ts           # Movement integration, collision
│   │   ├── combat.ts            # Damage application, kill/death tracking
│   │   ├── zone.ts              # Shrinking zone schedule + damage ticks
│   │   ├── loot.ts              # Pickup spawning
│   │   └── protocol.ts          # Shared message schemas (input, snapshot, events)
│   └── partykit.json
├── shared/                       # Code used by both client and server
│   └── src/
│       ├── constants.ts         # Tick rate, world size, zone schedule
│       └── types.ts             # Snapshot, input, event types
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Development

```bash
npm install                   # Install dependencies (root workspace)
npm run dev                   # Run client (Vite) and server (PartyKit) together
npm run dev:client            # Client only
npm run dev:server            # PartyKit dev server only
npm run build                 # Production build of client
npm run deploy:server         # Deploy PartyKit server
```

## Networking Model

- **Server-authoritative.** Clients send inputs; the server simulates and broadcasts snapshots. Clients never decide damage or movement outcomes.
- **Tick rate**: 20 Hz server simulation, 60 fps client render.
- **Input messages**: small, frequent (`{ seq, dx, dy, aimX, aimY, fire, useItem }`).
- **Snapshots**: server broadcasts world state at tick rate. Use delta encoding once a baseline is in place; start with full snapshots until the protocol settles.
- **Interpolation**: clients render ~100 ms behind the latest snapshot, interpolating between two received states. Local player uses input prediction with reconciliation against authoritative snapshots.
- **No client-side hit detection.** Attacks are validated on the server using lag-compensated positions.

## Architecture Principles

- **Single source of truth lives on the server.** The client is a renderer + input pipe.
- **Shared types in `shared/`.** Snapshot, input, and event shapes are imported by both sides — never duplicate.
- **Deterministic-ish simulation**: fixed-step integration on the server using a shared `dt`. Don't rely on wall-clock time inside game logic.
- **Match lifecycle as a state machine**: `Lobby → Countdown → Live → Ended → Lobby`. Transitions are server-driven and broadcast as events.
- **Config-driven balance**: weapon stats, zone schedule, player speed in `shared/src/constants.ts` so both sides agree.
- **Low-poly aesthetic**: primitive meshes + flat shading first; swap in models later. Art should never block gameplay work.

## Conventions

- One class/module per file; filename matches the export.
- Server code never imports from `client/`; client code never imports from `server/`. Both can import from `shared/`.
- Keep per-tick allocations in the server hot path to a minimum (reuse vectors, avoid object literals in loops).
- All movement and cooldowns use `dt` — never assume fixed frame rate on the client, never assume fixed tick interval on the server (use measured delta).
- Network messages are typed and versioned; bumping the protocol bumps a version constant in `shared/`.
- No secrets in client code. Room authorization (if added) goes through the PartyKit server.
