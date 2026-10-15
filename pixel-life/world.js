'use strict';

// The world as a whole: its history log, statistics, world laws, random
// events, rebellions, centuries, favorites, and map sharing.

// ---------- World laws ----------
// Player rules for the simulation. They carry over to new worlds and are saved.
const LAWS = {
  aging:      { label: 'Aging', desc: 'Creatures die of old age', value: true },
  rebellions: { label: 'Rebellions', desc: 'Far-off or unhappy villages break away', value: true },
  alliances:  { label: 'Alliances', desc: 'Kingdoms form alliances', value: true },
  sapience:   { label: 'Animal awakening', desc: 'Animals can become sapient on their own', value: true },
  mutants:    { label: 'Mutant births', desc: 'Genes and traits mutate far more often', value: false },
  wildlife:   { label: 'Wildlife spawns', desc: 'Biomes keep getting new animals', value: true },
  corruption: { label: 'Corruption spreads', desc: 'Corrupted land creeps outward', value: true },
  events:     { label: 'World events', desc: 'Golden ages, schisms, migrants, famines...', value: true },
  war:        { label: 'War', options: { 0: 'Never', 0.3: 'Rare', 1: 'Normal', 3: 'Bloodthirsty' }, value: 1 },
  births:     { label: 'Birth rate', options: { 0.4: 'Low', 1: 'Normal', 2: 'High' }, value: 1 },
};
state.laws = Object.fromEntries(Object.entries(LAWS).map(([k, l]) => [k, l.value]));
const laws = state.laws;

// ---------- History ----------
// Notable happenings are written down as well as shown.
function chronicle(msg) {
  life.history.push({ t: state.tick, msg });
  if (life.history.length > 3000) life.history.splice(0, 500);
  toast(msg);
}

const yearOf = tick => Math.floor(tick / YEAR) + 1;

function historyHtml() {
  const items = life.history.slice(-250).reverse()
    .map(h => `<li><span class="yr">Y${yearOf(h.t)}</span> ${h.msg}</li>`).join('');
  return `<h3>📜 History</h3>${items ? `<ul class="history">${items}</ul>` : '<p>Nothing has happened yet.</p>'}`;
}

// ---------- Statistics ----------
function recordStats() {
  const kpop = {};
  for (const v of life.villages.values()) kpop[v.kingdom] = (kpop[v.kingdom] || 0) + v.pop;
  life.stats.push({
    y: yearOf(state.tick), people: civPopulation(), animals: life.animals,
    kingdoms: life.kingdoms.size, villages: life.villages.size, k: kpop,
  });
  // keep it bounded by thinning out old samples
  if (life.stats.length > 400) life.stats = life.stats.filter((_, i) => i % 2 === 0 || i > 300);
}

function statsHtml() {
  const last = life.stats[life.stats.length - 1];
  const top = [...life.kingdoms.values()]
    .map(k => ({ k, pop: villagesOf(k.id).reduce((a, v) => a + v.pop, 0) }))
    .sort((a, b) => b.pop - a.pop).slice(0, 6);
  return `<h3>📈 Statistics</h3>
    <p>${last ? `Year ${last.y}: ${last.people} people, ${last.animals} animals, ${last.kingdoms} kingdoms, ${last.villages} villages` : 'Statistics are recorded once a year.'}</p>
    <h4>Population</h4><canvas class="chart" id="chartPop" width="360" height="130"></canvas>
    <h4>Largest kingdoms</h4><canvas class="chart" id="chartKing" width="360" height="130"></canvas>
    <dl>${top.map(({ k, pop }) => `<dt>${swatch(k.color)}</dt><dd>${k.name}: ${pop}</dd>`).join('')}</dl>`;
}

function drawChart(id, series) {
  const c = document.getElementById(id);
  if (!c || life.stats.length < 2) return;
  const g = c.getContext('2d'), W = c.width, H = c.height, pad = 18;
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(0, 0, W, H);
  let max = 1;
  for (const s of series) for (const p of life.stats) max = Math.max(max, s.get(p) || 0);
  const x = i => pad + (i / (life.stats.length - 1)) * (W - pad - 4);
  const y = n => H - pad - (n / max) * (H - pad - 6);
  g.font = '10px ui-monospace, Menlo, monospace';
  g.fillStyle = '#9aa4bd';
  g.fillText(String(max), 2, 10);
  g.fillText(`Y${life.stats[0].y}`, pad, H - 4);
  g.fillText(`Y${life.stats[life.stats.length - 1].y}`, W - 40, H - 4);
  for (const s of series) {
    g.strokeStyle = s.color;
    g.lineWidth = 2;
    g.beginPath();
    life.stats.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, x(i), y(s.get(p) || 0)));
    g.stroke();
  }
}

function drawStatsCharts() {
  drawChart('chartPop', [
    { color: '#ffd34d', get: p => p.people },
    { color: '#7ee05a', get: p => p.animals },
  ]);
  const top = [...life.kingdoms.values()].slice(0, 40)
    .map(k => ({ k, pop: villagesOf(k.id).reduce((a, v) => a + v.pop, 0) }))
    .sort((a, b) => b.pop - a.pop).slice(0, 6);
  drawChart('chartKing', top.map(({ k }) => ({ color: k.color, get: p => p.k[k.id] })));
}

