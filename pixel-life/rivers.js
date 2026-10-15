'use strict';

// Rivers and lakes. Rivers run downhill from the hills to the sea on a River
// tile that creatures can wade across (slowly), so they don't cut the land in
// two; lakes are real water. Cities like to settle near rivers.
// Loaded late so the new tile doesn't change the ids of older tiles in saves.

addTile('RIVER', { name: 'River', color: 0x4f86d6, group: 'Terrain', level: 2, dots: [0.12, 0x7fb0ee] });

// ---------- Generation (called from generateWorld) ----------
function carveWater(tiles, relief, W, H, seed, o) {
  let s = seed + 7001;
  const rnd = () => hash2(s++, 53, seed);
  const lakes = Math.round(((W * H) / 22000) * o.lakes);
  for (let n = 0; n < lakes; n++) {
    for (let tries = 0; tries < 80; tries++) {
      const x = 6 + ((rnd() * (W - 12)) | 0), y = 6 + ((rnd() * (H - 12)) | 0);
      const t = tiles[y * W + x];
      if (!isPlant(t)) continue;
      makeLake(tiles, W, H, x, y, 3 + rnd() * 4, rnd);
      break;
    }
  }
  const rivers = Math.round(((W * H) / 9000) * o.rivers);
  for (let n = 0; n < rivers; n++) {
    for (let tries = 0; tries < 120; tries++) {
      const x = 2 + ((rnd() * (W - 4)) | 0), y = 2 + ((rnd() * (H - 4)) | 0);
      if (relief[y * W + x] < 0.55 || tiles[y * W + x] === T.RIVER) continue;
      runRiver(tiles, relief, W, H, x, y, rnd);
      break;
    }
  }
}

// follow the steepest way down; a dip with no way out becomes a lake
function runRiver(tiles, relief, W, H, x, y, rnd) {
  const seen = new Set();
  const path = [];
  for (let step = 0; step < (W + H) * 2; step++) {
    const i = y * W + x;
    if (isWater(tiles[i])) break;
    path.push(i);
    seen.add(i);
    let best = -1, bh = Infinity;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
      const j = ny * W + nx;
      if (seen.has(j)) continue;
      // diagonal steps cost a little more, and a bit of noise makes it meander
      const h = (isWater(tiles[j]) ? -1 : relief[j]) + (dx && dy ? 0.004 : 0) + rnd() * 0.006;
      if (h < bh) { bh = h; best = j; }
    }
    if (best < 0) break;
    if (bh > relief[i] + 0.02) { makeLake(tiles, W, H, x, y, 2 + rnd() * 2, rnd); break; }   // stuck in a dip
    x = best % W; y = (best / W) | 0;
  }
  if (path.length < 6) return;
  // wider toward the mouth
  path.forEach((i, k) => {
    tiles[i] = T.RIVER;
    if (k > path.length * 0.55) {
      const px = i % W, py = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const j = (py + dy) * W + px + dx;
        if (px + dx < W && py + dy < H && !isWater(tiles[j]) && tiles[j] !== T.SNOW) tiles[j] = T.RIVER;
      }
    }
  });
}

function makeLake(tiles, W, H, cx, cy, r, rnd) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const d = Math.hypot(x - cx, y - cy) / (r * (0.8 + rnd() * 0.35));
      if (d > 1) continue;
      tiles[y * W + x] = d < 0.45 && r > 4 ? T.DEEP : T.SHALLOW;
    }
  }
}

// ---------- Life by the river ----------
const onRiver = u => state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)] === T.RIVER;
const nearRiver = (x, y, r) => {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (inBounds(x + dx, y + dy) && state.tiles[(y + dy) * state.W + x + dx] === T.RIVER) return true;
  }
  return false;
};

// wading across is slow
const _speedMultRiver = speedMult;
speedMult = u => _speedMultRiver(u) * (onRiver(u) && !RACES[u.race].flies ? 0.55 : 1);

// homeless settlers who pass a river are far likelier to found their village beside it
const _homelessRiver = homeless;
homeless = function (u, r) {
  if (isAdult(u) && !u.kingdom && !u.settleTravel && rand() < 0.1) {
    const x = Math.floor(u.x), y = Math.floor(u.y);
    if (nearRiver(x, y, 4) && canFound(x, y, u.race)) { foundVillage(u, x, y); return; }
  }
  return _homelessRiver(u, r);
};

// nothing gets built in a river
const _buildableRiver = buildable;
buildable = t => t !== T.RIVER && _buildableRiver(t);
