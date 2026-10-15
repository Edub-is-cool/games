'use strict';

// Interface: map layers, sortable lists of everything, the unit inspector's
// mind and family tree with arrows, Eye of Insight, thought bubbles, event
// pop-ups, camera bookmarks, the god's name, and richer graphs. Loaded last
// before main.js.

// ---------- Map layers ----------
// What the territory overlay is colored by. Unit-based layers (clans,
// subspecies) mark creatures instead of land.
const LAYERS = {
  kingdoms: 'Kingdoms', cities: 'Cities', alliances: 'Alliances', religions: 'Religions', cultures: 'Cultures',
  languages: 'Languages', clans: 'Clans', subspecies: 'Subspecies', none: 'No borders',
};
state.layer = 'kingdoms';
state.showWarLines = true;
state.eyeOfInsight = false;

const hashColor = key => {
  const h = hash2(String(key).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) | 0, 3, 11);
  const hue = Math.floor(h * 360);
  return hslToHex(hue, 70, 55);
};
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const f = n => { const k = (n + h / 30) % 12; const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255); };
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// alliance blocs: kingdoms joined through any chain of alliances
function allianceBloc(k) {
  const seen = new Set([k.id]), stack = [k];
  while (stack.length) for (const id of Object.keys(alliesOf(stack.pop()))) if (!seen.has(+id)) { seen.add(+id); const o = life.kingdoms.get(+id); if (o) stack.push(o); }
  return Math.min(...seen);
}

// [group key, color] for a village under the current layer, or null to hide it
function overlayGroup(v) {
  const k = life.kingdoms.get(v.kingdom);
  switch (state.layer) {
    case 'kingdoms': return k ? [k.id, k.color] : null;
    case 'cities': return [v.id, hashColor('v' + v.id)];
    case 'alliances': {
      if (!k) return null;
      const bloc = allianceBloc(k);
      return [bloc, Object.keys(alliesOf(k)).length ? hashColor('a' + bloc) : '#777777'];
    }
    case 'religions': { const r = life.religions.get(v.religion); return r ? [r.id, r.color] : null; }
    case 'cultures': { const c = k && cultureOf(k); return c ? [c.id, hashColor('c' + c.id)] : null; }
    case 'languages': { const l = k && languageOf(k); return l ? [l.id, hashColor('l' + l.id)] : null; }
    default: return null;
  }
}

function setLayer(layer) {
  state.layer = layer;
  life.territoryDirty = true;
  renderPanel();
}

