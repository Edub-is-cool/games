'use strict';

// More interface: a minimap, save slots, undo for terrain, a world timeline,
// and life stories for creatures.

// ---------- Minimap ----------
// The whole world in the bottom-right corner; click or drag it to move the camera.
const miniWrap = document.createElement('div');
miniWrap.id = 'miniWrap';
miniWrap.innerHTML = '<button type="button" id="miniToggle" title="Hide the minimap">🗺</button><canvas id="minimap"></canvas>';
document.body.append(miniWrap);
const miniCanvas = miniWrap.querySelector('#minimap'), miniCtx = miniCanvas.getContext('2d');
const miniBase = document.createElement('canvas');   // the map, redrawn now and then
let miniFrame = 0, miniOpen = true;
try { miniOpen = localStorage.getItem('pixellife-minimap') !== 'off'; } catch { /* no storage */ }

function miniSize() {
  const k = Math.min(200 / state.W, 130 / state.H);
  return [Math.round(state.W * k), Math.round(state.H * k)];
}

function drawMinimap() {
  miniWrap.classList.toggle('closed', !miniOpen);
  if (!miniOpen || !worldCanvas) return;
  const [mw, mh] = miniSize();
  if (miniCanvas.width !== mw || miniCanvas.height !== mh) { miniCanvas.width = miniBase.width = mw; miniCanvas.height = miniBase.height = mh; miniFrame = 0; }
  if (miniFrame++ % 30 === 0 || miniFrame < 4) {   // also the first frames, before the map is drawn
    const g = miniBase.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.drawImage(worldCanvas, 0, 0, mw, mh);
    if (typeof overlayCanvas !== 'undefined' && overlayCanvas) { g.globalAlpha = 0.8; g.drawImage(overlayCanvas, 0, 0, mw, mh); g.globalAlpha = 1; }
  }
  miniCtx.drawImage(miniBase, 0, 0);
  // the part of the world on screen
  const { cam } = state, k = mw / state.W;
  const vw = (view.width / cam.zoom) * k, vh = (view.height / cam.zoom) * k;
  miniCtx.strokeStyle = '#fff';
  miniCtx.lineWidth = 1.5;
  miniCtx.strokeRect(cam.x * k - vw / 2, cam.y * k - vh / 2, vw, vh);
}

function miniJump(e) {
  const r = miniCanvas.getBoundingClientRect();
  state.cam.x = ((e.clientX - r.left) / r.width) * state.W;
  state.cam.y = ((e.clientY - r.top) / r.height) * state.H;
  state.follow = 0;
  clampCamera();
}
miniCanvas.addEventListener('pointerdown', e => { e.stopPropagation(); miniCanvas.setPointerCapture(e.pointerId); miniJump(e); });
miniCanvas.addEventListener('pointermove', e => { if (e.buttons) miniJump(e); });
miniWrap.querySelector('#miniToggle').onclick = () => {
  miniOpen = !miniOpen;
  try { localStorage.setItem('pixellife-minimap', miniOpen ? 'on' : 'off'); } catch { /* no storage */ }
  miniWrap.querySelector('#miniToggle').title = miniOpen ? 'Hide the minimap' : 'Show the minimap';
};

// ---------- Save slots ----------
// Five slots (the first is the old single save). A small "-meta" entry next to
// each holds its name, date, year and picture so the list opens fast.
const SAVE_SLOTS = [SAVE_KEY, 'pixellife-save-slot2', 'pixellife-save-slot3', 'pixellife-save-slot4', 'pixellife-save-slot5'];
const savesEl = document.createElement('div');
savesEl.id = 'savesBox';
savesEl.hidden = true;
document.body.append(savesEl);
let deleteArmed = null;

function slotMeta(key) {
  try {
    const meta = JSON.parse(localStorage.getItem(key + '-meta'));
    if (meta) return meta;
    return localStorage.getItem(key) ? { name: 'Saved world' } : null;
  } catch { return null; }
}

