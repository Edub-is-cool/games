// Background music, made live with Web Audio (no sound files).
// A calm tune in peacetime; it turns minor and gets a drum when any kingdom is at war.
// 🎵 in the top bar (or M) turns it on and off; the choice is saved.

const MUSIC_KEY = 'pixellife-music';
const BEAT = 0.42;                       // seconds per beat
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

// each chord: root (MIDI) + the notes the melody leans on
const PEACE_CHORDS = [
  { root: 48, notes: [60, 64, 67] },     // C
  { root: 45, notes: [57, 60, 64] },     // Am
  { root: 41, notes: [57, 60, 65] },     // F
  { root: 43, notes: [55, 59, 62] },     // G
];
const WAR_CHORDS = [
  { root: 45, notes: [57, 60, 64] },     // Am
  { root: 41, notes: [57, 60, 65] },     // F
  { root: 38, notes: [57, 62, 65] },     // Dm
  { root: 40, notes: [56, 59, 64] },     // E
];
const PEACE_SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79];   // C major pentatonic
const WAR_SCALE = [57, 59, 60, 62, 64, 65, 68, 69, 71, 72];  // A harmonic minor

const music = {
  on: true,
  ctx: null, master: null, wet: null,
  beat: 0, next: 0, mel: 4, timer: null,
};

try { music.on = localStorage.getItem(MUSIC_KEY) !== 'off'; } catch (e) {}

function anyWar() {
  if (typeof life === 'undefined' || !life.kingdoms) return false;
  for (const k of life.kingdoms.values()) if (k.wars && Object.keys(k.wars).length) return true;
  return false;
}

function startAudio() {
  if (music.ctx) { if (music.ctx.state === 'suspended') music.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ctx = music.ctx = new AC();
  music.master = ctx.createGain();
  music.master.gain.value = 0.16;
  music.master.connect(ctx.destination);
  // a soft echo for some space
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1800;
  music.wet = ctx.createGain(); music.wet.gain.value = 0.35;
  music.wet.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay);
  tone.connect(music.master);
  music.next = ctx.currentTime + 0.1;
  music.timer = setInterval(scheduleMusic, 100);
}

function voice(type, freq, t, len, vol, attack, cutoff) {
  const ctx = music.ctx;
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = type; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f); f.connect(g); g.connect(music.master); g.connect(music.wet);
  o.start(t); o.stop(t + len + 0.05);
}

function drum(t, vol) {
  const ctx = music.ctx;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g); g.connect(music.master);
  o.start(t); o.stop(t + 0.35);
}

function playBeat(t) {
  const war = anyWar();
  const chords = war ? WAR_CHORDS : PEACE_CHORDS, scale = war ? WAR_SCALE : PEACE_SCALE;
  const b = music.beat % 8, chord = chords[Math.floor(music.beat / 8) % chords.length];
  if (b === 0) {
    for (const n of chord.notes) voice('triangle', NOTE(n), t, BEAT * 8.2, 0.05, 1.2, 900);
  }
  if (b === 0 || b === 4) voice('sine', NOTE(chord.root), t, BEAT * 3.5, 0.22, 0.03, 400);
  if (war && (b === 0 || b === 3 || b === 4 || b === 6)) drum(t, b === 0 ? 0.5 : 0.3);
  // melody: a gentle random walk, landing on chord tones at the start of a bar
  if (b === 0 || Math.random() < (war ? 0.55 : 0.45)) {
    if (b === 0) {
      const target = chord.notes[Math.floor(Math.random() * 3)] + 12;
      let best = 0;
      scale.forEach((n, i) => { if (Math.abs(n - target) < Math.abs(scale[best] - target)) best = i; });
      music.mel = best;
    } else {
      music.mel += [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
      music.mel = Math.max(0, Math.min(scale.length - 1, music.mel));
    }
    const len = BEAT * (Math.random() < 0.25 ? 2.5 : 1.4);
    voice('triangle', NOTE(scale[music.mel] + 12), t, len, 0.12, 0.01, 2600);
    voice('sine', NOTE(scale[music.mel] + 24), t, len * 0.6, 0.03, 0.01, 4000);
  }
  music.beat++;
}

function scheduleMusic() {
  if (!music.on || !music.ctx) return;
  const now = music.ctx.currentTime;
  if (music.next < now) music.next = now + 0.05;   // the tab was asleep
  while (music.next < now + 0.3) { playBeat(music.next); music.next += BEAT; }
}

function setMusic(on) {
  music.on = on;
  try { localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch (e) {}
  if (on) startAudio();
  else if (music.ctx) music.ctx.suspend();
  drawMusicBtn();
}

function drawMusicBtn() {
  musicBtn.textContent = music.on ? '🎵' : '🔇';
  musicBtn.title = music.on ? 'Music on (M to mute)' : 'Music off (M to turn on)';
  musicBtn.classList.toggle('active', music.on);
}

const musicBtn = document.createElement('button');
musicBtn.id = 'musicBtn';
document.getElementById('topbar').appendChild(musicBtn);
musicBtn.addEventListener('click', () => setMusic(!music.on));
drawMusicBtn();

// browsers only allow sound after the player does something
function firstTouch() {
  window.removeEventListener('pointerdown', firstTouch, true);
  window.removeEventListener('keydown', firstTouch, true);
  if (music.on) startAudio();
}
window.addEventListener('pointerdown', firstTouch, true);
window.addEventListener('keydown', firstTouch, true);

window.addEventListener('keydown', e => {
  if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey &&
      !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) setMusic(!music.on);
});

const musicStyle = document.createElement('style');
musicStyle.textContent = `#musicBtn { color: #f5e6c8; background: #4a2e17; border: 2px solid #d4a63a; border-radius: 6px; padding: 2px 8px; cursor: pointer; font-size: 15px; }
#musicBtn:hover { background: #5c3a1e; }
#musicBtn:not(.active) { opacity: 0.7; }`;
document.head.appendChild(musicStyle);
