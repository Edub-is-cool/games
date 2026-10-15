'use strict';

// The World Generator: a big panel (opened from the World tab) with every knob
// for making a new world, and a live preview of the map it will make.
// Options go to newWorld / generateWorld (game.js) as GEN_DEFAULTS overrides.

const GEN_BIOMES = ['grassland', 'savanna', 'desert', 'jungle', 'swamp', 'tundra', 'birch'];
const GEN_PEOPLES = ['human', 'elf', 'orc', 'dwarf'];

const genState = {
  shape: 'island', size: 'medium', W: WORLD_SIZES.medium.W, H: WORLD_SIZES.medium.H,
  autoLand: true, land: 0.45, landmass: 1, roughness: 1, continents: 3,
  mountains: 1, forests: 1, plants: 1, ores: 1, heat: 0, wet: 0, ice: true,
  biomes: [...GEN_BIOMES], rare: 2, rareBiomes: [...RARE_BIOMES], enchanted: true, corruption: false,
  wildlife: true, peoples: [], seed: '',
};

// a typed seed becomes a number; an empty one is picked at random when the world is made
function seedNumber(text) {
  if (/^\d+$/.test(text)) return +text % 1e9;
  let h = 7;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 1e9;
  return h;
}

function genOptions(seed) {
  const g = genState;
  return {
    W: g.W, H: g.H, seed,
    land: g.autoLand ? null : g.land, landmass: g.landmass, roughness: g.roughness, continents: g.continents,
    mountains: g.mountains, forests: g.forests, plants: g.plants, ores: g.ores,
    heat: g.heat, wet: g.wet, ice: g.ice, biomes: g.biomes, rare: g.rare, rareBiomes: g.rareBiomes,
    enchanted: g.enchanted, corruption: g.corruption,
  };
}

// ---------- The panel ----------
const genEl = document.createElement('div');
genEl.id = 'worldGen';
genEl.hidden = true;
document.body.append(genEl);

const slider = (key, label, min, max, step, fmt) => `
  <label class="gen-row"><span>${label}</span>
    <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${genState[key]}">
    <output data-out="${key}">${fmt(genState[key])}</output></label>`;
const check = (key, label) => `<label class="gen-check"><input type="checkbox" data-key="${key}" ${genState[key] ? 'checked' : ''}> ${label}</label>`;
const listCheck = (list, key, label) => `<label class="gen-check"><input type="checkbox" data-list="${list}" data-item="${key}" ${genState[list].includes(key) ? 'checked' : ''}> ${label}</label>`;
const choice = (key, value, label) => `<button type="button" class="gen-choice${genState[key] === value ? ' on' : ''}" data-choice="${key}" data-value="${value}">${label}</button>`;

const pct = v => Math.round(v * 100) + '%';
const times = v => (+v).toFixed(1) + '×';
const FORMATS = {
  land: pct, landmass: times, roughness: times, continents: v => v, mountains: times, forests: times, plants: times, ores: times,
  heat: v => (v < -0.15 ? '❄ cold ' : v > 0.15 ? '🔥 hot ' : '') + (v > 0 ? '+' : '') + (+v).toFixed(2),
  wet: v => (v < -0.1 ? '🏜 dry ' : v > 0.1 ? '💧 wet ' : '') + (v > 0 ? '+' : '') + (+v).toFixed(2),
  rare: v => v, W: v => v, H: v => v,
};