function renderSaves() {
  savesEl.innerHTML = `<div class="saves-head"><h3>💾 Saved worlds</h3><button type="button" class="saves-close" title="Close">✕</button></div>
    ${SAVE_SLOTS.map((key, i) => {
      const m = slotMeta(key);
      return `<div class="slot">
        <div class="slot-pic">${m && m.pic ? `<img src="${m.pic}" alt="">` : `<span>${m ? '🗺' : i + 1}</span>`}</div>
        <div class="slot-info"><b>${m ? m.name : 'Empty slot'}</b><small>${m && m.year ? `Year ${m.year} · ${m.size} · ${m.date}` : m ? 'An older save' : ''}</small></div>
        <div class="slot-actions">
          <button type="button" data-save="${i}">Save here</button>
          ${m ? `<button type="button" data-load="${i}">Load</button><button type="button" data-del="${i}" class="${deleteArmed === i ? 'armed' : ''}">${deleteArmed === i ? 'Sure?' : 'Delete'}</button>` : ''}
        </div></div>`;
    }).join('')}`;
}

function openSaves() { deleteArmed = null; renderSaves(); savesEl.hidden = false; }

savesEl.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.classList.contains('saves-close')) { savesEl.hidden = true; return; }
  if (b.dataset.save) {
    const key = SAVE_SLOTS[+b.dataset.save], old = slotMeta(key);
    askName(old ? old.name : `World ${+b.dataset.save + 1}`, name => {
      miniFrame = 0; drawMinimap();
      const meta = { name, year: Math.floor(state.tick / YEAR) + 1, size: `${state.W}×${state.H}`, date: new Date().toLocaleDateString(), pic: miniBase.toDataURL() };
      if (saveWorld(key, { meta })) {
        try { localStorage.setItem(key + '-meta', JSON.stringify(meta)); } catch { /* no room */ }
      }
      renderSaves();
    }, 'Name this save', 24);
  } else if (b.dataset.load) {
    loadWorld(SAVE_SLOTS[+b.dataset.load]);
    savesEl.hidden = true;
  } else if (b.dataset.del) {
    const i = +b.dataset.del;
    if (deleteArmed !== i) { deleteArmed = i; renderSaves(); return; }
    try { localStorage.removeItem(SAVE_SLOTS[i]); localStorage.removeItem(SAVE_SLOTS[i] + '-meta'); } catch { /* no storage */ }
    deleteArmed = null;
    renderSaves();
    toast('Save deleted');
  }
});

// ---------- Undo for terrain ----------
// Every press of a tool that can change the land keeps a copy of the map first.
// Ctrl+Z (or ↶ in the brush row) puts the land back the way it was.
const undoStack = [];
const changesLand = tool => tool !== 'hand' && tool !== 'control' && tool !== 'grab' && !tool.startsWith('spawn:');
view.addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.shiftKey || !changesLand(state.tool) || pointers.size > 0) return;
  undoStack.push(state.tiles.slice());
  if (undoStack.length > 15) undoStack.shift();
}, true);

function undoTerrain() {
  const snap = undoStack.pop();
  if (!snap || snap.length !== state.tiles.length) { toast('Nothing to undo'); return; }
  state.tiles.set(snap);
  markDirty(0, 0, state.W - 1, state.H - 1);
  life.territoryDirty = true;
  toast('↶ Undone');
}
const undoBtn = document.createElement('button');
undoBtn.id = 'undoBtn';
undoBtn.title = 'Undo the last change to the land (Ctrl+Z)';
undoBtn.textContent = '↶ Undo';
undoBtn.onclick = undoTerrain;
brushEl.append(undoBtn);
addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); undoTerrain(); }
});

// ---------- World timeline ----------
// A strip of the big moments in history; click one to fly the camera there.
const TIMELINE_EVENT = /👑|⚔|💍|⚓|🔥|🗡|🏃|🧠|🐉|☢|🌋|🌪|🛸|💀 A necro|✨ A golden|has fallen|founded the|took the capital|declared|made peace|was razed/;
const timelineEl = document.createElement('div');
timelineEl.id = 'timeline';
timelineEl.hidden = true;
timelineEl.innerHTML = '<div class="tl-head"><b>🕰 Timeline</b><span class="hint">Click a moment to go there</span><button type="button" class="tl-close" title="Close">✕</button></div><div class="tl-track"></div>';
document.body.append(timelineEl);
const tlTrack = timelineEl.querySelector('.tl-track');
let tlCount = -1;