// ---------- Rebellions ----------
// Villages far from the capital, of another faith, or worn out by war may
// break away and start their own kingdom, taking neighbors with them.
function rebellions() {
  for (const k of [...life.kingdoms.values()]) {
    const vs = villagesOf(k.id);
    if (vs.length < 4) continue;
    const cap = life.villages.get(k.capital);
    if (!cap) continue;
    for (const v of vs) {
      if (v === cap) continue;
      let p = 0.0015;
      if (dist(v.x, v.y, cap.x, cap.y) > 50) p *= 2;
      if (v.religion && v.religion !== cap.religion) p *= 2;
      if (Object.keys(k.wars).length) p *= 1.5;
      if (rand() < p) { rebel(v, k); return; }
    }
  }
}

function rebel(v, old) {
  const k = createKingdom(v.race);
  k.language = old.language;          // they still speak the same tongue
  k.culture = old.culture;
  k.capital = v.id;
  const joined = [v];
  for (const o of villagesOf(old.id)) {
    if (o !== v && o.id !== old.capital && dist(o.x, o.y, v.x, v.y) < 22 && rand() < 0.4) joined.push(o);
  }
  for (const o of joined) o.kingdom = k.id;
  if (!villagesOf(old.id).length) destroyKingdom(old);
  life.territoryDirty = true;
  chronicle(`🔥 ${v.name} rebelled against the ${old.name} and founded the ${k.name}${joined.length > 1 ? ` with ${joined.length - 1} other village${joined.length > 2 ? 's' : ''}` : ''}`);
  if (life.kingdoms.has(old.id)) declareWar(k, old, 'a war of independence');
}

// ---------- World events ----------
const WORLD_EVENTS = {
  goldenAge() {
    const k = pick([...life.kingdoms.values()]);
    if (!k) return;
    k.goldenUntil = state.tick + 10 * YEAR;
    chronicle(`✨ A golden age begins in the ${k.name}`);
  },
  schism() {
    const counts = {};
    for (const v of life.villages.values()) if (v.religion) counts[v.religion] = (counts[v.religion] || 0) + 1;
    const id = Object.keys(counts).find(r => counts[r] >= 3);
    const rel = id && life.religions.get(+id);
    if (!rel) return;
    const fork = { ...rel, id: life.nextId++, name: `${pick(['Reformed', 'True', 'New', 'Old'])} ${rel.name}`, symbol: pick(SYMBOLS), founded: state.tick };
    life.religions.set(fork.id, fork);
    for (const v of life.villages.values()) if (v.religion === rel.id && rand() < 0.5) setReligion(v, fork.id);
    chronicle(`⛪ A schism split the ${rel.name}; the ${fork.name} was born`);
  },
  migrants() {
    const race = pick(PEOPLE);
    for (let tries = 0; tries < 200; tries++) {
      const x = (rand() * state.W) | 0, y = (rand() * state.H) | 0;
      if (state.tiles[y * state.W + x] !== T.SAND) continue;
      for (let n = 0; n < 8; n++) spawnUnit(race, x + 0.5 + (rand() - 0.5) * 2, y + 0.5 + (rand() - 0.5) * 2, 18 + rand() * 10);
      chronicle(`⛵ A wave of ${RACES[race].plural.toLowerCase()} migrants landed on a far shore`);
      return;
    }
  },
  // disasters strike established places, not peoples that just got started
  famine() {
    const k = pick([...life.kingdoms.values()].filter(k => villagesOf(k.id).length >= 3));
    if (!k) return;
    for (const v of villagesOf(k.id)) v.food = 0;
    chronicle(`🌾 Famine struck the ${k.name}`);
  },
  outbreak() {
    const v = pick([...life.villages.values()].filter(v => v.pop >= 15));
    if (!v) return;
    let n = 0;
    for (const u of life.units) if (u.village === v.id && !u.immune && n < 3) { u.sick = 1; n++; }
    if (n) chronicle(`☣ A plague broke out in ${v.name}`);
  },
  comet() {
    const x = rand() * state.W, y = rand() * state.H;
    if (isWater(state.tiles[Math.floor(y) * state.W + Math.floor(x)])) return;
    usePower('meteor', x, y);
    chronicle(`☄ A comet fell from the sky${life.villages.size ? '' : ' onto empty land'}`);
  },
};

// ---------- World tick ----------
function worldTick() {
  if (state.tick % YEAR === 0) recordStats();
  if (state.tick % 60 === 30 && laws.rebellions) rebellions();
  if (laws.events && state.tick % (4 * YEAR) === 0 && life.kingdoms.size && rand() < 0.6) pick(Object.values(WORLD_EVENTS))();
  if (state.tick % (100 * YEAR) === 0) centurySummary();
}

