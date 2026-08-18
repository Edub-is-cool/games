/* Trim Forge — canvas renderer.
   The figure lives on a 16x32 pixel grid (standard front-facing skin layout)
   with 1 cell of padding around it. Every piece is drawn independently, so a
   set can mix armor materials, trim patterns and trim materials per piece. */

const GRID_W = 16, GRID_H = 32, PAD = 1;
const CANVAS_W = GRID_W + PAD * 2, CANVAS_H = GRID_H + PAD * 2;

/* --------------------------------------------------------------- colour -- */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/* amount > 0 lightens toward white, < 0 darkens toward black */
function shift(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const t = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  return rgbToHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k);
}

/* Deterministic per-cell noise so texture speckle never flickers between frames */
function cellHash(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ------------------------------------------------------------- geometry -- */

const REGIONS = {
  head: { x0: 4, y0: 0, x1: 11, y1: 7 },
  torso: { x0: 4, y0: 8, x1: 11, y1: 19 },
  armL: { x0: 0, y0: 8, x1: 3, y1: 19 },
  armR: { x0: 12, y0: 8, x1: 15, y1: 19 },
  legs: { x0: 4, y0: 20, x1: 11, y1: 31 },
};

function rect(x0, y0, x1, y1) {
  const out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

/* Which cells each armor piece occupies. Helmet flares 1 cell wider than the
   head and leaves a face opening; the chestplate carries full sleeves. */
function pieceCells(piece) {
  const cells = [];
  if (piece === 'helmet') {
    for (const [x, y] of rect(3, -1, 12, 7)) {
      const inFace = x >= 6 && x <= 9 && y >= 3 && y <= 5;
      if (!inFace) cells.push([x, y]);
    }
  } else if (piece === 'chestplate') {
    cells.push(...rect(4, 8, 11, 18));
    cells.push(...rect(0, 8, 3, 18));
    cells.push(...rect(12, 8, 15, 18));
  } else if (piece === 'leggings') {
    cells.push(...rect(4, 16, 11, 26));
  } else if (piece === 'boots') {
    cells.push(...rect(4, 26, 11, 31));
    cells.push(...rect(3, 29, 3, 31));
    cells.push(...rect(12, 29, 12, 31));
  }
  return cells;
}

/* Where each art grid is pinned, and which piece owns it */
const ART_ANCHORS = {
  helmet: [{ key: 'helmet', x: 4, y: 0 }],
  chestplate: [
    { key: 'body', x: 4, y: 8 },
    { key: 'arm', x: 0, y: 8 },
    { key: 'arm', x: 12, y: 8, mirror: true },
  ],
  leggings: [{ key: 'legs', x: 4, y: 16 }],
  boots: [{ key: 'boots', x: 4, y: 27 }],
};

/* --------------------------------------------------------------- lookup -- */

const byId = (list, id) => list.find(m => m.id === id) || list[0];
const armorById = id => byId(ARMOR_MATERIALS, id);
const trimById = id => byId(TRIM_MATERIALS, id);
const patternById = id => byId(PATTERNS, id);

function armorPalette(cfg) {
  const mat = armorById(cfg.armor);
  if (!mat.dyeable) return mat.palette;
  const dye = cfg.dye || '#a06540';
  return {
    light: shift(dye, 0.18),
    base: dye,
    dark: shift(dye, -0.22),
    shadow: shift(dye, -0.42),
  };
}

/* A trim whose material matches its armor uses the darker palette in game. */
function trimShades(cfg) {
  const mat = trimById(cfg.trim);
  const collides = DARKER_PAIRS[cfg.armor] === mat.id;
  return collides ? mat.shades.map(c => shift(c, -0.34)) : mat.shades;
}

/* ------------------------------------------------------------ rendering -- */

function px(ctx, x, y, color, s, ox, oy) {
  ctx.fillStyle = color;
  ctx.fillRect((x + ox) * s, (y + oy) * s, s, s);
}

/* Body underneath the armor — a plain mannequin so bare slots read clearly. */
const SKIN = '#c08552', SKIN_DARK = '#a06e42', HAIR = '#3b2716';
const SHIRT = '#12a3a3', SHIRT_DARK = '#0d7d7d';
const PANTS = '#3c44aa', PANTS_DARK = '#2c3382';
const SHOE = '#2f2f38';

function drawBody(ctx, s, ox, oy) {
  const put = (x, y, c) => px(ctx, x, y, c, s, ox, oy);
  const r = REGIONS;
  for (const [x, y] of rect(r.head.x0, r.head.y0, r.head.x1, r.head.y1)) {
    put(x, y, y <= 1 ? HAIR : x === r.head.x0 || x === r.head.x1 ? SKIN_DARK : SKIN);
  }
  put(6, 4, '#3b2716'); put(9, 4, '#3b2716');
  put(7, 6, SKIN_DARK); put(8, 6, SKIN_DARK);
  for (const [x, y] of rect(r.torso.x0, r.torso.y0, r.torso.x1, r.torso.y1)) {
    put(x, y, x === r.torso.x0 || x === r.torso.x1 || y === r.torso.y1 ? SHIRT_DARK : SHIRT);
  }
  for (const arm of [r.armL, r.armR]) {
    for (const [x, y] of rect(arm.x0, arm.y0, arm.x1, arm.y1)) {
      const sleeve = y <= 15;
      put(x, y, sleeve ? (x === arm.x0 ? SHIRT_DARK : SHIRT) : (x === arm.x0 ? SKIN_DARK : SKIN));
    }
  }
  for (const [x, y] of rect(r.legs.x0, r.legs.y0, r.legs.x1, r.legs.y1)) {
    const seam = x === 7 || x === 8;
    put(x, y, y >= 30 ? SHOE : seam ? PANTS_DARK : PANTS);
  }
}

/* Edge-aware shading: lit on the top/left border of a piece, shaded on the
   bottom/right, with a material-specific texture in the interior. */
function drawArmorPiece(ctx, piece, cfg, s, ox, oy) {
  const cells = pieceCells(piece);
  const set = new Set(cells.map(([x, y]) => `${x},${y}`));
  const has = (x, y) => set.has(`${x},${y}`);
  const pal = armorPalette(cfg);
  const mat = armorById(cfg.armor);

  for (const [x, y] of cells) {
    let color;
    if (!has(x, y - 1)) color = pal.light;
    else if (!has(x - 1, y)) color = pal.light;
    else if (!has(x, y + 1)) color = pal.shadow;
    else if (!has(x + 1, y)) color = pal.dark;
    else {
      const n = cellHash(x, y);
      if (mat.texture === 'mesh') color = (x + y) % 2 === 0 ? pal.base : pal.dark;
      else if (mat.texture === 'hide') color = n < 0.18 ? pal.dark : n > 0.88 ? pal.light : pal.base;
      else color = n < 0.12 ? pal.dark : n > 0.9 ? pal.light : pal.base;
    }
    px(ctx, x, y, color, s, ox, oy);
  }

  /* Seam down the middle of the legs so the two limbs stay readable */
  if (piece === "leggings" || piece === "boots") {
    for (const [x, y] of cells) {
      if (y >= 20 && (x === 7 || x === 8)) px(ctx, x, y, x === 7 ? pal.shadow : pal.dark, s, ox, oy);
    }
  }

  if (!cfg.pattern || cfg.pattern === 'none') return;
  const art = patternById(cfg.pattern).art;
  const shades = trimShades(cfg);
  for (const anchor of ART_ANCHORS[piece]) {
    const grid = art[anchor.key];
    if (!grid) continue;
    const w = grid[0].length;
    for (let ry = 0; ry < grid.length; ry++) {
      for (let rx = 0; rx < w; rx++) {
        const ch = grid[ry][rx];
        if (ch !== '1' && ch !== '2' && ch !== '3') continue;
        const gx = anchor.x + (anchor.mirror ? w - 1 - rx : rx);
        const gy = anchor.y + ry;
        if (!has(gx, gy)) continue;
        px(ctx, gx, gy, shades[+ch - 1], s, ox, oy);
      }
    }
  }
}

const BACKGROUNDS = {
  dark: '#10131a',
  stone: '#2b2b31',
  grass: '#4b7a2c',
  nether: '#3b1414',
  none: null,
};

/* opts: { scale, pieces, showBody, bg, crop:{x,y,w,h} } — crop is in grid
   cells and is what the picker thumbnails use to frame a single piece. */
function renderFigure(canvas, opts) {
  const s = opts.scale;
  const crop = opts.crop || { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
  canvas.width = crop.w * s;
  canvas.height = crop.h * s;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const bg = BACKGROUNDS[opts.bg];
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const ox = PAD - crop.x, oy = PAD - crop.y;
  if (opts.showBody !== false) drawBody(ctx, s, ox, oy);

  /* back-to-front: legs first so the chestplate skirt and helmet sit on top */
  for (const piece of ['boots', 'leggings', 'chestplate', 'helmet']) {
    const cfg = opts.pieces[piece];
    if (cfg && cfg.on) drawArmorPiece(ctx, piece, cfg, s, ox, oy);
  }
  return canvas;
}

/* Framing used by the picker thumbnails for each piece */
const PIECE_CROPS = {
  helmet: { x: 3, y: 0, w: 12, h: 10 },
  chestplate: { x: 0, y: 8, w: 18, h: 13 },
  leggings: { x: 3, y: 16, w: 12, h: 13 },
  boots: { x: 2, y: 25, w: 14, h: 9 },
};