function renderWorldGen() {
  const g = genState;
  const shapeIcons = { island: '🏝', continents: '🗺', pangaea: '🌍', archipelago: '🏖', earth: '🌐', blank: '🌊' };
  genEl.innerHTML = `
    <div class="gen-head"><h2>🌍 World Generator</h2><button type="button" class="gen-close" title="Close">✕</button></div>
    <div class="gen-body">
      <div class="gen-options">
        <section><h3>Template</h3><div class="gen-choices">
          ${Object.entries(WORLD_SHAPES).map(([k, n]) => choice('shape', k, `<span class="gen-ico">${shapeIcons[k] || '🗺'}</span>${n}`)).join('')}
        </div></section>
        <section><h3>Map size</h3><div class="gen-choices">
          ${Object.entries(WORLD_SIZES).map(([k, s]) => choice('size', k, `${s.label}<small>${s.W}×${s.H}</small>`)).join('')}
          ${choice('size', 'custom', 'Custom<small>pick below</small>')}
        </div>
          ${slider('W', 'Width', 100, 720, 20, FORMATS.W)}
          ${slider('H', 'Height', 80, 480, 20, FORMATS.H)}
        </section>
        <section><h3>Land</h3>
          ${check('autoLand', 'Let the template decide how much land')}
          ${slider('land', 'Land amount', 0.1, 0.9, 0.05, pct)}
          ${slider('landmass', 'Landmass size', 0.4, 2.5, 0.1, times)}<p class="gen-hint">Low: many small islands · High: a few huge landmasses</p>
          ${slider('continents', 'Continents', 1, 7, 1, FORMATS.continents)}<p class="gen-hint">For the Continents template</p>
          ${slider('roughness', 'Coastline roughness', 0, 2.5, 0.1, times)}
        </section>
        <section><h3>Terrain</h3>
          ${slider('mountains', 'Mountains', 0.3, 1.8, 0.1, times)}
          ${slider('forests', 'Forests', 0, 2, 0.1, times)}
          ${slider('plants', 'Bushes & flowers', 0, 3, 0.1, times)}
          ${slider('ores', 'Ore veins', 0, 3, 0.1, times)}
          ${check('ice', 'Frozen seas near the poles')}
        </section>
        <section><h3>Climate</h3>
          ${slider('heat', 'Temperature', -0.5, 0.5, 0.05, FORMATS.heat)}
          ${slider('wet', 'Moisture', -0.4, 0.4, 0.05, FORMATS.wet)}
        </section>
        <section><h3>Biomes</h3>
          <div class="gen-checks">${GEN_BIOMES.map(k => listCheck('biomes', k, BIOMES[k].name)).join('')}</div>
          <p class="gen-hint">Switched-off biomes become the closest allowed one</p>
          ${slider('rare', 'Rare biome patches', 0, 10, 1, FORMATS.rare)}
          <div class="gen-checks">${RARE_BIOMES.map(k => listCheck('rareBiomes', k, BIOMES[k]?.name || k)).join('')}</div>
          ${check('enchanted', 'An enchanted grove')}
          ${check('corruption', 'A patch of corruption')}
        </section>
        <section><h3>Life</h3>
          ${check('wildlife', 'Wild animals move into their biomes')}
          <p class="gen-hint">Starting peoples (a small band of each, on land they like)</p>
          <div class="gen-checks">${GEN_PEOPLES.map(k => listCheck('peoples', k, RACES[k].plural)).join('')}</div>
        </section>
        <section><h3>Seed</h3>
          <div class="gen-seed"><input type="text" data-key="seed" placeholder="random" value="${g.seed}" maxlength="24" spellcheck="false">
          <button type="button" class="gen-dice" title="New random seed">🎲</button></div>
          <p class="gen-hint">The same seed and settings make the same world</p>
        </section>
      </div>
      <div class="gen-side">
        <canvas class="gen-preview" width="360" height="240"></canvas>
        <p class="gen-stats"></p>
        <button type="button" class="gen-reset">↺ Reset options</button>
        <button type="button" class="gen-create">✨ Create World</button>
      </div>
    </div>`;
  syncDisabled();
  schedulePreview();
}

// sliders that don't apply right now are greyed out
function syncDisabled() {
  const g = genState;
  const off = {
    land: g.autoLand || g.shape === 'blank', W: g.size !== 'custom', H: g.size !== 'custom',
    continents: g.shape !== 'continents',
  };
  for (const input of genEl.querySelectorAll('input[data-key]')) {
    if (input.dataset.key in off) input.disabled = off[input.dataset.key];
  }
}

genEl.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.key) {
    const key = t.dataset.key;
    genState[key] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value;
    const out = genEl.querySelector(`[data-out="${key}"]`);
    if (out) out.textContent = FORMATS[key](genState[key]);
  } else if (t.dataset.list) {
    const list = genState[t.dataset.list];
    const i = list.indexOf(t.dataset.item);
    if (t.checked && i < 0) list.push(t.dataset.item);
    if (!t.checked && i >= 0) list.splice(i, 1);
  }
  syncDisabled();
  schedulePreview();
});