// ---------- Drawing over the map ----------
function drawUiOverlays(ox, oy, z) {
  const s = Math.max(1, Math.round(z / 4));
  // creature-based layers: a colored dot under each creature
  if (state.layer === 'clans' || state.layer === 'subspecies') {
    for (const u of life.units) {
      if (u.dead) continue;
      const key = state.layer === 'clans' ? u.clan : u.sub;
      if (!key) continue;
      ctx.fillStyle = hashColor(state.layer + key);
      ctx.fillRect(ox + u.x * z - s, oy + u.y * z, 2 * s, s);
    }
  }
  // war lines between capitals
  if (state.showWarLines) {
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.strokeStyle = 'rgba(255,60,60,0.55)';
    ctx.lineWidth = Math.max(1, dpr);
    const done = new Set();
    for (const k of life.kingdoms.values()) {
      const a = life.villages.get(k.capital);
      for (const id of Object.keys(k.wars)) {
        const key = [k.id, +id].sort().join('-');
        const b = life.villages.get(life.kingdoms.get(+id)?.capital);
        if (!a || !b || done.has(key)) continue;
        done.add(key);
        ctx.beginPath();
        ctx.moveTo(ox + a.x * z, oy + a.y * z);
        ctx.lineTo(ox + b.x * z, oy + b.y * z);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }
  // Eye of Insight: creatures carrying traits you haven't discovered yet
  if (state.eyeOfInsight) {
    const pulse = 0.5 + Math.sin(performance.now() / 200) * 0.5;
    ctx.strokeStyle = `rgba(126,224,176,${0.4 + pulse * 0.6})`;
    ctx.lineWidth = Math.max(1, dpr);
    for (const u of life.units) {
      if (u.dead || !u.traits || !u.traits.some(t => !traitUnlocked(t) && !TRAITS[t].title)) continue;
      ctx.beginPath();
      ctx.arc(ox + u.x * z, oy + u.y * z - 4 * s, 4 * s + pulse * 2 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  drawSelectionArrows(ox, oy, z);
  drawThoughts(ox, oy, z, s);
}

// arrows from the selected creature to its lover, home, parents, kids and target
function drawSelectionArrows(ox, oy, z) {
  const u = life.selected && life.selected.unit;
  if (!u || u.dead) return;
  const line = (x, y, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, dpr * 1.5);
    ctx.beginPath();
    ctx.moveTo(ox + u.x * z, oy + u.y * z);
    ctx.lineTo(ox + x * z, oy + y * z);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * z - 2 * dpr, oy + y * z - 2 * dpr, 4 * dpr, 4 * dpr);
  };
  ctx.globalAlpha = 0.8;
  const home = life.villages.get(u.village);
  if (home) line(home.x, home.y, '#ffffff');
  const lover = u.love && life.byId.get(u.love);
  if (lover && !lover.dead) line(lover.x, lover.y, '#ff7ab0');
  for (const id of u.parents || []) { const p = life.byId.get(id); if (p && !p.dead) line(p.x, p.y, '#7fb8ff'); }
  for (const o of life.units) if (!o.dead && o.parents && o.parents.includes(u.id)) line(o.x, o.y, '#7ee05a');
  const foe = life.byId.get(u.foe || u.preyId);
  if (foe && !foe.dead) line(foe.x, foe.y, '#ff4040');
  ctx.globalAlpha = 1;
}

// ---------- Thought bubbles ----------
function think(u) {
  const v = life.villages.get(u.village);
  let t = null;
  if (u.foe) t = '⚔';
  else if (u.love && rand() < 0.4) t = '❤';
  else if (v && v.food <= 0) t = '🍗';
  else if ((u.happy ?? 60) < 25) t = '😢';
  else if (u.desire) t = '✨';
  else if (u.task && u.task.type !== 'idle') t = { farm: '🌾', wood: '🪵', stone: '⛏', hunt: '🏹' }[u.task.type] || '⚒';
  else if ((u.happy ?? 60) > 80) t = '🙂';
  if (t) { u.thought = t; u.thoughtUntil = state.tick + 30; }
}

function thoughtTick() {
  for (let n = 0; n < 3; n++) {
    const u = life.units[(rand() * life.units.length) | 0];
    if (u && !u.dead && RACES[u.race].civ) think(u);
  }
}

function drawThoughts(ox, oy, z, zs) {
  if (zs < 2) return;
  const s = Math.min(zs, 2.5) * dpr / Math.max(1, dpr);   // bubbles stay small when zoomed far in
  ctx.font = `${Math.round(7 * s)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const u of life.units) {
    if (u.dead || !u.thought || state.tick > u.thoughtUntil || (u.say && state.tick <= u.sayUntil)) continue;
    const x = ox + u.x * z + 3 * zs, y = oy + u.y * z - 8 * zs;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y - 3 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 4 * s, y + 1 * s, s, s);
    ctx.fillStyle = '#222';
    ctx.fillText(u.thought, x, y + s);
  }
}

// ---------- Important-event pop-ups ----------
const popupEl = document.getElementById('popup');
let popupTimer = 0;
const BIG_EVENT = /^(🌗|🐉|👽|😈|☢|🪙|🔥|📜|🌋|🕳|🛸|🌪|💀 A necro|🐀|🧊|🌕|🦠)|has fallen|was razed/;

const _chronicle = chronicle;
chronicle = function (msg) {
  _chronicle(msg);
  if (BIG_EVENT.test(msg)) {
    popupEl.textContent = msg;
    popupEl.hidden = false;
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => { popupEl.hidden = true; }, 3500);
  }
};

// renamed things keep their past names, and the history records it
document.getElementById('infoBody').addEventListener('click', e => {
  const a = e.target.closest('[data-rename]');
  if (!a || !RENAMABLE[a.dataset.rename]) return;
  const thing = RENAMABLE[a.dataset.rename](decodeURIComponent(a.dataset.id));
  if (!thing) return;
  const old = thing.name;
  setTimeout(() => {
    if (thing.name === old) return;
    (thing.pastNames ||= []).push(old);
    chronicle(`✏️ ${old} is now known as ${thing.name}`);
  }, 0);
}, true);

// ---------- Lists of everything ----------
const LISTS = {
  kingdoms: { name: 'Kingdoms', sorts: ['population', 'villages', 'renown', 'gold', 'age'] },
  cities: { name: 'Cities', sorts: ['population', 'gold', 'age'] },
  wars: { name: 'Wars', sorts: ['age'] },
  alliances: { name: 'Alliances', sorts: ['size'] },
  armies: { name: 'Armies', sorts: ['size'] },
  plots: { name: 'Plots', sorts: ['progress'] },
  religions: { name: 'Religions', sorts: ['villages', 'age'] },
  cultures: { name: 'Cultures', sorts: ['kingdoms'] },
  languages: { name: 'Languages', sorts: ['speakers'] },
  clans: { name: 'Clans', sorts: ['members'] },
  subspecies: { name: 'Subspecies', sorts: ['members', 'age'] },
  books: { name: 'Books', sorts: ['age'] },
};
state.list = { kind: 'kingdoms', sort: 'population' };

const kpop = k => villagesOf(k.id).reduce((a, v) => a + v.pop, 0);
const go = (x, y, label) => `<a data-goto="${x},${y}">${label}</a>`;

function listRows() {
  const { kind, sort } = state.list;
  const yr = t => `Y${yearOf(t)}`;
  const kings = [...life.kingdoms.values()];
  switch (kind) {
    case 'kingdoms': {
      const key = { population: kpop, villages: k => villagesOf(k.id).length, renown: k => k.renown || 0, gold: k => k.gold || 0, age: k => -k.founded }[sort];
      return kings.sort((a, b) => key(b) - key(a)).map(k => {
        const cap = life.villages.get(k.capital);
        return `${swatch(k.color)}${cap ? go(cap.x, cap.y, k.name) : k.name}${pen('kingdom', k.id)} · ${kpop(k)} people, ${villagesOf(k.id).length} villages, renown ${Math.floor(k.renown || 0)}`;
      });
    }
    case 'cities': {
      const key = { population: v => v.pop, gold: v => v.gold || 0, age: v => -v.founded }[sort];
      return [...life.villages.values()].sort((a, b) => key(b) - key(a)).map(v => {
        const k = life.kingdoms.get(v.kingdom);
        return `${k ? swatch(k.color) : ''}${go(v.x, v.y, v.name)}${pen('village', v.id)} · ${v.pop} people${v.pastNames ? ` (once ${v.pastNames.join(', ')})` : ''}`;
      });
    }
    case 'wars': {
      const out = [], seen = new Set();
      for (const k of kings) for (const [id, t] of Object.entries(k.wars)) {
        const o = life.kingdoms.get(+id), key = [k.id, +id].sort().join('-');
        if (!o || seen.has(key)) continue;
        seen.add(key);
        out.push([t, `⚔ ${k.name} vs ${o.name} · since ${yr(t)}`]);
      }
      return out.sort((a, b) => a[0] - b[0]).map(r => r[1]);
    }
    case 'alliances': {
      const blocs = new Map();
      for (const k of kings) if (Object.keys(alliesOf(k)).length) { const b = allianceBloc(k); (blocs.get(b) || blocs.set(b, []).get(b)).push(k); }
      return [...blocs.values()].sort((a, b) => b.length - a.length).map(ks => `🤝 ${ks.map(k => swatch(k.color) + k.name).join(', ')}`);
    }
    case 'armies':
      return kings.filter(k => k.army).sort((a, b) => (b.army.size || 0) - (a.army.size || 0)).map(k => {
        const c = life.byId.get(k.army.captain), t = life.villages.get(k.army.target);
        return `🚩 ${k.name}: ${k.army.size || 0} warriors under ${c ? unitLink(c.id) : '?'}, ${k.army.state === 'march' ? 'marching on' : 'gathering against'} ${t ? go(t.x, t.y, t.name) : '?'}`;
      });
    case 'plots':
      return kings.filter(k => k.plot).sort((a, b) => b.plot.progress - a.plot.progress).map(k => `🕵 ${k.name} plots ${PLOTS[k.plot.type].name} against the ${life.kingdoms.get(k.plot.target)?.name || '?'} (${Math.floor(k.plot.progress)}%)`);
    case 'religions': {
      const n = r => [...life.villages.values()].filter(v => v.religion === r.id).length;
      return [...life.religions.values()].sort((a, b) => sort === 'age' ? a.founded - b.founded : n(b) - n(a)).filter(r => n(r) || sort === 'age')
        .map(r => `${r.symbol} ${r.name}${pen('religion', r.id)} · ${n(r)} villages · founded ${yr(r.founded)} in ${r.origin || '?'}${r.traits?.length ? ' · ' + r.traits.join(', ') : ''}`);
    }
    case 'cultures': {
      const n = c => kings.filter(k => k.culture === c.id).length;
      return [...life.cultures.values()].filter(n).sort((a, b) => n(b) - n(a)).map(c => `🎭 ${c.name}${pen('culture', c.id)} · ${n(c)} kingdoms · ${c.traits.map(t => CULTURE_TRAITS[t]?.split(' (')[0]).join(', ')}`);
    }
    case 'languages': {
      const counts = {};
      for (const u of life.units) if (!u.dead && u.language) counts[u.language] = (counts[u.language] || 0) + 1;
      return [...life.languages.values()].filter(l => counts[l.id]).sort((a, b) => counts[b.id] - counts[a.id]).map(l => `🗣 ${l.name}${pen('language', l.id)} · ${counts[l.id]} speakers${l.traits?.length ? ' · ' + l.traits.join(', ') : ''}`);
    }
    case 'clans': {
      const counts = {};
      for (const u of life.units) if (!u.dead && u.clan) counts[u.clan] = (counts[u.clan] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([c, n]) => `👪 ${c} clan${pen('clan', c)} · ${n} members${clanTraits(c).length ? ' · ' + clanTraits(c).join(', ') : ''}`);
    }
    case 'subspecies': {
      const counts = {};
      for (const u of life.units) if (!u.dead && u.sub) counts[u.sub] = (counts[u.sub] || 0) + 1;
      return life.subspecies.filter(s => counts[s.id]).sort((a, b) => sort === 'age' ? a.year - b.year : counts[b.id] - counts[a.id]).map(s => `🧬 ${s.name} · ${counts[s.id]} alive · since Y${s.year}${s.traits.length ? ' · ' + s.traits.map(t => TRAITS[t]?.name).join(', ') : ''}`);
    }
    case 'books':
      return life.books.slice().reverse().map(b => `📖 "${b.title}" by ${b.author}, Y${b.year} · ${life.languages.get(b.lang)?.name || '?'} · teaches ${TRAITS[b.idea]?.name || b.idea}`);
  }
  return [];
}

function listsHtml() {
  const tabs = Object.entries(LISTS).map(([k, l]) => `<a class="tab${state.list.kind === k ? ' on' : ''}" data-list="${k}">${l.name}</a>`).join(' ');
  const sorts = LISTS[state.list.kind].sorts;
  const sortBar = sorts.length > 1 ? `<p class="sorts">Sort: ${sorts.map(s => `<a class="tab${state.list.sort === s ? ' on' : ''}" data-sort="${s}">${s}</a>`).join(' ')}</p>` : '';
  const items = listRows();
  return `<h3>📋 Lists</h3><p class="tabs">${tabs}</p>${sortBar}${items.length ? `<ul class="history">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : '<p>Nothing here yet.</p>'}`;
}

document.getElementById('infoBody').addEventListener('click', e => {
  const l = e.target.closest('[data-list]'), s = e.target.closest('[data-sort]'), g = e.target.closest('[data-goto]');
  if (l) { state.list = { kind: l.dataset.list, sort: LISTS[l.dataset.list].sorts[0] }; hudFrame = 0; }
  else if (s) { state.list.sort = s.dataset.sort; hudFrame = 0; }
  else if (g) {
    const [x, y] = g.dataset.goto.split(',').map(Number);
    state.cam.x = x; state.cam.y = y; state.cam.zoom = Math.max(state.cam.zoom, 6 * dpr);
    state.follow = 0;
    clampCamera();
  }
});

// ---------- The mind and the family tree ----------
function mindHtml(u) {
  const mind = (u.traits || []).filter(t => TRAITS[t]?.cat === 'Mind').map(t => TRAITS[t].name);
  const thoughts = [];
  if (u.foe) thoughts.push('fighting');
  if (u.desire) thoughts.push('yearning for the ' + (STRUCTURES[u.desire]?.name || 'unknown'));
  if (u.love) thoughts.push('in love');
  if (u.king) thoughts.push('ruling a kingdom');
  if (u.crying) thoughts.push('grieving');
  return `<h4>🧠 Mind</h4><p>${mind.length ? mind.join(', ') : 'An ordinary mind'}. ${moodLabel(u.happy ?? 60)}${thoughts.length ? ', ' + thoughts.join(', ') : ''}.</p>`;
}

function familyTreeHtml(u) {
  const alive = id => { const o = life.byId.get(id); return o && !o.dead ? o : null; };
  const name = (id, fallback) => unitLink(id, fallback);
  const parents = (u.parents || []).map((id, i) => ({ id, name: (u.parentNames || [])[i] }));
  const grand = parents.flatMap(p => { const o = alive(p.id); return o && o.parents ? o.parents.map((id, i) => ({ id, name: (o.parentNames || [])[i] })) : []; });
  const kids = life.units.filter(o => !o.dead && o.parents && o.parents.includes(u.id));
  const grandkids = life.units.filter(o => !o.dead && o.parents && kids.some(k => o.parents.includes(k.id)));
  const sibs = life.units.filter(o => !o.dead && o !== u && o.parents && u.parents && o.parents.some(id => u.parents.includes(id)));
  const line = (label, list) => list.length ? `<dt>${label}</dt><dd>${list.slice(0, 6).join(', ')}${list.length > 6 ? ` +${list.length - 6}` : ''}</dd>` : '';
  const body = line('Grandparents', grand.map(g => name(g.id, g.name))) + line('Parents', parents.map(p => name(p.id, p.name))) +
    line('Siblings', sibs.map(o => unitLink(o.id))) + line('Children', kids.map(o => unitLink(o.id))) + line('Grandchildren', grandkids.map(o => unitLink(o.id)));
  return body ? `<h4>🌳 Family tree</h4><dl>${body}</dl>` : '';
}

const _infoHtml = infoHtml;
infoHtml = function () {
  const sel = life.selected;
  if (sel && sel.lists) return listsHtml();
  const html = _infoHtml();
  if (sel && sel.unit && !sel.unit.dead && RACES[sel.unit.race].civ) return html + mindHtml(sel.unit) + familyTreeHtml(sel.unit);
  return html;
};

// ---------- Camera bookmarks ----------
state.bookmarks = {};
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || !/^[1-9]$/.test(e.key)) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    state.bookmarks[e.key] = { x: state.cam.x, y: state.cam.y, zoom: state.cam.zoom };
    toast(`📍 Bookmark ${e.key} saved`);
  } else if (state.bookmarks[e.key]) {
    Object.assign(state.cam, state.bookmarks[e.key]);
    state.follow = 0;
    clampCamera();
  }
});

