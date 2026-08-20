/* Trim Forge — UI wiring. State is per piece, so a set can mix armor
   materials, trim patterns and trim materials in any combination. */

const STORAGE_KEY = 'trim-forge-state-v3';
const SKIN_KEY = 'trim-forge-skin-v1';
const CAPE_KEY = 'trim-forge-cape-v1';
const BACKDROP_KEY = 'trim-forge-backdrop-v1';
const PIECE_IDS = ['helmet', 'chestplate', 'leggings', 'boots'];

function defaultPiece(armor, pattern, trim) {
  return { on: true, armor, dye: '#a06540', pattern, trim };
}

function defaultState() {
  return {
    pieces: {
      helmet: defaultPiece('netherite', 'sentry', 'copper'),
      chestplate: defaultPiece('netherite', 'sentry', 'copper'),
      leggings: defaultPiece('netherite', 'sentry', 'copper'),
      boots: defaultPiece('netherite', 'sentry', 'copper'),
    },
    selected: 'chestplate',
    view: '3d',
    zoom: 14,
    bg: 'dark',
    showBody: true,
    spin: false,
    slim: false,
    elytra: false,
    cmdVersion: 'modern',
  };
}

let state = loadState();
let viewer = null;          // Viewer3D, created once textures are in
let skinLabel = 'Steve (default)';
let capeLabel = 'none';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const saved = JSON.parse(raw);
    const base = defaultState();
    const merged = { ...base, ...saved, pieces: { ...base.pieces } };
    for (const id of PIECE_IDS) {
      if (saved.pieces && saved.pieces[id]) merged.pieces[id] = { ...base.pieces[id], ...saved.pieces[id] };
    }
    return merged;
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

const sel = () => state.pieces[state.selected];
const viewOpts = () => ({
  pieces: state.pieces, showBody: state.showBody, bg: state.bg, elytra: state.elytra,
});
const $ = id => document.getElementById(id);

/* ---------------------------------------------------------- thumbnails -- */

/* Renders one piece on its own, framed to that piece, with overrides applied.
   Pass { on: false } to preview the bare slot. */
function pieceThumb(piece, overrides, maxPx = 62) {
  const crop = PIECE_CROPS[piece];
  const scale = Math.max(2, Math.min(Math.floor(maxPx / crop.w), Math.floor(maxPx / crop.h)));
  const canvas = document.createElement('canvas');
  const pieces = {};
  for (const id of PIECE_IDS) pieces[id] = { ...state.pieces[id], on: false };
  pieces[piece] = { ...state.pieces[piece], ...overrides };
  if (overrides.on === undefined) pieces[piece].on = true;
  renderFigure(canvas, { scale, pieces, showBody: true, bg: 'dark', crop });
  return canvas;
}

function thumbButton(labelText, canvas, active, onClick) {
  const btn = document.createElement('button');
  btn.className = 'thumb' + (active ? ' active' : '');
  btn.appendChild(canvas);
  const label = document.createElement('span');
  label.textContent = labelText;
  btn.appendChild(label);
  btn.addEventListener('click', onClick);
  return btn;
}

/* ------------------------------------------------------------- set list -- */

function buildPieceList() {
  const host = $('pieceList');
  host.innerHTML = '';
  for (const p of PIECES) {
    const cfg = state.pieces[p.id];
    const row = document.createElement('div');
    row.className = 'piece-row' + (state.selected === p.id ? ' active' : '') + (cfg.on ? '' : ' off');
    row.addEventListener('click', () => { state.selected = p.id; refresh(); });

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'piece-toggle';
    toggle.checked = cfg.on;
    toggle.title = cfg.on ? 'Worn' : 'Not worn';
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      cfg.on = toggle.checked;
      refresh();
    });

    const thumb = pieceThumb(p.id, { on: true }, 44);
    thumb.className = 'piece-thumb';

    const meta = document.createElement('div');
    meta.className = 'piece-meta';
    const trimText = cfg.pattern === 'none'
      ? 'no trim'
      : `${patternById(cfg.pattern).name} · ${trimById(cfg.trim).name}`;
    const summary = cfg.on ? `${armorById(cfg.armor).name} · ${trimText}` : 'no armor';
    meta.innerHTML = `<div class="piece-name">${p.name}</div><div class="piece-sub">${summary}</div>`;

    row.append(toggle, thumb, meta);
    host.appendChild(row);
  }
}

