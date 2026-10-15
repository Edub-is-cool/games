// Background music, made live with Web Audio (no sound files).
// Pick a style with <script src="bgm.js" data-style="..."></script>; optional data-pos (tl, tr, bl, br)
// and data-default="off". A small 🎵 button toggles it; the choice is saved per style.
(function () {
  const me = document.currentScript;
  const STYLES = {
    // beat = seconds per step (8 steps a bar, one chord a bar); mode = scale steps from the key
    arcade:  { beat: 0.17, key: 60, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 3, 4], lead: 'square', arp: true, bass: 'x.x.x.x.', kick: 'x...x...', snare: '..x...x.', hat: 'xxxxxxxx', density: 0.6, pad: false },
    march:   { beat: 0.2, key: 50, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 2, 6], lead: 'sawtooth', bass: 'x..xx...', kick: 'x..x....', snare: '....x..x', hat: 'x.x.x.x.', density: 0.5, pad: true },
    cave:    { beat: 0.38, key: 45, mode: [0, 1, 3, 5, 7, 8, 10], prog: [0, 1, 0, 6], lead: 'sine', bass: 'x.......', kick: '', snare: '', hat: '', density: 0.25, pad: true },
    tavern:  { beat: 0.19, key: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 3, 4, 0], lead: 'triangle', arp: true, bass: 'x...x...', kick: 'x.......', snare: '....x...', hat: '', density: 0.55, pad: false },
    quest:   { beat: 0.24, key: 52, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 6, 4], lead: 'triangle', bass: 'x...x.x.', kick: 'x.......', snare: '....x...', hat: '..x...x.', density: 0.45, pad: true },
    bouncy:  { beat: 0.15, key: 53, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 4, 5, 3], lead: 'square', bass: 'x.xx.x.x', kick: 'x...x...', snare: '..x...x.', hat: 'x.x.x.x.', density: 0.6, pad: false },
    space:   { beat: 0.18, key: 57, mode: [0, 2, 3, 5, 7, 8, 10], prog: [0, 5, 3, 6], lead: 'sawtooth', arp: true, bass: 'x.......', kick: 'x.......', snare: '', hat: '..x...x.', density: 0.3, pad: true },
    lofi:    { beat: 0.27, key: 50, mode: [0, 2, 3, 5, 7, 9, 10], prog: [0, 3, 6, 2], lead: 'sine', bass: 'x....x..', kick: 'x....x..', snare: '....x...', hat: 'x.x.x.x.', density: 0.3, pad: true },
    calm:    { beat: 0.3, key: 60, mode: [0, 2, 4, 6, 7, 9, 11], prog: [0, 1, 5, 4], lead: 'triangle', bass: 'x.......', kick: '', snare: '', hat: '', density: 0.4, pad: true },
    hoppy:   { beat: 0.14, key: 55, mode: [0, 2, 4, 5, 7, 9, 11], prog: [0, 5, 1, 4], lead: 'square', arp: true, bass: 'x.x.x.x.', kick: 'x...x...', snare: '..x...x.', hat: 'xxxxxxxx', density: 0.55, pad: false },
  };
  const name = (me && me.dataset.style) || 'calm';
  const S = STYLES[name] || STYLES.calm;
  const KEY = 'bgm-' + name;
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const scaleNote = d => S.key + 12 * Math.floor(d / 7) + S.mode[((d % 7) + 7) % 7];

  let on = !(me && me.dataset.default === 'off');
  try { const v = localStorage.getItem(KEY); if (v) on = v === 'on'; } catch (e) {}

  let ctx = null, master, wet, noise, step = 0, next = 0, mel = 7;

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.13; master.connect(ctx.destination);
    const delay = ctx.createDelay(1); delay.delayTime.value = S.beat * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 1800;
    wet = ctx.createGain(); wet.gain.value = 0.3;
    wet.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    next = ctx.currentTime + 0.1;
    setInterval(schedule, 80);
  }

  function voice(type, freq, t, len, vol, attack, cutoff) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f); f.connect(g); g.connect(master); g.connect(wet);
    o.start(t); o.stop(t + len + 0.05);
  }

  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
  }

  function hiss(t, len, vol, freq) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + len + 0.02);
  }

  const hit = (pat, b) => pat && pat[b] === 'x';

  function playStep(t) {
    const b = step % 8, deg = S.prog[Math.floor(step / 8) % S.prog.length];
    const chord = [deg, deg + 2, deg + 4].map(scaleNote);
    if (b === 0 && S.pad) for (const n of chord) voice('triangle', NOTE(n), t, S.beat * 8.3, 0.045, S.beat * 2, 900);
    if (hit(S.bass, b)) voice('triangle', NOTE(chord[0] - 12), t, S.beat * 1.8, 0.28, 0.01, 500);
    if (hit(S.kick, b)) kick(t);
    if (hit(S.snare, b)) hiss(t, 0.15, 0.25, 1500);
    if (hit(S.hat, b)) hiss(t, 0.04, 0.08, 7000);
    if (S.arp) voice(S.lead, NOTE(chord[[0, 1, 2, 1][b % 4]] + 12), t, S.beat * 0.9, 0.035, 0.005, 2200);
    // melody: a random walk on the scale that lands on a chord tone at each new bar
    if (b === 0 || Math.random() < S.density) {
      if (b === 0) mel = deg + 7 + 2 * Math.floor(Math.random() * 3);
      else mel = Math.max(3, Math.min(16, mel + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      const len = S.beat * (Math.random() < 0.3 ? 3 : 1.6);
      voice(S.lead, NOTE(scaleNote(mel)), t, len, S.lead === 'sine' || S.lead === 'triangle' ? 0.12 : 0.05, 0.01, 2600);
    }
    step++;
  }

  function schedule() {
    if (!on || !ctx || ctx.state !== 'running') return;
    if (next < ctx.currentTime) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.25) { playStep(next); next += S.beat; }
  }

  const btn = document.createElement('button');
  const pos = (me && me.dataset.pos) || 'bl';
  btn.setAttribute('aria-label', 'Toggle music');
  btn.style.cssText = 'position:fixed;z-index:2147483647;width:38px;height:38px;border-radius:50%;' +
    'border:2px solid rgba(255,255,255,.55);background:rgba(20,20,30,.7);color:#fff;font-size:18px;' +
    'line-height:1;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    (pos[0] === 't' ? 'top:10px;' : 'bottom:10px;') + (pos[1] === 'l' ? 'left:10px;' : 'right:10px;');
  function draw() { btn.textContent = on ? '🎵' : '🔇'; btn.title = on ? 'Music on' : 'Music off'; btn.style.opacity = on ? '1' : '.6'; }
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', e => {
    e.stopPropagation();
    on = !on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (err) {}
    if (on) start(); else if (ctx) ctx.suspend();
    draw();
  });
  draw();
  const mount = () => document.body.appendChild(btn);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // browsers only allow sound after the player does something
  function firstTouch() {
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.removeEventListener(ev, firstTouch, true));
    if (on) start();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, firstTouch, true));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });
})();
