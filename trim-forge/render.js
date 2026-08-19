/* Trim Forge — textures and the flat (2D) view.
   Draws the game's own textures rather than an imitation of them: the armour
   texture, then the trim texture recoloured through the game's palette files,
   sampled at the front faces of the standard armour UV layout.

   Each piece is composited into a single 64x32 texture by pieceTexture(),
   which both this view and the 3D view render from — in 3D that matters,
   because armour and trim drawn as separate coplanar boxes would z-fight. */

const GRID_W = 16, GRID_H = 32, PAD = 1;
const CANVAS_W = GRID_W + PAD * 2, CANVAS_H = GRID_H + PAD * 2;

/* ------------------------------------------------------------- loading -- */

const IMG = {};

function loadTextures() {
  const entries = Object.entries(TEXTURES);
  return Promise.all(entries.map(([key, uri]) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { IMG[key] = img; resolve(); };
    img.onerror = () => reject(new Error(`texture failed to load: ${key}`));
    img.src = uri;
  })));
}

function pixelsOf(source) {
  const img = typeof source === 'string' ? IMG[source] : source;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}

/* ----------------------------------------------------------- the skin --
   Defaults to the bundled Steve; a dropped PNG replaces it. Legacy 64x32
   skins have no left limbs, so those mirror the right ones. */

let skinImage = null;
let skinSlim = false;

function setSkin(img, slim) {
  skinImage = img || null;
  skinSlim = !!slim;
}

function setSlim(slim) { skinSlim = !!slim; }

let capeImage = null;
function setCape(img) { capeImage = img || null; }
const currentCape = () => capeImage;
const currentSkin = () => skinImage || IMG['player/steve'];
const skinIsLegacy = () => currentSkin().height === 32;
const skinIsSlim = () => skinSlim;

/* --------------------------------------------------------- trim colour --
   Trim textures ship in a greyscale key palette; the game swaps those exact
   colours for the chosen material's 8-pixel palette. Same thing here. */

let keyColors = null;
const trimCache = new Map();
const leatherCache = new Map();
const pieceCache = new Map();

const packRGB = (d, i) => (d[i * 4] << 16) | (d[i * 4 + 1] << 8) | d[i * 4 + 2];

function trimTexture(pattern, layer, palette) {
  const cacheKey = `${pattern}|${layer}|${palette}`;
  const hit = trimCache.get(cacheKey);
  if (hit) return hit;

  if (!keyColors) {
    const key = pixelsOf('palettes/trim_palette');
    keyColors = new Map();
    for (let i = 0; i < key.width; i++) keyColors.set(packRGB(key.data, i), i);
  }

  const pal = pixelsOf(`palettes/${palette}`);
  const src = pixelsOf(`trims/${layer}/${pattern}`);
  const d = src.data;
  for (let p = 0; p < d.length; p += 4) {
    if (!d[p + 3]) continue;
    const slot = keyColors.get((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]);
    if (slot === undefined) continue;
    d[p] = pal.data[slot * 4];
    d[p + 1] = pal.data[slot * 4 + 1];
    d[p + 2] = pal.data[slot * 4 + 2];
    d[p + 3] = pal.data[slot * 4 + 3];
  }
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  out.getContext('2d').putImageData(src, 0, 0);
  trimCache.set(cacheKey, out);
  return out;
}

/* Leather ships greyscale and is multiplied by the dye colour, with an
   un-tinted overlay drawn on top — the same two-texture trick the game uses. */
function tintedLeather(layer, dye) {
  const cacheKey = `${layer}|${dye}`;
  const hit = leatherCache.get(cacheKey);
  if (hit) return hit;

  const img = IMG[`armor/${layer}/leather`];
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = dye;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.globalCompositeOperation = 'destination-in';   // put the alpha back
  ctx.drawImage(img, 0, 0);
  leatherCache.set(cacheKey, c);
  return c;
}

/* --------------------------------------------------------------- lookup -- */

const byId = (list, id) => list.find(m => m.id === id) || list[0];
const armorById = id => byId(ARMOR_MATERIALS, id);
const trimById = id => byId(TRIM_MATERIALS, id);
const patternById = id => byId(PATTERNS, id);

const allowedOn = (mat, piece) => !mat.pieces || mat.pieces.includes(piece);

/* The game darkens a trim whose material matches the armour it sits on. */
function paletteFor(cfg) {
  const trim = trimById(cfg.trim).id;
  return DARKER_PAIRS[cfg.armor] === trim ? `${trim}_darker` : trim;
}

/* ------------------------------------------------------------ geometry --
   Front faces of the 64x32 armour layout, and where each lands on the 16x32
   figure. Armour textures carry one arm and one leg, mirrored for the far
   side, exactly as the model does. */

const ARMOR_FACE = { head: [8, 8, 8, 8], body: [20, 20, 8, 12], arm: [44, 20, 4, 12], leg: [4, 20, 4, 12] };