/* -------------------------------------------------------------- editor -- */

function buildArmorRow() {
  const host = $('armorRow');
  host.innerHTML = '';
  const cfg = sel();

  host.appendChild(thumbButton('None', pieceThumb(state.selected, { on: false }, 54), !cfg.on, () => {
    cfg.on = false;
    refresh();
  }));

  for (const mat of ARMOR_MATERIALS) {
    if (!allowedOn(mat, state.selected)) continue;
    const canvas = pieceThumb(state.selected, { armor: mat.id, on: true }, 54);
    host.appendChild(thumbButton(mat.name, canvas, cfg.on && cfg.armor === mat.id, () => {
      cfg.armor = mat.id;
      cfg.on = true;
      if (state.selected === 'chestplate') state.elytra = false;
      refresh();
    }));
  }
}

function buildTrimRow() {
  const host = $('trimRow');
  host.innerHTML = '';
  const cfg = sel();
  const pattern = cfg.pattern === 'none' ? PATTERNS[0].id : cfg.pattern;
  for (const mat of TRIM_MATERIALS) {
    const canvas = pieceThumb(state.selected, { trim: mat.id, pattern, on: true }, 54);
    host.appendChild(thumbButton(mat.name, canvas, cfg.trim === mat.id, () => {
      cfg.trim = mat.id;
      if (cfg.pattern === 'none') cfg.pattern = pattern;
      refresh();
    }));
  }
}

function buildPatternGrid() {
  const host = $('patternGrid');
  host.innerHTML = '';
  const cfg = sel();
  host.appendChild(thumbButton('None', pieceThumb(state.selected, { pattern: 'none', on: true }, 54),
    cfg.pattern === 'none', () => { cfg.pattern = 'none'; refresh(); }));
  for (const pat of PATTERNS) {
    const canvas = pieceThumb(state.selected, { pattern: pat.id, on: true }, 54);
    host.appendChild(thumbButton(pat.name, canvas, cfg.pattern === pat.id, () => {
      cfg.pattern = pat.id;
      refresh();
    }));
  }
}

function buildDyePresets() {
  const host = $('dyePresets');
  host.innerHTML = '';
  const cfg = sel();
  for (const dye of DYE_PRESETS) {
    const chip = document.createElement('button');
    chip.className = 'dye-chip' + (cfg.dye.toLowerCase() === dye.hex.toLowerCase() ? ' active' : '');
    chip.style.background = dye.hex;
    chip.title = dye.name;
    chip.addEventListener('click', () => { cfg.dye = dye.hex; refresh(); });
    host.appendChild(chip);
  }
}

/* ---------------------------------------------------------------- info -- */

function buildTemplateInfo() {
  const cfg = sel();
  const host = $('templateInfo');
  const pieceName = PIECES.find(p => p.id === state.selected).name;
  if (!cfg.on) {
    host.innerHTML = `<dt>Piece</dt><dd>${pieceName} — no armor</dd>
      <dt>Trim</dt><dd>Pick an armor material to trim this slot.</dd>`;
    return;
  }
  if (cfg.pattern === 'none') {
    host.innerHTML = `<dt>Piece</dt><dd>${armorById(cfg.armor).name} ${pieceName}</dd>
      <dt>Trim</dt><dd>None — pick a pattern to see its template.</dd>`;
    return;
  }
  const pat = patternById(cfg.pattern);
  const trim = trimById(cfg.trim);
  const darker = DARKER_PAIRS[cfg.armor] === trim.id;
  host.innerHTML = `
    <dt>Piece</dt><dd>${armorById(cfg.armor).name} ${pieceName}</dd>
    <dt>Pattern</dt><dd>${pat.name} Armor Trim</dd>
    <dt>Material</dt><dd>${trim.name}${darker ? ' <em>(darker palette — matches the armor)</em>' : ''}</dd>
    <dt>Found in</dt><dd>${pat.found}</dd>
    <dt>Duplicate with</dt><dd>${pat.dupe} + 7 diamonds</dd>
    <dt>Added</dt><dd>Minecraft ${pat.version}</dd>`;
}