function renderTimeline() {
  const events = life.history.filter(h => TIMELINE_EVENT.test(h.msg)).slice(-150);
  if (events.length === tlCount && tlTrack.childElementCount) return;
  tlCount = events.length;
  tlTrack.innerHTML = events.length ? events.map(h => `<button type="button" class="tl-card" data-msg="${encodeURIComponent(h.msg)}">
      <small>Year ${Math.floor(h.t / YEAR) + 1}</small><span>${h.msg}</span></button>`).join('')
    : '<p class="hint">Nothing has happened yet. Give it time!</p>';
  tlTrack.scrollLeft = tlTrack.scrollWidth;
}

// where a history line happened: the first city or kingdom it names
function placeOf(msg) {
  let best = null;
  for (const v of life.villages.values()) if (msg.includes(v.name) && (!best || v.name.length > best.name.length)) best = { name: v.name, x: v.x, y: v.y };
  for (const k of life.kingdoms.values()) {
    const cap = life.villages.get(k.capital);
    if (cap && msg.includes(k.name) && (!best || k.name.length > best.name.length)) best = { name: k.name, x: cap.x, y: cap.y };
  }
  return best;
}

timelineEl.addEventListener('click', e => {
  if (e.target.closest('.tl-close')) { timelineEl.hidden = true; return; }
  const card = e.target.closest('.tl-card');
  if (!card) return;
  const place = placeOf(decodeURIComponent(card.dataset.msg));
  if (!place) { toast('That place is gone now'); return; }
  state.follow = 0;
  state.cam.x = place.x;
  state.cam.y = place.y;
  state.cam.zoom = Math.max(state.cam.zoom, 10 * dpr);
  clampCamera();
});
tlTrack.addEventListener('wheel', e => {
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  tlTrack.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive: false });

function openTimeline() { tlCount = -1; timelineEl.hidden = false; renderTimeline(); }

// ---------- Life stories ----------
// Every so often each person's life is checked for something new (moving,
// love, the crown, a title, a kill milestone) and it's written into u.bio.
function addBio(u, text) {
  (u.bio ||= []).push([state.tick, text]);
  if (u.bio.length > 16) u.bio.splice(2, 1);   // keep the start of the story and the latest
}
const nameOf = id => life.byId.get(id)?.name;

function storyTick() {
  for (const u of life.units) {
    if (u.dead || !RACES[u.race].civ) continue;
    const was = u.bk;
    const village = life.villages.get(u.village);
    const k = life.kingdoms.get(kingdomOf(u));
    const ruler = !!(k && k.king === u.id);
    const lord = !!(village && typeof lordOf === 'function' && lordOf(village) === u);
    const titles = (u.traits || []).filter(t => TRAITS[t] && TRAITS[t].title);
    if (!was) {
      const parents = (u.parents || []).map(nameOf).filter(Boolean);
      addBio(u, u.age < YEAR ? `Born${village ? ' in ' + village.name : ''}${parents.length ? ' to ' + parents.join(' and ') : ''}` : 'Appeared in the world');
    } else {
      if (u.village && u.village !== was.village && village) {
        addBio(u, village.founded > state.tick - 30 && village.pop <= 2 ? `Founded ${village.name}` : `Moved to ${village.name}${k ? ' in the ' + k.name : ''}`);
      } else if (!u.village && was.village && u.settleTravel) addBio(u, 'Set out to settle new land');
      if (ruler && !was.ruler) addBio(u, `Became ruler of the ${k.name}`);
      if (!ruler && was.ruler) addBio(u, 'Lost the throne');
      if (lord && !was.lord) addBio(u, `Became Lord of ${village.name}`);
      if (u.love && u.love !== was.love && nameOf(u.love)) addBio(u, `${was.ruler || ruler ? 'Married' : 'Fell in love with'} ${nameOf(u.love)}`);
      for (const t of titles) if (!was.titles.includes(t)) addBio(u, `Earned the title ${TRAITS[t].name}`);
      for (const n of [1, 10, 25, 50, 100]) if ((u.kills || 0) >= n && (was.kills || 0) < n) addBio(u, n === 1 ? 'Won their first fight' : `Has won ${n} fights`);
    }
    u.bk = { village: u.village, ruler, lord, love: u.love || 0, kills: u.kills || 0, titles };
  }
}

