'use strict';

// Seasons and day/night. Seasons follow the calendar (shown in the top bar):
// lean winters (frost, snow, poor harvests, few births), lively springs, rich
// autumn harvests. Days pass in real time (faster at higher speeds); at night
// the map darkens and windows light up. Both can be turned off in World Laws.

const SEASONS = [
  { name: 'Winter', icon: '❄️', tint: 'rgba(225,236,255,0.16)', breed: 0.3, harvest: 0.4 },
  { name: 'Spring', icon: '🌱', tint: 'rgba(140,230,120,0.04)', breed: 1.5, harvest: 1 },
  { name: 'Summer', icon: '☀️', tint: null, breed: 1, harvest: 1.2 },
  { name: 'Autumn', icon: '🍂', tint: 'rgba(214,122,40,0.08)', breed: 0.7, harvest: 1.35 },
];
const DAY_SECONDS = 40;   // one day and night at 1× speed

Object.assign(LAWS, {
  seasons:  { group: 'Nature', label: 'Seasons', desc: 'Lean winters, lively springs, rich autumn harvests', value: true },
  dayNight: { group: 'Nature', label: 'Day & night', desc: 'Nights darken the map and light the windows', value: true },
});
for (const k of ['seasons', 'dayNight']) if (laws[k] === undefined) laws[k] = LAWS[k].value;

function seasonOf(tick = state.tick) {
  const m = Math.floor(tick / TICKS_PER_MONTH) % 12;
  return m === 11 || m < 2 ? 0 : m < 5 ? 1 : m < 8 ? 2 : 3;
}
const season = () => SEASONS[seasonOf()];
// used by animal breeding and farm harvests (creatures.js)
const breedSeason = () => (laws.seasons ? season().breed : 1);
const harvestSeason = () => (laws.seasons ? season().harvest : 1);

// ---------- Day and night ----------
let dayPhase = 0.3, lastDayTime = 0;
// 0 = midnight, 0.5 = noon; darkness eases in at dusk and out at dawn
function darkness() {
  if (!laws.dayNight) return 0;
  const sun = Math.cos(dayPhase * Math.PI * 2);   // 1 at midnight, -1 at noon
  return Math.max(0, Math.min(1, (sun + 0.15) / 0.75)) * 0.55;
}

// ---------- Drawing ----------
const flakes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), d: Math.random() * 6 }));

const _drawAgeSeasons = drawAge;
drawAge = function () {
  _drawAgeSeasons();
  const now = performance.now(), dt = Math.min(0.25, (now - (lastDayTime || now)) / 1000);
  lastDayTime = now;
  if (state.speed > 0) dayPhase = (dayPhase + (dt * Math.min(state.speed, 5)) / DAY_SECONDS) % 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const s = season();
  if (laws.seasons && s.tint) { ctx.fillStyle = s.tint; ctx.fillRect(0, 0, view.width, view.height); }

  const dark = darkness();
  if (dark > 0) {
    ctx.fillStyle = `rgba(8,14,48,${dark})`;
    ctx.fillRect(0, 0, view.width, view.height);
    drawWindowLights(dark / 0.55);
  }

  // winter snow drifting across the screen
  if (laws.seasons && seasonOf() === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const t = now / 1000;
    for (const f of flakes) {
      const x = ((f.x + Math.sin(t * 0.6 + f.d) * 0.01 + t * 0.01 * f.s) % 1) * view.width;
      const y = ((f.y + t * 0.04 * f.s) % 1) * view.height;
      const r = f.s * 1.6 * dpr;
      ctx.fillRect(x, y, r, r);
    }
  }
};

// warm lights in the windows of houses and halls
function drawWindowLights(strength) {
  const { cam } = state, z = cam.zoom;
  const ox = Math.round(view.width / 2 - cam.x * z), oy = Math.round(view.height / 2 - cam.y * z);
  const vx0 = -ox / z - 4, vy0 = -oy / z - 4, vx1 = (view.width - ox) / z + 4, vy1 = (view.height - oy) / z + 4;
  ctx.globalCompositeOperation = 'lighter';
  for (const b of life.buildings.values()) {
    if (b.x + b.w < vx0 || b.x > vx1 || b.y + b.h < vy0 || b.y > vy1) continue;
    const cx = ox + (b.x + b.w / 2) * z, cy = oy + (b.y + b.h * 0.7) * z;
    const r = Math.max(2, z * (b.type === 'hall' ? 1.6 : 0.9));
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
    glow.addColorStop(0, `rgba(255,200,90,${0.55 * strength})`);
    glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// the season (and the time of day) in the top bar
const _updateHudSeasons = updateHud;
updateHud = function () {
  _updateHudSeasons();
  const s = season();
  const time = !laws.dayNight ? '' : darkness() > 0.3 ? ' 🌙' : dayPhase > 0.2 && dayPhase < 0.3 ? ' 🌅' : '';
  if (laws.seasons) dateEl.textContent += ` · ${s.icon} ${s.name}${time}`;
  else if (time) dateEl.textContent += time;
};
