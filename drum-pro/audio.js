/* Drum Pro — synthesized drum voices.
 *
 * Every voice is built from oscillators + one shared white-noise buffer, so there
 * are no asset files to load and the first hit is instant.
 *
 * All voices take an absolute AudioContext time. Free-play passes ctx.currentTime
 * (fire now); the chart scheduler passes future times. Never pass a rAF timestamp.
 */
const DrumAudio = (() => {
  let ctx = null;
  let bus = null;          // everything lands here
  let noiseBuffer = null;
  let liveHat = null;      // gain node of the ringing open hat, so it can be choked

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });

    bus = ctx.createGain();
    bus.gain.value = 0.9;

    // Keeps a full kit hit from clipping without audibly pumping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 14;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;

    bus.connect(comp).connect(ctx.destination);
    noiseBuffer = makeNoise();
    return ctx;
  }

  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // Browsers hand back a suspended context until a real gesture touches it.
  function unlock() {
    init();
    if (ctx.state !== 'running') ctx.resume();
  }

  function time() { return ctx ? ctx.currentTime : 0; }
  function ready() { return !!ctx && ctx.state === 'running'; }

  function noise(t) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer;
    s.loop = true;
    // Slight rate + offset jitter so repeated hits aren't machine-identical.
    s.playbackRate.value = 0.85 + Math.random() * 0.3;
    s.start(t, Math.random() * 1.5);
    return s;
  }

  function filt(type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }

  // Percussive envelope: near-instant attack, exponential tail.
  function env(t, peak, decay, attack) {
    const g = ctx.createGain();
    const a = attack == null ? 0.002 : attack;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    return g;
  }

  function kick(t, v) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(165, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    const g = env(t, v, 0.42, 0.004);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + 0.45);

    // Beater click — what makes a kick audible on laptop speakers.
    const n = noise(t);
    const cg = env(t, v * 0.22, 0.028);
    n.connect(filt('highpass', 1400)).connect(cg).connect(bus);
    n.stop(t + 0.05);
  }

  function snare(t, v) {
    const n = noise(t);
    const g = env(t, v * 0.7, 0.17);
    n.connect(filt('highpass', 1100)).connect(filt('peaking', 4200, 1.2)).connect(g).connect(bus);
    n.stop(t + 0.2);

    // Two detuned bodies give the drum pitch under the wire buzz.
    [188, 246].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 0.09);
      const og = env(t, v * (i ? 0.18 : 0.26), 0.1);
      o.connect(og).connect(bus);
      o.start(t); o.stop(t + 0.12);
    });
  }

  function tom(t, v, f0, decay) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + decay * 0.7);
    const g = env(t, v * 0.85, decay, 0.003);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + decay + 0.05);

    const n = noise(t);           // stick attack
    const ng = env(t, v * 0.12, 0.02);
    n.connect(filt('highpass', 2000)).connect(ng).connect(bus);
    n.stop(t + 0.04);
  }

  function hat(t, v, open) {
    // A real hi-hat can only make one sound at a time: closing it kills the wash.
    if (liveHat) {
      try {
        liveHat.gain.cancelScheduledValues(t);
        liveHat.gain.setValueAtTime(liveHat.gain.value, t);
        liveHat.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      } catch (e) { /* node already finished */ }
      liveHat = null;
    }

    const decay = open ? 0.42 : 0.055;
    const n = noise(t);
    const g = env(t, v * (open ? 0.34 : 0.42), decay);
    n.connect(filt('highpass', 7500)).connect(filt('bandpass', 11000, 0.7)).connect(g).connect(bus);
    n.stop(t + decay + 0.05);

    if (open) liveHat = g;
  }

  // Cymbals: filtered noise for the wash + inharmonic partials for the metal.
  function cymbal(t, v, decay, hp, partials, level) {
    const n = noise(t);
    const g = env(t, v * level, decay, 0.006);
    n.connect(filt('highpass', hp)).connect(g).connect(bus);
    n.stop(t + decay + 0.1);

    partials.forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f * (0.99 + Math.random() * 0.02);
      const og = env(t, v * 0.035, decay * 0.8, 0.004);
      o.connect(filt('bandpass', f * 1.5, 2)).connect(og).connect(bus);
      o.start(t); o.stop(t + decay);
    });
  }

  function ride(t, v)  { cymbal(t, v, 1.1, 5200, [523, 837, 1245, 1780], 0.16); }
  function crash(t, v) { cymbal(t, v, 2.1, 3400, [412, 673, 1010, 1490], 0.3); }

  const VOICES = {
    kick:        (t, v) => kick(t, v),
    snare:       (t, v) => snare(t, v),
    hihatClosed: (t, v) => hat(t, v, false),
    hihatOpen:   (t, v) => hat(t, v, true),
    highTom:     (t, v) => tom(t, v, 265, 0.34),
    midTom:      (t, v) => tom(t, v, 196, 0.44),
    floorTom:    (t, v) => tom(t, v, 132, 0.62),
    ride:        (t, v) => ride(t, v),
    crash:       (t, v) => crash(t, v),
  };

  function play(pieceId, t, v) {
    if (!ctx) return;
    const voice = VOICES[pieceId];
    if (voice) voice(t == null ? ctx.currentTime : t, v == null ? 0.9 : v);
  }

  // Count-in / metronome blip. Accented on the downbeat.
  function click(t, accent) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = accent ? 1600 : 1050;
    const g = env(t, accent ? 0.14 : 0.07, 0.045);
    o.connect(filt('highpass', 700)).connect(g).connect(bus);
    o.start(t); o.stop(t + 0.06);
  }

  return { init, unlock, time, ready, play, click };
})();
