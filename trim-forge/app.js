/* Trim Forge — UI wiring. State is per piece, so a set can mix armor
   materials, trim patterns and trim materials in any combination. */

const STORAGE_KEY = 'trim-forge-state-v1';
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
    zoom: 14,
    bg: 'dark',
    showBody: true,
    cmdVersion: 'modern',
  };
}

let state = loadState();

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
const $ = id => document.getElementById(id);

/* ---------------------------------------------------------- thumbnails -- */

/* Renders one piece on its own, framed to that piece, with overrides applied. */
function pieceThumb(piece, overrides, maxPx = 62) {
  const crop = PIECE_CROPS[piece];
  const scale = Math.max(2, Math.min(Math.floor(maxPx / crop.w), Math.floor(maxPx / crop.h)));
  const canvas = document.createElement('canvas');
  const pieces = {};
  for (const id of PIECE_IDS) pieces[id] = { ...state.pieces[id], on: false };
  pieces[piece] = { ...state.pieces[piece], ...overrides, on: true };
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
    const armorName = armorById(cfg.armor).name;
    const trimText = cfg.pattern === 'none'
      ? 'no trim'
      : `${patternById(cfg.pattern).name} · ${trimById(cfg.trim).name}`;
    meta.innerHTML = `<div class="piece-name">${p.name}</div><div class="piece-sub">${armorName} · ${trimText}</div>`;

    row.append(toggle, thumb, meta);
    host.appendChild(row);
  }
}

/* -------------------------------------------------------------- editor -- */

function buildArmorRow() {
  const host = $('armorRow');
  host.innerHTML = '';
  const cfg = sel();
  for (const mat of ARMOR_MATERIALS) {
    const canvas = pieceThumb(state.selected, { armor: mat.id }, 54);
    host.appendChild(thumbButton(mat.name, canvas, cfg.armor === mat.id, () => {
      cfg.armor = mat.id;
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
    const canvas = pieceThumb(state.selected, { trim: mat.id, pattern }, 54);
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
  host.appendChild(thumbButton('None', pieceThumb(state.selected, { pattern: 'none' }, 54),
    cfg.pattern === 'none', () => { cfg.pattern = 'none'; refresh(); }));
  for (const pat of PATTERNS) {
    const canvas = pieceThumb(state.selected, { pattern: pat.id }, 54);
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
  return lines.length ? lines.join('\n') : '# No pieces worn — tick a piece in The Set.';
}

/* ------------------------------------------------------------- refresh -- */

function refresh() {
  const cfg = sel();
  $('editingName').textContent = PIECES.find(p => p.id === state.selected).name;
  $('dyeBlock').hidden = !armorById(cfg.armor).dyeable;
  $('dyeInput').value = cfg.dye;

  renderFigure($('view'), {
    scale: state.zoom,
    pieces: state.pieces,
    showBody: state.showBody,
    bg: state.bg,
  });

  buildPieceList();
  buildArmorRow();
  buildTrimRow();
  buildPatternGrid();
  buildDyePresets();
  buildTemplateInfo();
  $('giveCmd').textContent = giveCommands();
  document.querySelectorAll('.ver-btn').forEach(b => b.classList.toggle('active', b.dataset.ver === state.cmdVersion));
  document.querySelectorAll('.bg-swatch').forEach(b => b.classList.toggle('active', b.dataset.bg === state.bg));
  saveState();
}

/* -------------------------------------------------------------- chrome -- */

function buildBgRow() {
  const host = $('bgRow');
  host.innerHTML = '';
  for (const [id, color] of Object.entries(BACKGROUNDS)) {
    const b = document.createElement('button');
    b.className = 'bg-swatch';
    b.dataset.bg = id;
    b.title = id;
    b.style.background = color || 'repeating-conic-gradient(#2a2a3a 0% 25%, #14141f 0% 50%) 0 / 10px 10px';
    b.addEventListener('click', () => { state.bg = id; refresh(); });
    host.appendChild(b);
  }
}

function buildVerToggle() {
  const host = $('verToggle');
  host.innerHTML = '';
  for (const [ver, label] of [['modern', '1.21.5+'], ['legacy', '1.20.4']]) {
    const b = document.createElement('button');
    b.className = 'ver-btn';
    b.dataset.ver = ver;
    b.textContent = label;
    b.addEventListener('click', () => { state.cmdVersion = ver; refresh(); });
    host.appendChild(b);
  }
}

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function wire() {
  $('zoom').value = state.zoom;
  $('zoom').addEventListener('input', e => { state.zoom = +e.target.value; refresh(); });

  $('showBody').checked = state.showBody;
  $('showBody').addEventListener('change', e => { state.showBody = e.target.checked; refresh(); });

  $('dyeInput').addEventListener('input', e => { sel().dye = e.target.value; refresh(); });

  $('applyAll').addEventListener('click', () => {
    const src = sel();
    for (const id of PIECE_IDS) {
      state.pieces[id] = { ...state.pieces[id], armor: src.armor, dye: src.dye, pattern: src.pattern, trim: src.trim };
    }
    refresh();
  });

  $('randomSet').addEventListener('click', () => {
    for (const id of PIECE_IDS) {
      const cfg = state.pieces[id];
      cfg.armor = pick(ARMOR_MATERIALS).id;
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

  $('resetAll').addEventListener('click', () => { state = defaultState(); refresh(); });

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
    const canvas = document.createElement('canvas');
    renderFigure(canvas, { scale: 24, pieces: state.pieces, showBody: state.showBody, bg: state.bg });
    const link = document.createElement('a');
    const cfg = sel();
    link.download = `trim-forge-${cfg.armor}-${cfg.pattern}-${cfg.trim}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
}

buildBgRow();
buildVerToggle();
wire();
refresh();