function giveCommands() {
  const modern = state.cmdVersion === 'modern';
  const lines = [];
  for (const p of PIECES) {
    const cfg = state.pieces[p.id];
    if (!cfg.on) continue;
    const mat = armorById(cfg.armor);
    const item = `minecraft:${mat.item}_${p.id}`;
    const trimmed = cfg.pattern !== 'none';
    const dyeInt = mat.dyeable ? parseInt(cfg.dye.replace('#', ''), 16) : null;
    const parts = [];
    if (modern) {
      if (dyeInt !== null) parts.push(`minecraft:dyed_color=${dyeInt}`);
      if (trimmed) parts.push(`minecraft:trim={pattern:"minecraft:${cfg.pattern}",material:"minecraft:${cfg.trim}"}`);
      lines.push(`/give @p ${item}${parts.length ? `[${parts.join(',')}]` : ''}`);
    } else {
      if (dyeInt !== null) parts.push(`display:{color:${dyeInt}}`);
      if (trimmed) parts.push(`Trim:{pattern:"minecraft:${cfg.pattern}",material:"minecraft:${cfg.trim}"}`);
      lines.push(`/give @p ${item}${parts.length ? `{${parts.join(',')}}` : ''} 1`);
    }
  }
  if (state.elytra) lines.push(modern ? '/give @p minecraft:elytra' : '/give @p minecraft:elytra 1');
  return lines.length ? lines.join('\n') : '# Nothing worn — pick an armor material for a slot.';
}

/* ---------------------------------------------------------------- skin --
   A dropped PNG is normalised to a 64-wide skin so every UV rect stays in
   the same coordinate space, then kept in localStorage. */

function normaliseSkin(img) {
  const ratio = img.height / img.width;
  if (img.width < 64 || (ratio !== 1 && ratio !== 0.5)) {
    throw new Error(`expected a 64x64 or 64x32 skin, got ${img.width}x${img.height}`);
  }
  const h = ratio === 1 ? 64 : 32;
  const c = document.createElement('canvas');
  c.width = 64; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, h);
  return c;
}

function applyCapeDataURL(dataURL, label, persist) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.width < 64 || img.height / img.width !== 0.5) {
        return reject(new Error(`expected a 64x32 cape, got ${img.width}x${img.height}`));
      }
      const c = document.createElement('canvas');
      c.width = 64; c.height = 32;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 64, 32);
      const ready = new Image();
      ready.onload = () => {
        setCape(ready);
        capeLabel = label;
        if (persist) {
          try { localStorage.setItem(CAPE_KEY, JSON.stringify({ data: c.toDataURL('image/png'), label })); }
          catch (e) { /* keep it in memory */ }
        }
        refresh();
        resolve();
      };
      ready.src = c.toDataURL('image/png');
    };
    img.onerror = () => reject(new Error('that file is not a readable image'));
    img.src = dataURL;
  });
}

function readCapeFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    applyCapeDataURL(reader.result, file.name, true)
      .then(() => setSkinStatus(''))
      .catch(err => setSkinStatus(err.message, true));
  };
  reader.readAsDataURL(file);
}

function applyBackdropDataURL(dataURL, persist) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      setBackdrop(img);
      state.bg = 'custom';
      if (persist && dataURL.length < 700000) {          // keep localStorage sane
        try { localStorage.setItem(BACKDROP_KEY, dataURL); } catch (e) { /* over quota */ }
      }
      refresh();
      resolve();
    };
    img.onerror = () => reject(new Error('that file is not a readable image'));
    img.src = dataURL;
  });
}

function readBackdropFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    applyBackdropDataURL(reader.result, true)
      .then(() => setSkinStatus(''))
      .catch(err => setSkinStatus(err.message, true));
  };
  reader.readAsDataURL(file);
}

function resetBackdrop() {
  setBackdrop(null);
  if (state.bg === 'custom') state.bg = 'dark';
  try { localStorage.removeItem(BACKDROP_KEY); } catch (e) { /* ignore */ }
  refresh();
}

function restoreBackdrop() {
  try {
    const raw = localStorage.getItem(BACKDROP_KEY);
    if (!raw) return Promise.resolve();
    const wanted = state.bg;
    return applyBackdropDataURL(raw, false).then(() => { state.bg = wanted; }).catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
}

function resetCape() {
  setCape(null);
  capeLabel = 'none';
  try { localStorage.removeItem(CAPE_KEY); } catch (e) { /* ignore */ }
  refresh();
}

function restoreCape() {
  try {
    const raw = localStorage.getItem(CAPE_KEY);
    if (!raw) return Promise.resolve();
    const saved = JSON.parse(raw);
    return applyCapeDataURL(saved.data, saved.label || 'saved cape', false).catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
}

function applySkinDataURL(dataURL, label, persist) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = normaliseSkin(img);
        const ready = new Image();
        ready.onload = () => {
          setSkin(ready, state.slim);
          skinLabel = label;
          if (persist) {
            try { localStorage.setItem(SKIN_KEY, JSON.stringify({ data: canvas.toDataURL('image/png'), label })); }
            catch (e) { /* over quota or private mode — keep it in memory */ }
          }
          refresh();
          resolve();
        };
        ready.src = canvas.toDataURL('image/png');
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('that file is not a readable image'));
    img.src = dataURL;
  });
}

/* Skin-shaped files (64 or 128 wide, square or 2:1) are worn; anything else
   is treated as a backdrop, so dropping a screenshot just works. */