genEl.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.classList.contains('gen-close')) return closeWorldGen();
  if (b.dataset.choice) {
    genState[b.dataset.choice] = b.dataset.value;
    if (b.dataset.choice === 'size' && WORLD_SIZES[b.dataset.value]) {
      genState.W = WORLD_SIZES[b.dataset.value].W;
      genState.H = WORLD_SIZES[b.dataset.value].H;
    }
    renderWorldGen();
  } else if (b.classList.contains('gen-dice')) {
    genState.seed = String((Math.random() * 1e9) | 0);
    genEl.querySelector('[data-key="seed"]').value = genState.seed;
    schedulePreview();
  } else if (b.classList.contains('gen-reset')) {
    Object.assign(genState, {
      autoLand: true, land: 0.45, landmass: 1, roughness: 1, continents: 3, mountains: 1, forests: 1, plants: 1, ores: 1,
      heat: 0, wet: 0, ice: true, biomes: [...GEN_BIOMES], rare: 2, rareBiomes: [...RARE_BIOMES], enchanted: true, corruption: false,
    });
    renderWorldGen();
  } else if (b.classList.contains('gen-create')) {
    createGeneratedWorld();
  }
});

// ---------- Live preview ----------
// The preview is the same world made smaller (noise is scaled to the map, so
// it keeps its shape), with a fixed seed until you make the world.
let previewTimer = 0, previewSeed = (Math.random() * 1e9) | 0;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(drawPreview, 120);
}

function drawPreview() {
  const c = genEl.querySelector('.gen-preview');
  if (!c || genEl.hidden) return;
  const g = genState;
  const k = Math.min(1, 240 / Math.max(g.W, g.H * 1.5));
  const W = Math.max(40, Math.round(g.W * k)), H = Math.max(28, Math.round(g.H * k));
  c.width = W;
  c.height = H;
  const seed = g.seed ? seedNumber(g.seed) : previewSeed;
  const tiles = generateWorld(W, H, seed, g.shape, genOptions(seed));
  const ctx2 = c.getContext('2d'), img2 = ctx2.createImageData(W, H), px = new Uint32Array(img2.data.buffer);
  let land = 0;
  const counts = {};
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i], col = TILES[t].color;
    px[i] = (0xff000000 | ((col & 255) << 16) | (col & 0xff00) | ((col >> 16) & 255)) >>> 0;
    if (!isWater(t)) land++;
    const b = biomeOf(t);
    if (b) counts[b] = (counts[b] || 0) + 1;
  }
  ctx2.putImageData(img2, 0, 0);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([b, n]) => `${BIOMES[b]?.name || b} ${Math.round((n / Math.max(1, land)) * 100)}%`).join(' · ');
  genEl.querySelector('.gen-stats').textContent =
    `${g.W}×${g.H} · ${Math.round((land / tiles.length) * 100)}% land${top ? ' · ' + top : ''}`;
}

// ---------- Making the world ----------
function createGeneratedWorld() {
  const g = genState;
  const seed = g.seed ? seedNumber(g.seed) : previewSeed;
  state.worldShape = g.shape;
  laws.wildlife = g.wildlife;
  newWorld(WORLD_SIZES[g.size] ? g.size : 'custom', genOptions(seed));
  // starting peoples: a band of each on land they like, spread apart
  const taken = [];
  for (const race of g.peoples) {
    const home = RACES[race].home;
    for (let tries = 0; tries < 400; tries++) {
      const x = 4 + ((Math.random() * (state.W - 8)) | 0), y = 4 + ((Math.random() * (state.H - 8)) | 0);
      if (!home.includes(state.tiles[y * state.W + x]) || taken.some(p => dist(p[0], p[1], x, y) < 30 - tries / 20)) continue;
      for (let n = 0; n < 6; n++) spawnAt(race, x, y);
      taken.push([x, y]);
      break;
    }
  }
  previewSeed = (Math.random() * 1e9) | 0;   // the next preview is a fresh world
  closeWorldGen();
  renderPanel();
  toast(`🌍 A new ${WORLD_SHAPES[g.shape].toLowerCase()} world (${state.W}×${state.H})${g.seed ? ' · seed ' + g.seed : ''}`);
}

function openWorldGen() {
  renderWorldGen();
  genEl.hidden = false;
}

function closeWorldGen() {
  genEl.hidden = true;
}

// opening the World tab opens the generator (clicking it again just folds the toolbar)
document.addEventListener('click', e => {
  if (e.target.closest('#tabs [data-tab="world"]') && state.tab !== 'world') openWorldGen();
}, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && !genEl.hidden) closeWorldGen(); });