// (saves remember the camera and bookmarks: see saveWorld / loadWorld in game.js)

// ---------- The god's name ----------
function setGodName() {
  const name = prompt('What is your name, O God?', progress.godName || '');
  if (!name) return;
  progress.godName = name.replace(/[<>&"]/g, '').trim().slice(0, 24);
  saveProgress();
  document.querySelector('.brand').textContent = `Pixel Life · ${progress.godName}`;
  toast(`🙏 The world now knows you as ${progress.godName}`);
}
if (progress.godName) document.querySelector('.brand').textContent = `Pixel Life · ${progress.godName}`;

// some books and faiths are about the god
const _writeBook = writeBook;
writeBook = function (v) {
  _writeBook(v);
  const b = life.books[life.books.length - 1];
  if (b && progress.godName && rand() < 0.25) b.title = `${pick(['Prayers to', 'The Gospel of', 'Hymns for', 'Fear of'])} ${progress.godName}`;
};
const _foundReligion2 = foundReligion;
foundReligion = function (v) {
  _foundReligion2(v);
  const r = life.religions.get(v.religion);
  if (r && progress.godName && rand() < 0.3) r.name = `${pick(FAITHS)} of ${progress.godName}`;
};

// ---------- Richer graphs ----------
const _recordStats = recordStats;
recordStats = function () {
  _recordStats();
  const last = life.stats[life.stats.length - 1];
  last.gold = Math.round([...life.kingdoms.values()].reduce((a, k) => a + (k.gold || 0), 0) + [...life.villages.values()].reduce((a, v) => a + (v.gold || 0), 0));
  last.renown = Math.round(Math.max(0, ...[...life.kingdoms.values()].map(k => k.renown || 0)));
  last.religions = new Set([...life.villages.values()].map(v => v.religion).filter(Boolean)).size;
};

const _statsHtml = statsHtml;
statsHtml = () => _statsHtml().replace('<h4>Largest kingdoms</h4>', '<h4>Wealth (gold) and top renown</h4><canvas class="chart" id="chartGold" width="360" height="110"></canvas><h4>Largest kingdoms</h4>') +
  '<p class="hint">Hover a chart to see the year and the change since the last sample.</p>';
const _drawStatsCharts = drawStatsCharts;
drawStatsCharts = function () {
  _drawStatsCharts();
  drawChart('chartGold', [{ color: '#ffd34d', get: p => p.gold }, { color: '#b06cff', get: p => p.renown }]);
};

// hover tooltips with deltas
document.getElementById('infoBody').addEventListener('mousemove', e => {
  const c = e.target.closest('canvas.chart');
  if (!c || life.stats.length < 2) return;
  const r = c.getBoundingClientRect();
  const i = Math.max(0, Math.min(life.stats.length - 1, Math.round(((e.clientX - r.left) / r.width * c.width - 18) / (c.width - 22) * (life.stats.length - 1))));
  const p = life.stats[i], q = life.stats[Math.max(0, i - 1)];
  const d = (a, b) => (a - b >= 0 ? '+' : '') + (a - b);
  c.title = `Year ${p.y}: ${p.people} people (${d(p.people, q.people)}), ${p.animals} animals (${d(p.animals, q.animals)}), ${p.kingdoms} kingdoms` +
    (p.gold !== undefined ? `, ${p.gold} gold (${d(p.gold, q.gold || 0)}), renown ${p.renown}` : '');
});

// ---------- Panels ----------
const LAYER_PANEL = () => [
  { heading: 'Map layer' },
  ...Object.entries(LAYERS).map(([k, name]) => ({ action: () => setLayer(k), label: name, active: state.layer === k })),
  { heading: 'Overlays' },
  { action: () => { state.showWarLines = !state.showWarLines; renderPanel(); }, label: '⚔ War lines', active: state.showWarLines },
  { action: () => { state.eyeOfInsight = !state.eyeOfInsight; renderPanel(); }, label: '👁 Eye of Insight', active: state.eyeOfInsight },
];
PANELS.layers = LAYER_PANEL;

const _worldPanel = PANELS.world;
PANELS.world = () => [
  ..._worldPanel(),
  { action: () => { life.selected = { lists: true }; hudFrame = 0; }, label: '📋 Lists' },
  { action: setGodName, label: progress.godName ? `🙏 ${progress.godName}` : '🙏 God Name' },
];

function uiTick() { thoughtTick(); }