const _citiesTickUi3 = citiesTick;
citiesTick = function () { _citiesTickUi3(); if (state.tick % 20 === 0) storyTick(); };

// ---------- Creature card ----------
// The top of a creature's info: its icon, name and a badge; a framed portrait
// standing on the ground it's on; and pill bars for what it's doing, health,
// mana, stamina and how full it is.
const hexColor = c => '#' + c.toString(16).padStart(6, '0');
function cardBar(value, max, color, label) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return `<div class="card-bar"><i style="width:${pct}%;background:${color}"></i><b>${label}</b></div>`;
}
function unitCard(u, k, job) {
  const r = RACES[u.race];
  const hp = Math.max(0, Math.ceil(u.hp)), max = maxHp(u), hpPct = hp / max;
  const tile = state.tiles[Math.floor(u.y) * state.W + Math.floor(u.x)];
  const ruler = k && k.king === u.id;
  const badge = ruler ? '👑' : k ? `<span class="card-swatch" style="background:${k.color}"></span>` : r.prey ? '🐾' : '🌿';
  const caster = typeof isCaster === 'function' && isCaster(u);
  const hunter = !!r.prey && !r.monster && !r.undead;
  const full = hunter ? Math.max(0, 1 - (u.hunger || 0) / (4 * YEAR)) : 1;
  return `<div class="card">
    <div class="card-top"><img class="card-icon" src="${raceIcon(u.race)}" alt=""><div class="card-name">${u.name}${pen('unit', u.id)}</div><span class="card-badge" title="${ruler ? 'Ruler of the ' + k.name : k ? k.name : r.name}">${badge}</span></div>
    <div class="card-mid">
      <div class="card-portrait" style="--ground:${hexColor(TILES[tile]?.color ?? 0x5fa83a)}"><img src="${portraitOf(u, k)}" alt=""></div>
      <div class="card-stats">
        <div class="card-pill"><span class="card-ico">👣</span><span class="card-doing">${job}</span><span class="card-ico">👣</span></div>
        <div class="card-pill"><span class="card-ico">❤️</span>${cardBar(hp, max, hpPct > 0.5 ? '#2f9a2a' : hpPct > 0.25 ? '#d89a1a' : '#c62828', `${hp}/${max}`)}</div>
        <div class="card-pill"><span class="card-ico">🔮</span>${caster ? cardBar(u.mana ?? 50, 100, '#3a6ad8', `${Math.round(u.mana ?? 50)}/100`) : cardBar(0, 1, '#3a6ad8', '-')}</div>
        <div class="card-row">
          <div class="card-pill"><span class="card-ico">🧪</span>${cardBar(u.stamina ?? 100, 100, '#2f9a2a', `${Math.round(u.stamina ?? 100)}/100`)}</div>
          <div class="card-pill"><span class="card-ico">🍖</span>${cardBar(full, 1, '#a8a8a8', Math.round(full * 100) + '%')}</div>
        </div>
      </div>
    </div></div>`;
}

