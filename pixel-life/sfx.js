'use strict';

// Sound effects, made live with Web Audio (no sound files): explosions,
// thunder, swords clashing, bowstrings, bites and cannons. They follow the 🎵
// button (music.on from music.js) and only play for things on screen, a little
// louder the closer you're zoomed in.

let sfxCtx = null, sfxOut = null, noiseBuf = null;
const sfxLast = {};
const SFX_GAP = { boom: 90, bigboom: 400, thunder: 180, clash: 110, twang: 110, bite: 140, cannon: 120 };

function sfxReady() {
  if (typeof music !== 'undefined' && !music.on) return false;
  if (!sfxCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    sfxCtx = new AC();
    sfxOut = sfxCtx.createGain();
    sfxOut.gain.value = 0.5;
    sfxOut.connect(sfxCtx.destination);
    noiseBuf = sfxCtx.createBuffer(1, sfxCtx.sampleRate, sfxCtx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  return sfxCtx.state !== 'closed';
}

// how loud something at (x, y) should be: 0 off screen, more when zoomed in
function sfxLevel(x, y) {
  if (x === undefined) return 1;
  const { cam } = state;
  const sx = view.width / 2 + (x - cam.x) * cam.zoom, sy = view.height / 2 + (y - cam.y) * cam.zoom;
  if (sx < -60 || sy < -60 || sx > view.width + 60 || sy > view.height + 60) return 0;
  return Math.min(1, 0.25 + cam.zoom / (24 * dpr));
}

function noise(t, len, vol, type, freq, q = 1) {
  const src = sfxCtx.createBufferSource();
  src.buffer = noiseBuf;
  const f = sfxCtx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = sfxCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f); f.connect(g); g.connect(sfxOut);
  src.start(t, Math.random() * 0.5);
  src.stop(t + len + 0.05);
}

function tone(t, type, f0, f1, len, vol) {
  const o = sfxCtx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len);
  const g = sfxCtx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(sfxOut);
  o.start(t);
  o.stop(t + len + 0.05);
}

const SOUNDS = {
  boom: (t, v) => { noise(t, 0.6, 0.9 * v, 'lowpass', 500); tone(t, 'sine', 120, 40, 0.5, 0.7 * v); },
  bigboom: (t, v) => { noise(t, 2.2, 1 * v, 'lowpass', 300); tone(t, 'sine', 80, 25, 1.8, 0.9 * v); },
  thunder: (t, v) => { noise(t, 0.15, 0.8 * v, 'highpass', 2500); noise(t + 0.05, 1.4, 0.7 * v, 'lowpass', 220); },
  clash: (t, v) => { tone(t, 'square', 1500 + Math.random() * 600, 900, 0.12, 0.12 * v); tone(t, 'triangle', 2400, 1800, 0.18, 0.1 * v); noise(t, 0.05, 0.25 * v, 'highpass', 4000); },
  twang: (t, v) => { tone(t, 'triangle', 420, 160, 0.18, 0.18 * v); noise(t, 0.08, 0.12 * v, 'bandpass', 1800, 3); },
  bite: (t, v) => { noise(t, 0.08, 0.35 * v, 'bandpass', 700, 2); tone(t, 'sine', 180, 90, 0.08, 0.2 * v); },
  cannon: (t, v) => { noise(t, 0.5, 0.8 * v, 'lowpass', 700); tone(t, 'sine', 150, 45, 0.35, 0.6 * v); },
};

function sfx(kind, x, y) {
  const now = performance.now();
  if (now - (sfxLast[kind] || 0) < (SFX_GAP[kind] || 100)) return;
  const v = sfxLevel(x, y);
  if (v <= 0 || !sfxReady()) return;
  sfxLast[kind] = now;
  SOUNDS[kind](sfxCtx.currentTime + 0.01, v);
}

// ---------- Hooks ----------
// explosions, lightning and nukes all show up as effects
const _addEffectSfx = addEffect;
addEffect = function (kind, x, y, dur, extra) {
  const e = _addEffectSfx(kind, x, y, dur, extra);
  if (kind === 'explosion') sfx(dur > 1.2 ? 'bigboom' : 'boom', x, y);
  else if (kind === 'mushroom') sfx('bigboom', x, y);
  else if (kind === 'bolt') sfx('thunder', x, y);
  return e;
};

// a swing in a fight: steel on steel, a bowstring, or teeth
const _fightSfx = fight;
fight = function (u, t) {
  const before = u.cd;
  const r = _fightSfx(u, t);
  if (before === 0 && u.cd > 0 && state.speed > 0 && state.speed <= 5) {
    const weapon = weaponOf(u);
    sfx(weapon.reach > 2 ? 'twang' : RACES[u.race].civ ? 'clash' : 'bite', u.x, u.y);
  }
  return r;
};