const PIECE_SPEC = {
  helmet: { layer: 'humanoid', faces: [['head', 4, 0, false]] },
  chestplate: { layer: 'humanoid', faces: [['body', 4, 8, false], ['arm', 0, 8, false], ['arm', 12, 8, true]] },
  boots: { layer: 'humanoid', faces: [['leg', 4, 20, false], ['leg', 8, 20, true]] },
  leggings: { layer: 'leggings', faces: [['body', 4, 8, false], ['leg', 4, 20, false], ['leg', 8, 20, true]] },
};

/* One 64x32 texture per piece: armour, dye overlay and recoloured trim
   flattened together. Cached — the pickers ask for a lot of these. */
function pieceTexture(piece, cfg) {
  const spec = PIECE_SPEC[piece];
  const mat = armorById(cfg.armor);
  if (!allowedOn(mat, piece)) return null;

  const cacheKey = `${spec.layer}|${cfg.armor}|${mat.dyeable ? cfg.dye : ''}|${cfg.pattern}|${cfg.trim}`;
  const hit = pieceCache.get(cacheKey);
  if (hit) return hit;

  const base = mat.dyeable ? tintedLeather(spec.layer, cfg.dye) : IMG[`armor/${spec.layer}/${mat.tex}`];
  if (!base) return null;

  const out = document.createElement('canvas');
  out.width = 64; out.height = 32;
  const ctx = out.getContext('2d');
  ctx.drawImage(base, 0, 0);
  if (mat.dyeable) ctx.drawImage(IMG[`armor/${spec.layer}/leather_overlay`], 0, 0);
  if (cfg.pattern && cfg.pattern !== 'none') {
    ctx.drawImage(trimTexture(cfg.pattern, spec.layer, paletteFor(cfg)), 0, 0);
  }
  pieceCache.set(cacheKey, out);
  return out;
}

function blit(ctx, src, rect, dx, dy, mirror, s, ox, oy) {
  const [sx, sy, w, h] = rect;
  const x = (dx + ox) * s, y = (dy + oy) * s;
  ctx.save();
  if (mirror) { ctx.translate(x * 2 + w * s, 0); ctx.scale(-1, 1); }
  ctx.drawImage(src, sx, sy, w, h, x, y, w * s, h * s);
  ctx.restore();
}

/* ------------------------------------------------------------ rendering -- */

function drawPiece(ctx, piece, cfg, s, ox, oy) {
  const tex = pieceTexture(piece, cfg);
  if (!tex) return;
  for (const [face, dx, dy, mirror] of PIECE_SPEC[piece].faces) {
    blit(ctx, tex, ARMOR_FACE[face], dx, dy, mirror, s, ox, oy);
  }
}

/* Player skin is the 64x64 layout; legacy 64x32 skins mirror the right limbs
   and only carry the hat overlay. */
function bodyFaces() {
  const legacy = skinIsLegacy();
  const slim = skinIsSlim();
  const aw = slim ? 3 : 4;                       // arm width
  const ax = slim ? 1 : 0;                       // slim arms sit a pixel inward
  const base = [
    [[8, 8, 8, 8], 4, 0, false],                                     // head
    [[20, 20, 8, 12], 4, 8, false],                                  // body
    [[44, 20, aw, 12], ax, 8, false],                                // right arm
    legacy ? [[44, 20, aw, 12], 12, 8, true] : [[36, 52, aw, 12], 12, 8, false],
    [[4, 20, 4, 12], 4, 20, false],                                  // right leg
    legacy ? [[4, 20, 4, 12], 8, 20, true] : [[20, 52, 4, 12], 8, 20, false],
  ];
  const overlay = legacy ? [[[40, 8, 8, 8], 4, 0, false]] : [
    [[40, 8, 8, 8], 4, 0, false],
    [[20, 36, 8, 12], 4, 8, false],
    [[44, 36, aw, 12], ax, 8, false],
    [[52, 52, aw, 12], 12, 8, false],
    [[4, 36, 4, 12], 4, 20, false],
    [[4, 52, 4, 12], 8, 20, false],
  ];
  return { base, overlay };
}

function drawBody(ctx, s, ox, oy) {
  const skin = currentSkin();
  const { base, overlay } = bodyFaces();
  for (const [rect, dx, dy, mirror] of base) blit(ctx, skin, rect, dx, dy, mirror, s, ox, oy);
  for (const [rect, dx, dy, mirror] of overlay) blit(ctx, skin, rect, dx, dy, mirror, s, ox, oy);
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

  /* leggings sit under the chestplate skirt and boot cuffs, as in game */
  for (const piece of ['leggings', 'boots', 'chestplate', 'helmet']) {
    const cfg = opts.pieces[piece];
    if (cfg && cfg.on) drawPiece(ctx, piece, cfg, s, ox, oy);
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