function centurySummary() {
  const top = [...life.kingdoms.values()]
    .map(k => ({ k, pop: villagesOf(k.id).reduce((a, v) => a + v.pop, 0) }))
    .sort((a, b) => b.pop - a.pop)[0];
  const wars = [...life.kingdoms.values()].reduce((a, k) => a + Object.keys(k.wars).length, 0) / 2;
  chronicle(`📜 Year ${yearOf(state.tick)}: ${life.kingdoms.size} kingdoms, ${civPopulation()} people` +
    (top ? `. The mightiest is the ${top.k.name} (${top.pop})` : '') + `, ${wars} war${wars === 1 ? '' : 's'} raging`);
}

// ---------- Favorites & following ----------
function favoritesHtml() {
  const favs = life.units.filter(u => u.fav && !u.dead);
  return `<h3>⭐ Favorites</h3>${favs.length
    ? `<ul class="history">${favs.map(u => `<li><a data-unit="${u.id}">${u.name}</a> · ${RACES[u.race].name}, ${Math.floor(u.age / YEAR)} years</li>`).join('')}</ul>`
    : '<p>Inspect a creature and press ☆ to add it here.</p>'}`;
}

// clicking a name in the side panel selects and follows that creature
document.getElementById('infoBody').addEventListener('click', e => {
  const a = e.target.closest('[data-unit]');
  const u = a && life.byId.get(+a.dataset.unit);
  if (!u || u.dead) return;
  life.selected = { unit: u };
  state.follow = u.id;
  hudFrame = 0;
});

// ---------- Side panels with controls (laws, map sharing) ----------
let worldPanel = null;

function refreshWorldPanel() {
  const sel = life.selected;
  const key = sel && (sel.laws ? 'laws' : sel.share ? 'share' : null);
  if (key === worldPanel) return !!key;
  worldPanel = key;
  if (!key) return false;
  editing = null;   // so the creature editor rebuilds next time
  infoEdit.textContent = '';
  if (key === 'laws') buildLawsPanel();
  else buildSharePanel();
  return true;
}

function buildLawsPanel() {
  let lastGroup = null;
  for (const [key, law] of Object.entries(LAWS)) {
    if (law.group && law.group !== lastGroup) {
      lastGroup = law.group;
      const h = document.createElement('h4');
      h.textContent = law.group;
      infoEdit.append(h);
    }
    const row = document.createElement('label');
    row.className = 'law';
    if (law.options) {
      const sel = document.createElement('select');
      for (const [v, name] of Object.entries(law.options)) sel.add(new Option(name, v));
      sel.value = String(laws[key]);
      sel.onchange = () => { laws[key] = +sel.value; };
      row.append(law.label, sel);
    } else {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = laws[key];
      box.onchange = () => { laws[key] = box.checked; };
      const text = document.createElement('span');
      text.innerHTML = `<b>${law.label}</b><br><small>${law.desc}</small>`;
      row.append(box, text);
    }
    infoEdit.append(row);
  }
}

// Maps are shared as a short code: the size, then the tiles run-length encoded.
function exportMap() {
  const out = [];
  const t = state.tiles;
  for (let i = 0; i < t.length;) {
    let n = 1;
    while (i + n < t.length && t[i + n] === t[i] && n < 255) n++;
    out.push(t[i], n);
    i += n;
  }
  return `PL1:${state.W}x${state.H}:${bytesToB64(new Uint8Array(out))}`;
}

function importMap(code) {
  const m = /^PL1:(\d+)x(\d+):([A-Za-z0-9+/=]+)$/.exec(code.trim());
  if (!m) return false;
  const W = +m[1], H = +m[2], runs = b64ToBytes(m[3]);
  const tiles = new Uint8Array(W * H);
  let p = 0;
  for (let i = 0; i < runs.length && p < tiles.length; i += 2) {
    if (runs[i] >= TILES.length) return false;
    tiles.fill(runs[i], p, p + runs[i + 1]);
    p += runs[i + 1];
  }
  if (p !== tiles.length) return false;
  state.W = W; state.H = H; state.tiles = tiles; state.tick = 0;
  initBuffers();
  resetLife();
  resetPowers();
  fitCamera();
  return true;
}

function buildSharePanel() {
  const h = text => { const e = document.createElement('h4'); e.textContent = text; return e; };
  const out = document.createElement('textarea');
  out.readOnly = true;
  out.rows = 4;
  out.value = exportMap();
  const copy = document.createElement('button');
  copy.textContent = '📋 Copy code';
  copy.onclick = () => {
    out.select();
    (navigator.clipboard ? navigator.clipboard.writeText(out.value) : Promise.reject())
      .then(() => toast('Map code copied'), () => toast('Select the code and copy it'));
  };
  const inp = document.createElement('textarea');
  inp.rows = 4;
  inp.placeholder = 'Paste a PL1: code here';
  const load = document.createElement('button');
  load.textContent = '📥 Load map';
  load.onclick = () => {
    if (importMap(inp.value)) { toast('Map loaded'); life.selected = null; }
    else toast("That code doesn't look right");
  };
  infoEdit.append(h('Your map code (terrain only)'), out, copy, h('Load a map code'), inp, load);
}
