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

/* --------------------------------------------------------------- shield --
   Banner patterns are luminance masks: black is off, white is on. The base
   texture carries a white cloth field with its own shading, so each layer is
   blended over the cloth by the mask and modulated by that shading, which is
   what gives a banner its folds. */

const shieldCache = new Map();

function shieldTexture(banner) {
  if (!banner) return IMG['shield/base'];        // plain, no banner
  const cacheKey = JSON.stringify(banner);
  const hit = shieldCache.get(cacheKey);
  if (hit) return hit;

  const out = pixelsOf('shield/patterned');
  const cloth = pixelsOf('shield/patterned');    // untouched copy, for shading
  const layers = [{ pattern: 'base', color: banner.base }, ...banner.layers];

  for (const layer of layers) {
    const mask = pixelsOf(`shield/pattern/${layer.pattern}`);
    if (!mask) continue;
    const [dr, dg, db] = hexToRgb(layer.color);
    for (let p = 0; p < out.data.length; p += 4) {
      if (!out.data[p + 3]) continue;
      const m = mask.data[p] / 255;              // luminance is the mask
      if (m <= 0.01) continue;
      const shade = cloth.data[p] / 255;         // cloth folds
      out.data[p] += (dr * shade - out.data[p]) * m;
      out.data[p + 1] += (dg * shade - out.data[p + 1]) * m;
      out.data[p + 2] += (db * shade - out.data[p + 2]) * m;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = out.width; canvas.height = out.height;
  canvas.getContext('2d').putImageData(out, 0, 0);
  shieldCache.set(cacheKey, canvas);
  return canvas;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
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

/* The flat view can't animate, so its glint is a still sample of the sheet
   masked to the piece — enough to read as enchanted in the thumbnails. */
const glintOverlays = new WeakMap();

function glintOverlay(tex, sheet) {
  let bySheet = glintOverlays.get(tex);
  if (!bySheet) { bySheet = new Map(); glintOverlays.set(tex, bySheet); }
  const hit = bySheet.get(sheet);
  if (hit) return hit;

  const glint = IMG[sheet];
  const c = document.createElement('canvas');
  c.width = tex.width; c.height = tex.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(glint, 0, 0, tex.width, tex.height, 0, 0, tex.width, tex.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(tex, 0, 0);
  bySheet.set(sheet, c);
  return c;
}

function drawPiece(ctx, piece, cfg, s, ox, oy) {
  const tex = pieceTexture(piece, cfg);
  if (!tex) return;
  const faces = PIECE_SPEC[piece].faces;
  for (const [face, dx, dy, mirror] of faces) {
    blit(ctx, tex, ARMOR_FACE[face], dx, dy, mirror, s, ox, oy);
  }
  if (!cfg.enchanted) return;
  const sheen = glintOverlay(tex, 'glint/armor');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3;
  for (const [face, dx, dy, mirror] of faces) {
    blit(ctx, sheen, ARMOR_FACE[face], dx, dy, mirror, s, ox, oy);
  }
  ctx.restore();
}

/* Front face of the shield plate, stood beside the off hand. Only drawn when
   the caller widens the crop to make room for it. */
const SHIELD_FLAT = { rect: [1, 1, 12, 22], x: 11, y: 4 };

function drawShieldFlat(ctx, banner, enchanted, s, ox, oy) {
  const tex = shieldTexture(banner);
  if (!tex) return;
  const { rect, x, y } = SHIELD_FLAT;
  blit(ctx, tex, rect, x, y, false, s, ox, oy);
  if (!enchanted) return;
  const sheen = glintOverlay(tex, 'glint/item');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3;
  blit(ctx, sheen, rect, x, y, false, s, ox, oy);
  ctx.restore();
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

/* ------------------------------------------------------------ backdrops --
   Painted procedurally at whatever size is asked for, so they cost nothing to
   ship and stay sharp at any zoom. A dropped image becomes the "custom" one. */

function flat(color) {
  return (ctx, w, h) => { ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); };
}

function scene(stops, ground) {
  return (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (ground) {
      const horizon = Math.round(h * 0.78);
      ctx.fillStyle = ground[0];
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.fillStyle = ground[1];
      ctx.fillRect(0, horizon, w, Math.max(1, Math.round(h * 0.012)));
    }
  };
}

const BACKDROPS = [
  { id: 'none', name: 'None', paint: null },
  { id: 'dark', name: 'Void', paint: flat('#10131a') },
  { id: 'stone', name: 'Stone', paint: flat('#2b2b31') },
  { id: 'day', name: 'Day', paint: scene([[0, '#5b93ec'], [0.62, '#9ec6f5'], [1, '#cfe3f7']], ['#5b8f3a', '#7cbf4f']) },
  { id: 'sunset', name: 'Sunset', paint: scene([[0, '#221a3a'], [0.45, '#8a4a6b'], [0.8, '#f0894b'], [1, '#ffc07a']], ['#3a2a22', '#5c4030']) },
  { id: 'night', name: 'Night', paint: scene([[0, '#05060f'], [0.7, '#121a3a'], [1, '#22305c']], ['#16202a', '#22303f']) },
  { id: 'nether', name: 'Nether', paint: scene([[0, '#210606'], [0.6, '#5e1410'], [1, '#a8351a']], ['#3a1410', '#742418']) },
  { id: 'end', name: 'End', paint: scene([[0, '#0b0810'], [0.65, '#1d1630'], [1, '#2f2450']], ['#c8c39a', '#e6e2c0']) },
  { id: 'ocean', name: 'Ocean', paint: scene([[0, '#03202f'], [0.6, '#0a4f6e'], [1, '#1d8ab0']], ['#0b3c4a', '#1b7fa8']) },
  { id: 'cave', name: 'Cave', paint: scene([[0, '#0a0a0d'], [0.75, '#1c1c22'], [1, '#2c2c34']], ['#232329', '#33333c']) },
];

let customBackdrop = null;
function setBackdrop(img) { customBackdrop = img || null; }
const currentBackdrop = () => customBackdrop;

const backdropById = id => BACKDROPS.find(b => b.id === id);
const backdropCache = new Map();

/* Cached strip used as the 3D view's texture; 2D paints straight in. */
function backdropTexture(id) {
  if (id === 'custom') return customBackdrop;
  const def = backdropById(id);
  if (!def || !def.paint) return null;
  const hit = backdropCache.get(id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  def.paint(c.getContext('2d'), c.width, c.height);
  backdropCache.set(id, c);
  return c;
}

/* Draws a backdrop into a 2D context, cover-fitted. Returns false for None. */
function paintBackdrop(ctx, id, w, h) {
  if (id === 'custom' && customBackdrop) {
    const img = customBackdrop;
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    ctx.imageSmoothingEnabled = Math.max(img.width, img.height) > 128;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.imageSmoothingEnabled = false;
    return true;
  }
  const def = backdropById(id);
  if (!def || !def.paint) return false;
  def.paint(ctx, w, h);
  return true;
}

/* opts: { scale, pieces, showBody, bg, crop:{x,y,w,h} } — crop is in grid
   cells and is what the picker thumbnails use to frame a single piece. */
function renderFigure(canvas, opts) {
  const s = opts.scale;
  const crop = opts.crop || { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
  canvas.width = crop.w * s;
  canvas.height = crop.h * s;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paintBackdrop(ctx, opts.bg, canvas.width, canvas.height);

  const ox = PAD - crop.x, oy = PAD - crop.y;
  if (opts.showBody !== false) drawBody(ctx, s, ox, oy);

  /* leggings sit under the chestplate skirt and boot cuffs, as in game */
  for (const piece of ['leggings', 'boots', 'chestplate', 'helmet']) {
    const cfg = opts.pieces[piece];
    if (cfg && cfg.on) drawPiece(ctx, piece, cfg, s, ox, oy);
  }
  if (opts.shield) drawShieldFlat(ctx, opts.banner, opts.shieldEnchanted, s, ox, oy);
  return canvas;
}

/* The flat view widens to this when a shield is shown */
const FLAT_CROP = { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
const FLAT_CROP_SHIELD = { x: 0, y: 0, w: 24, h: CANVAS_H };

/* Framing used by the picker thumbnails for each piece */
const PIECE_CROPS = {
  helmet: { x: 3, y: 0, w: 12, h: 10 },
  chestplate: { x: 0, y: 8, w: 18, h: 13 },
  leggings: { x: 3, y: 16, w: 12, h: 13 },
  boots: { x: 2, y: 25, w: 14, h: 9 },
};
