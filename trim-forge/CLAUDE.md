# Trim Forge

## Overview
A Minecraft **Java Edition armor trim previewer**. Pick a trim pattern and trim material,
put it on any armor from leather to netherite, and see the result on a pixel-art figure.
Every piece is configured **independently** — the helmet can be diamond with a Silence/amethyst
trim while the chestplate is netherite with Eye/gold and the boots are bare iron. It also emits
the matching `/give` commands.

Not a game — a tool. It lives in the games portfolio because it shares the same static,
zero-dependency setup.

## Tech Stack
- **HTML5 Canvas** — the figure and every picker thumbnail
- **CSS3** — three-panel layout, collapses to one column on mobile
- **Vanilla JavaScript** — no build step, no dependencies (matches `ore-bit/`, `emoji-battle/`, `FARKLE/`)
- `localStorage` remembers the last set

## Files
| File | Role |
|---|---|
| `data.js` | Armor materials, dyes, trim materials, and the hand-drawn art for all 18 patterns |
| `render.js` | Grid geometry + canvas renderer (`renderFigure`) |
| `app.js` | State, pickers, give-command builder, PNG export |
| `index.html` / `style.css` | Layout and chrome |

## How the render works
The figure sits on a **16×32 grid** — the standard front-facing skin layout — with 1 cell of
padding (`render.js`: `GRID_W`, `GRID_H`, `PAD`).

```
head  x4..11  y0..7      torso x4..11  y8..19
armL  x0..3   y8..19     armR  x12..15 y8..19
legs  x4..11  y20..31
```

`pieceCells(piece)` returns the cells each armor piece occupies: the helmet flares one cell
wider than the head and leaves a face opening, the chestplate carries full sleeves, the
leggings start at the hip (y16) and the boots flare at the ankle.

Pieces draw **back to front** — boots, leggings, chestplate, helmet — so the chestplate skirt
sits over the leggings the way it does in game.

Armor shading is edge-aware rather than hand-painted: a cell with no neighbour above or to the
left is lit, no neighbour below is deep shadow, no neighbour to the right is shaded, and the
interior gets a deterministic per-cell speckle (`cellHash`) so it never flickers. Each material
picks its interior treatment via `texture`: `mesh` (chainmail checker), `hide` (leather grain)
or `plate`.

## Trim art format
Trims are **hand-drawn pixel art in the game's style — not extracted game assets.** Each
pattern in `data.js` has five grids, sized to the region they overlay:

| Grid | Size | Anchored at |
|---|---|---|
| `helmet` | 8×8 | x4, y0 |
| `body` | 8×12 | x4, y8 |
| `arm` | 4×11 | x0, y8 (mirrored onto x12) |
| `legs` | 8×12 | x4, y16 |
| `boots` | 8×5 | x4, y27 |

Legend: `.` none · `1` light shade · `2` mid shade · `3` dark shade. The three shades come from
the trim material's palette, so one grid works for all 10 materials. Anything drawn outside the
owning piece's cells is clipped, which is why body rows 8–11 disappear under the chestplate.

**When editing art, keep the grid dimensions exact** — a short row silently shifts the pattern.

## Behaviour worth preserving
- **Per-piece everything.** Never collapse the state back to one global armor/trim; mixed sets
  are the point. "Apply piece to all" exists for when the user wants a matching set.
- **Darker palette on a match.** A trim whose material equals its armor material (iron on iron,
  gold on gold, diamond on diamond, netherite on netherite — `DARKER_PAIRS`) renders darkened,
  the way the game swaps in the `_darker` palette.
- **Pickers are live previews.** Every armor/material/pattern swatch renders the *currently
  selected piece* with that option applied, cropped by `PIECE_CROPS`. Adding an option means
  adding data, not markup.

## Give commands
Two syntaxes, toggled in the info panel:
- **1.21.5+** components — `/give @p minecraft:netherite_chestplate[minecraft:trim={pattern:"minecraft:sentry",material:"minecraft:copper"}]`
- **1.20.4** NBT — `/give @p minecraft:netherite_chestplate{Trim:{...}} 1`

Leather adds `minecraft:dyed_color=<int>` (or `display:{color:<int>}` on 1.20.4). Gold's item id
prefix is `golden`, which is why `ARMOR_MATERIALS` carries a separate `item` field.

## Template data
Each pattern records where its smithing template is found, its duplication material and the
version it was added (1.20 for the original 16, 1.21 for Flow and Bolt). Flow duplicates with a
Breeze Rod — the only trim that duplicates with an item rather than a block.