// ---------- Tabs on the creature editor ----------
// Statuses, Traits (DNA and trait chips), Inventory (equipment) and Story
// (life story); the Follow / Favorite / Control buttons stay on top.
const INFO_TABS = [['statuses', '✨', 'Statuses'], ['traits', '🧬', 'Traits'], ['inventory', '🎒', 'Inventory'], ['story', '📖', 'Story']];
let infoTab = 'traits';
const STATUS_NAMES = {
  blessed: ['😇', 'Blessed'], cursed: ['🕸', 'Cursed'], shield: ['🛡️', 'Shielded'], sick: ['🤒', 'Plague'], immune: ['💉', 'Immune'],
  mad: ['😡', 'Mad'], frozen: ['❄️', 'Frozen'], sleep: ['💤', 'Asleep'], poison: ['☠️', 'Poisoned'], burning: ['🔥', 'Burning'],
  stun: ['💫', 'Stunned'], love: ['❤️', 'In love'], pregnant: ['🤰', 'Expecting'], egg: ['🥚', 'An egg'], festive: ['🎉', 'Festive'],
  coffee: ['☕', 'Caffeinated'], powerup: ['⚡', 'Powered up'], angry: ['💢', 'Angry'], crying: ['😢', 'Crying'], tantrum: ['🤬', 'Tantrum'],
  inspired: ['💡', 'Inspired'], desire: ['💭', 'Longing'], boat: ['⛵', 'Sailing'],
};
function statusesHtml(u) {
  const list = Object.entries(STATUS_NAMES).filter(([k]) => u[k] && u[k] !== 0).map(([, [i, n]]) => `<span class="status-chip">${i} ${n}</span>`);
  const mood = typeof moodLabel === 'function' ? moodLabel(u.happy ?? 60) : '';
  return `<p class="hint">${mood ? 'Mood: ' + mood : ''}</p>` + (list.length ? `<div class="status-list">${list.join('')}</div>` : '<p class="hint">Nothing special going on.</p>');
}
function storyHtml(u) {
  return u.bio && u.bio.length ? `<ul class="bio">${u.bio.map(([t, text]) => `<li><span class="yr">Year ${Math.floor(t / YEAR) + 1}</span> ${text}</li>`).join('')}</ul>`
    : '<p class="hint">Their story is still being written.</p>';
}

const _refreshEditorUi3 = refreshEditor;
refreshEditor = function (force) {
  const before = infoEdit.firstChild;
  _refreshEditorUi3(force);
  const u = life.selected && life.selected.unit;
  if (!u || u.dead || infoEdit.firstChild === before || infoEdit.querySelector('.info-tabs')) return;
  // sort what the editor built into sections by its headings
  const nodes = [...infoEdit.childNodes];
  const sections = { top: [], inventory: [], traits: [] };
  let cur = 'top';
  for (const n of nodes) {
    if (n.tagName === 'H4') cur = n.textContent === 'Equipment' ? 'inventory' : 'traits';
    sections[cur].push(n);
  }
  infoEdit.textContent = '';
  infoEdit.append(...sections.top);
  const tabs = document.createElement('div');
  tabs.className = 'info-tabs';
  tabs.innerHTML = INFO_TABS.map(([k, i, n]) => `<button type="button" data-tab-info="${k}" class="${k === infoTab ? 'on' : ''}"><span>${i}</span>${n}</button>`).join('');
  infoEdit.append(tabs);
  for (const [key] of INFO_TABS) {
    const box = document.createElement('div');
    box.className = 'info-section';
    box.dataset.section = key;
    box.hidden = key !== infoTab;
    if (sections[key]) box.append(...sections[key]);
    infoEdit.append(box);
  }
  fillLiveTabs(u);
};
function fillLiveTabs(u) {
  const st = infoEdit.querySelector('[data-section="statuses"]'), sy = infoEdit.querySelector('[data-section="story"]');
  if (st && !st.hidden) st.innerHTML = statusesHtml(u);
  if (sy && !sy.hidden) sy.innerHTML = storyHtml(u);
}
infoEdit.addEventListener('click', e => {
  const b = e.target.closest('[data-tab-info]');
  if (!b) return;
  infoTab = b.dataset.tabInfo;
  for (const x of infoEdit.querySelectorAll('[data-tab-info]')) x.classList.toggle('on', x === b);
  for (const box of infoEdit.querySelectorAll('.info-section')) box.hidden = box.dataset.section !== infoTab;
  const u = life.selected && life.selected.unit;
  if (u) fillLiveTabs(u);
});

// ---------- Placement each frame ----------
const _updateHudUi3 = updateHud;
updateHud = function () {
  _updateHudUi3();
  drawMinimap();
  const docked = infoEl.classList.contains('dock');
  miniWrap.style.bottom = (docked ? infoEl : toolbarEl).offsetHeight + 8 + 'px';
  if (!timelineEl.hidden && state.tick % 10 === 0) renderTimeline();
  const sel = life.selected && life.selected.unit;
  if (sel && !sel.dead && (infoTab === 'statuses' || infoTab === 'story') && hudFrame % 12 === 0) fillLiveTabs(sel);
};
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!savesEl.hidden) savesEl.hidden = true;
  if (!timelineEl.hidden) timelineEl.hidden = true;
});