function routeDroppedFile(file) {
  if (!file || !/^image\//.test(file.type)) {
    return setSkinStatus('Drop a PNG image.', true);
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const skinShaped = img.width <= 128 && (img.height === img.width || img.height === img.width / 2);
      if (skinShaped) {
        applySkinDataURL(reader.result, file.name, true)
          .then(() => setSkinStatus('')).catch(err => setSkinStatus(err.message, true));
      } else {
        applyBackdropDataURL(reader.result, true)
          .then(() => setSkinStatus('')).catch(err => setSkinStatus(err.message, true));
      }
    };
    img.onerror = () => setSkinStatus('that file is not a readable image', true);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function readSkinFile(file) {
  if (!file) return;
  if (!/image\/(png|jpeg)/.test(file.type)) {
    return setSkinStatus('Skins must be PNG files.', true);
  }
  const reader = new FileReader();
  reader.onload = () => {
    applySkinDataURL(reader.result, file.name, true)
      .then(() => setSkinStatus(''))
      .catch(err => setSkinStatus(err.message, true));
  };
  reader.readAsDataURL(file);
}

function setSkinStatus(msg, isError) {
  const el = $('skinStatus');
  el.textContent = msg;
  el.classList.toggle('error', !!isError);
}

function resetSkin() {
  setSkin(null, state.slim);
  skinLabel = 'Steve (default)';
  try { localStorage.removeItem(SKIN_KEY); } catch (e) { /* ignore */ }
  setSkinStatus('');
  refresh();
}

function restoreSkin() {
  try {
    const raw = localStorage.getItem(SKIN_KEY);
    if (!raw) return Promise.resolve();
    const saved = JSON.parse(raw);
    return applySkinDataURL(saved.data, saved.label || 'saved skin', false).catch(() => {});
  } catch (e) {
    return Promise.resolve();
  }
}

/* ------------------------------------------------------------- refresh -- */

function refresh() {
  const cfg = sel();
  $('editingName').textContent = PIECES.find(p => p.id === state.selected).name;
  $('dyeBlock').hidden = !(cfg.on && armorById(cfg.armor).dyeable);
  $('dyeInput').value = cfg.dye;
  $('skinName').textContent = skinLabel;
  $('capeName').textContent = capeLabel;
  $('elytra').checked = state.elytra;

  document.body.classList.toggle('view-3d', state.view === '3d');
  if (state.view === '3d' && viewer) {
    viewer.distance = Math.max(24, Math.min(120, 90 - state.zoom * 3));
    viewer.spin = state.spin;
    viewer.dirty = true;
  } else {
    renderFigure($('view'), {
      scale: state.zoom,
      pieces: state.pieces,
      showBody: state.showBody,
      bg: state.bg,
    });
  }

  buildPieceList();
  buildArmorRow();
  buildTrimRow();
  buildPatternGrid();
  buildDyePresets();
  buildTemplateInfo();
  $('giveCmd').textContent = giveCommands();
  document.querySelectorAll('.ver-btn').forEach(b => b.classList.toggle('active', b.dataset.ver === state.cmdVersion));
  document.querySelectorAll('.bg-swatch').forEach(b => b.classList.toggle('active', b.dataset.bg === state.bg));
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  saveState();
}

/* -------------------------------------------------------------- chrome -- */

function buildBgRow() {
  const host = $('bgRow');
  host.innerHTML = '';
  const entries = BACKDROPS.map(b => [b.id, b.name]);
  if (currentBackdrop()) entries.push(['custom', 'Your image']);

  for (const [id, name] of entries) {
    const b = document.createElement('button');
    b.className = 'bg-swatch';
    b.dataset.bg = id;
    b.title = name;
    if (id === 'none') {
      b.style.background = 'repeating-conic-gradient(#2a2a3a 0% 25%, #14141f 0% 50%) 0 / 10px 10px';
    } else {
      const swatch = document.createElement('canvas');
      swatch.width = 22; swatch.height = 22;
      paintBackdrop(swatch.getContext('2d'), id, 22, 22);
      b.style.backgroundImage = `url(${swatch.toDataURL()})`;
      b.style.backgroundSize = 'cover';
    }
    b.addEventListener('click', () => { state.bg = id; refresh(); });
    host.appendChild(b);
  }
}

function buildToggleRow(hostId, options, cls, onPick) {
  const host = $(hostId);
  host.innerHTML = '';
  for (const [value, label] of options) {
    const b = document.createElement('button');
    b.className = cls;
    b.dataset[cls === 'ver-btn' ? 'ver' : 'view'] = value;
    b.textContent = label;
    b.addEventListener('click', () => onPick(value));
    host.appendChild(b);
  }
}

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function wire() {
  $('zoom').value = state.zoom;
  $('zoom').addEventListener('input', e => { state.zoom = +e.target.value; refresh(); });

  $('showBody').checked = state.showBody;
  $('showBody').addEventListener('change', e => { state.showBody = e.target.checked; refresh(); });

  $('spin').checked = state.spin;
  $('spin').addEventListener('change', e => { state.spin = e.target.checked; refresh(); });

  $('slimArms').checked = state.slim;
  $('slimArms').addEventListener('change', e => {
    state.slim = e.target.checked;
    setSlim(state.slim);
    refresh();
  });

  $('dyeInput').addEventListener('input', e => { sel().dye = e.target.value; refresh(); });

  $('elytra').addEventListener('change', e => {
    state.elytra = e.target.checked;
    if (state.elytra) state.pieces.chestplate.on = false;   // same slot as a chestplate
    refresh();
  });

  $('loadBackdrop').addEventListener('click', () => $('backdropFile').click());
  $('backdropFile').addEventListener('change', e => readBackdropFile(e.target.files[0]));
  $('resetBackdrop').addEventListener('click', resetBackdrop);

  $('loadCape').addEventListener('click', () => $('capeFile').click());
  $('capeFile').addEventListener('change', e => readCapeFile(e.target.files[0]));
  $('resetCape').addEventListener('click', resetCape);

  $('loadSkin').addEventListener('click', () => $('skinFile').click());
  $('skinFile').addEventListener('change', e => readSkinFile(e.target.files[0]));
  $('resetSkin').addEventListener('click', resetSkin);

  const stage = $('stage');
  ['dragenter', 'dragover'].forEach(ev => stage.addEventListener(ev, e => {
    e.preventDefault();
    stage.classList.add('dropping');
  }));
  ['dragleave', 'drop'].forEach(ev => stage.addEventListener(ev, e => {
    e.preventDefault();
    if (ev === 'dragleave' && stage.contains(e.relatedTarget)) return;
    stage.classList.remove('dropping');
  }));
  stage.addEventListener('drop', e => routeDroppedFile(e.dataTransfer.files[0]));

  $('applyAll').addEventListener('click', () => {
    const src = sel();
    for (const id of PIECE_IDS) {
      const cfg = state.pieces[id];
      const armor = allowedOn(armorById(src.armor), id) ? src.armor : cfg.armor;
      state.pieces[id] = { ...cfg, on: src.on, armor, dye: src.dye, pattern: src.pattern, trim: src.trim };
    }
    refresh();
  });

  $('randomSet').addEventListener('click', () => {
    for (const id of PIECE_IDS) {
      const cfg = state.pieces[id];
      cfg.armor = pick(ARMOR_MATERIALS.filter(m => allowedOn(m, id))).id;
      cfg.dye = pick(DYE_PRESETS).hex;
      cfg.pattern = pick(PATTERNS).id;
      cfg.trim = pick(TRIM_MATERIALS).id;
      cfg.on = true;
    }
    refresh();
  });

  $('clearTrims').addEventListener('click', () => {
    for (const id of PIECE_IDS) state.pieces[id].pattern = 'none';
    refresh();
  });

  $('resetAll').addEventListener('click', () => {
    const view = state.view;
    state = defaultState();
    state.view = view;
    refresh();
  });

  $('copyCmd').addEventListener('click', async () => {
    const btn = $('copyCmd');
    try {
      await navigator.clipboard.writeText(giveCommands());
      btn.textContent = 'Copied!';
    } catch (e) {
      btn.textContent = 'Select and copy';
    }
    setTimeout(() => { btn.textContent = 'Copy commands'; }, 1400);
  });

  $('exportPng').addEventListener('click', () => {
    const cfg = sel();
    const link = document.createElement('a');
    link.download = `trim-forge-${cfg.armor}-${cfg.pattern}-${cfg.trim}.png`;
    if (state.view === '3d' && viewer) {
      viewer.render(viewOpts());
      link.href = $('view3d').toDataURL('image/png');
    } else {
      const canvas = document.createElement('canvas');
      renderFigure(canvas, { scale: 24, pieces: state.pieces, showBody: state.showBody, bg: state.bg });
      link.href = canvas.toDataURL('image/png');
    }
    link.click();
  });
}

/* --------------------------------------------------------------- start -- */

buildBgRow();
buildToggleRow('verToggle', [['modern', '1.21.5+'], ['legacy', '1.20.4']], 'ver-btn', v => {
  state.cmdVersion = v; refresh();
});
buildToggleRow('viewToggle', [['3d', '3D'], ['flat', 'Flat']], 'view-btn', v => {
  state.view = v; refresh();
});

loadTextures().then(restoreSkin).then(restoreCape).then(restoreBackdrop).then(() => {
  document.body.classList.remove('loading');
  try {
    viewer = new Viewer3D($('view3d'));
    viewer.start(viewOpts);
  } catch (err) {
    console.warn('3D unavailable, staying flat:', err.message);
    state.view = 'flat';
    $('viewToggle').hidden = true;
  }
  wire();
  refresh();
}).catch(err => {
  $('stage').textContent = `Could not load textures: ${err.message}`;
  console.error(err);
});
