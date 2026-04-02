/**
 * SoundManager — Procedural audio system for the RTS game.
 *
 * All sounds are synthesized at boot time using the Web Audio API
 * (OscillatorNode, GainNode, BiquadFilterNode, AudioBuffer) and then
 * registered with Phaser's sound manager so they can be played with
 * the standard Phaser API.  No audio files are needed.
 */

import Phaser from 'phaser';

// ─── helpers ───────────────────────────────────────────────────────────

/** Return a raw AudioContext, or null when Web Audio is unavailable. */
function getAudioContext(scene: Phaser.Scene): AudioContext | null {
  try {
    const sm = scene.sound as Phaser.Sound.WebAudioSoundManager;
    if (sm && sm.context) return sm.context;
  } catch {
    /* fall through */
  }
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

/** Create an empty AudioBuffer at the given sample rate. */
function createBuffer(
  ctx: AudioContext,
  duration: number,
  sampleRate?: number,
): AudioBuffer {
  const sr = sampleRate ?? ctx.sampleRate;
  const len = Math.ceil(sr * duration);
  return ctx.createBuffer(1, len, sr);
}

/** Fill a Float32Array with white noise in [‑1, 1]. */
function whiteNoise(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.random() * 2 - 1;
  }
}

/** Apply an ADSR‑style amplitude envelope (linear segments). */
function applyEnvelope(
  buf: Float32Array,
  sampleRate: number,
  /** Array of [time‑in‑seconds, amplitude] breakpoints, starting at t=0 */
  points: [number, number][],
): void {
  let pi = 0;
  for (let i = 0; i < buf.length; i++) {
    const t = i / sampleRate;
    while (pi < points.length - 1 && t >= points[pi + 1][0]) pi++;
    if (pi >= points.length - 1) {
      buf[i] *= points[points.length - 1][1];
    } else {
      const [t0, a0] = points[pi];
      const [t1, a1] = points[pi + 1];
      const frac = (t - t0) / (t1 - t0);
      buf[i] *= a0 + (a1 - a0) * frac;
    }
  }
}

/** Generate a sine‑wave tone with optional frequency sweep. */
function sineWave(
  buf: Float32Array,
  sampleRate: number,
  startFreq: number,
  endFreq?: number,
  startSample = 0,
  length?: number,
  amplitude = 1,
): void {
  const end = endFreq ?? startFreq;
  const len = length ?? buf.length - startSample;
  let phase = 0;
  for (let i = 0; i < len && startSample + i < buf.length; i++) {
    const frac = i / len;
    const freq = startFreq + (end - startFreq) * frac;
    phase += (2 * Math.PI * freq) / sampleRate;
    buf[startSample + i] += Math.sin(phase) * amplitude;
  }
}

/** Mix src into dest (additive). */
function mixInto(dest: Float32Array, src: Float32Array, gain = 1): void {
  const len = Math.min(dest.length, src.length);
  for (let i = 0; i < len; i++) {
    dest[i] += src[i] * gain;
  }
}

/** Clamp buffer to [‑1, 1]. */
function clamp(buf: Float32Array): void {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.max(-1, Math.min(1, buf[i]));
  }
}

/** Simple one‑pole low‑pass filter in place. cutoff in 0..1 range. */
function lowPass(buf: Float32Array, cutoff: number): void {
  const a = Math.max(0, Math.min(1, cutoff));
  let prev = 0;
  for (let i = 0; i < buf.length; i++) {
    prev = prev + a * (buf[i] - prev);
    buf[i] = prev;
  }
}

/** Simple one‑pole high‑pass filter in place. */
function highPass(buf: Float32Array, cutoff: number): void {
  const a = Math.max(0, Math.min(1, 1 - cutoff));
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < buf.length; i++) {
    const inp = buf[i];
    prevOut = a * (prevOut + inp - prevIn);
    prevIn = inp;
    buf[i] = prevOut;
  }
}

/** Bandpass via low + high pass. */
function bandPass(buf: Float32Array, low: number, high: number): void {
  lowPass(buf, high);
  highPass(buf, low);
}

// ─── sound generators ──────────────────────────────────────────────────

function genClick(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.05);
  const d = buf.getChannelData(0);
  sineWave(d, sr, 800, 600);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.002, 1],
    [0.015, 0.6],
    [0.05, 0],
  ]);
  return buf;
}

function genSelect(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.12);
  const d = buf.getChannelData(0);
  // First blip
  sineWave(d, sr, 600, 600, 0, Math.floor(sr * 0.04), 0.8);
  // Second blip
  sineWave(d, sr, 800, 800, Math.floor(sr * 0.06), Math.floor(sr * 0.04), 0.8);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.002, 1],
    [0.035, 0.3],
    [0.04, 0],
    [0.06, 0],
    [0.062, 1],
    [0.095, 0.3],
    [0.12, 0],
  ]);
  return buf;
}

function genMove(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.15);
  const d = buf.getChannelData(0);
  whiteNoise(d);
  bandPass(d, 0.05, 0.15);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.01, 0.6],
    [0.05, 0.8],
    [0.15, 0],
  ]);
  // Add a subtle pitch sweep underneath
  const tone = new Float32Array(d.length);
  sineWave(tone, sr, 300, 150, 0, d.length, 0.15);
  mixInto(d, tone);
  clamp(d);
  return buf;
}

function genAttackMelee(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.2);
  const d = buf.getChannelData(0);

  // Noise burst (impact)
  const noise = new Float32Array(d.length);
  whiteNoise(noise);
  bandPass(noise, 0.02, 0.3);
  applyEnvelope(noise, sr, [
    [0, 0],
    [0.002, 1],
    [0.03, 0.4],
    [0.08, 0.1],
    [0.2, 0],
  ]);
  mixInto(d, noise, 0.7);

  // Low thud
  sineWave(d, sr, 120, 60, 0, Math.floor(sr * 0.15), 0.6);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.001, 1],
    [0.04, 0.6],
    [0.2, 0],
  ]);

  // Metallic ring
  const ring = new Float32Array(d.length);
  sineWave(ring, sr, 2800, 2400, 0, Math.floor(sr * 0.1), 0.15);
  applyEnvelope(ring, sr, [
    [0, 0],
    [0.001, 1],
    [0.05, 0.2],
    [0.1, 0],
    [0.2, 0],
  ]);
  mixInto(d, ring);
  clamp(d);
  return buf;
}

function genAttackRanged(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.15);
  const d = buf.getChannelData(0);

  // High swoosh — filtered noise with descending pitch feel
  whiteNoise(d);
  highPass(d, 0.85);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.005, 0.9],
    [0.04, 0.5],
    [0.15, 0],
  ]);

  // Subtle tone sweep high → low
  const tone = new Float32Array(d.length);
  sineWave(tone, sr, 3000, 800, 0, d.length, 0.2);
  applyEnvelope(tone, sr, [
    [0, 0],
    [0.003, 0.8],
    [0.05, 0.3],
    [0.15, 0],
  ]);
  mixInto(d, tone);
  clamp(d);
  return buf;
}

function genBuild(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.2);
  const d = buf.getChannelData(0);

  // Hammer tap — short noise burst
  const tap = new Float32Array(d.length);
  whiteNoise(tap);
  bandPass(tap, 0.05, 0.4);
  applyEnvelope(tap, sr, [
    [0, 0],
    [0.001, 1],
    [0.015, 0.3],
    [0.04, 0],
    [0.2, 0],
  ]);
  mixInto(d, tap, 0.5);

  // Metallic ping — high sine with fast decay
  sineWave(d, sr, 1800, 1600, 0, Math.floor(sr * 0.15), 0.5);
  // Secondary harmonic
  sineWave(d, sr, 3600, 3200, 0, Math.floor(sr * 0.1), 0.2);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.001, 1],
    [0.03, 0.4],
    [0.1, 0.1],
    [0.2, 0],
  ]);
  clamp(d);
  return buf;
}

function genGather(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.15);
  const d = buf.getChannelData(0);

  // Chop — short noise
  const chop = new Float32Array(d.length);
  whiteNoise(chop);
  lowPass(chop, 0.25);
  applyEnvelope(chop, sr, [
    [0, 0],
    [0.001, 1],
    [0.02, 0.5],
    [0.06, 0.1],
    [0.15, 0],
  ]);
  mixInto(d, chop, 0.6);

  // Thunky tone
  sineWave(d, sr, 250, 150, 0, Math.floor(sr * 0.08), 0.5);
  applyEnvelope(d, sr, [
    [0, 0],
    [0.001, 1],
    [0.03, 0.5],
    [0.15, 0],
  ]);
  clamp(d);
  return buf;
}

function genTrain(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.3);
  const d = buf.getChannelData(0);

  // Ascending fanfare: three quick ascending tones
  const notes = [440, 554, 659]; // A4, C#5, E5
  const noteLen = Math.floor(sr * 0.08);
  for (let n = 0; n < notes.length; n++) {
    const start = Math.floor(sr * 0.02) + n * noteLen;
    sineWave(d, sr, notes[n], notes[n], start, noteLen, 0.5);
    // Add slight overtone
    sineWave(d, sr, notes[n] * 2, notes[n] * 2, start, noteLen, 0.15);
  }
  applyEnvelope(d, sr, [
    [0, 0],
    [0.02, 0.8],
    [0.1, 1],
    [0.2, 0.8],
    [0.3, 0],
  ]);
  clamp(d);
  return buf;
}

function genAgeUp(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.8);
  const d = buf.getChannelData(0);

  // Triumphant ascending chord — C major triad ascending to G major
  // Phase 1: C major (C4 E4 G4)
  const p1Len = Math.floor(sr * 0.4);
  sineWave(d, sr, 261.6, 261.6, 0, p1Len, 0.3); // C4
  sineWave(d, sr, 329.6, 329.6, 0, p1Len, 0.25); // E4
  sineWave(d, sr, 392.0, 392.0, 0, p1Len, 0.25); // G4
  // Octave shimmer
  sineWave(d, sr, 523.2, 523.2, 0, p1Len, 0.1); // C5

  // Phase 2: G major rising (G4 B4 D5)
  const p2Start = Math.floor(sr * 0.3);
  const p2Len = Math.floor(sr * 0.5);
  sineWave(d, sr, 392.0, 392.0, p2Start, p2Len, 0.3); // G4
  sineWave(d, sr, 493.9, 493.9, p2Start, p2Len, 0.25); // B4
  sineWave(d, sr, 587.3, 587.3, p2Start, p2Len, 0.25); // D5
  sineWave(d, sr, 784.0, 784.0, p2Start, p2Len, 0.1); // G5

  applyEnvelope(d, sr, [
    [0, 0],
    [0.02, 0.7],
    [0.15, 1],
    [0.4, 0.9],
    [0.6, 0.7],
    [0.8, 0],
  ]);
  clamp(d);
  return buf;
}

function genDeath(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.3);
  const d = buf.getChannelData(0);

  // Low descending thud
  sineWave(d, sr, 200, 60, 0, d.length, 0.7);
  // Sub bass hit
  sineWave(d, sr, 80, 40, 0, Math.floor(sr * 0.15), 0.4);

  // Noise layer
  const noise = new Float32Array(d.length);
  whiteNoise(noise);
  lowPass(noise, 0.08);
  applyEnvelope(noise, sr, [
    [0, 0],
    [0.002, 0.6],
    [0.05, 0.2],
    [0.3, 0],
  ]);
  mixInto(d, noise);

  applyEnvelope(d, sr, [
    [0, 0],
    [0.003, 1],
    [0.06, 0.7],
    [0.3, 0],
  ]);
  clamp(d);
  return buf;
}

function genBuildingDestroy(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.5);
  const d = buf.getChannelData(0);

  // Rumble — low filtered noise
  const rumble = new Float32Array(d.length);
  whiteNoise(rumble);
  lowPass(rumble, 0.04);
  applyEnvelope(rumble, sr, [
    [0, 0],
    [0.01, 0.8],
    [0.1, 1],
    [0.3, 0.6],
    [0.5, 0],
  ]);
  mixInto(d, rumble, 0.7);

  // Crash — broadband noise burst
  const crash = new Float32Array(d.length);
  whiteNoise(crash);
  bandPass(crash, 0.01, 0.3);
  applyEnvelope(crash, sr, [
    [0, 0],
    [0.005, 1],
    [0.05, 0.5],
    [0.15, 0.2],
    [0.5, 0],
  ]);
  mixInto(d, crash, 0.5);

  // Deep thud
  sineWave(d, sr, 60, 30, 0, Math.floor(sr * 0.3), 0.5);

  applyEnvelope(d, sr, [
    [0, 0],
    [0.005, 1],
    [0.15, 0.8],
    [0.35, 0.3],
    [0.5, 0],
  ]);
  clamp(d);
  return buf;
}

function genError(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = createBuffer(ctx, 0.2);
  const d = buf.getChannelData(0);

  // Buzzer — two dissonant square-ish waves
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    // ~150 Hz square via harmonics
    const sq1 =
      Math.sin(2 * Math.PI * 150 * t) +
      0.33 * Math.sin(2 * Math.PI * 450 * t) +
      0.2 * Math.sin(2 * Math.PI * 750 * t);
    // ~180 Hz square — dissonant
    const sq2 =
      Math.sin(2 * Math.PI * 180 * t) +
      0.33 * Math.sin(2 * Math.PI * 540 * t) +
      0.2 * Math.sin(2 * Math.PI * 900 * t);
    d[i] = (sq1 + sq2) * 0.25;
  }
  applyEnvelope(d, sr, [
    [0, 0],
    [0.005, 1],
    [0.08, 1],
    [0.085, 0],
    [0.1, 0],
    [0.105, 1],
    [0.18, 1],
    [0.2, 0],
  ]);
  clamp(d);
  return buf;
}

// ─── ambient generators (longer, loopable) ─────────────────────────────

function genAmbientDay(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const duration = 4; // 4-second loop
  const buf = createBuffer(ctx, duration);
  const d = buf.getChannelData(0);

  // Soft filtered noise — "wind through trees"
  whiteNoise(d);
  lowPass(d, 0.02);

  // Add gentle amplitude modulation for a "breeze" feel
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    const mod =
      0.5 +
      0.2 * Math.sin(2 * Math.PI * 0.3 * t) +
      0.15 * Math.sin(2 * Math.PI * 0.7 * t) +
      0.1 * Math.sin(2 * Math.PI * 1.3 * t);
    d[i] *= mod;
  }

  // Subtle bird-like chirps — occasional high sine blips
  for (let c = 0; c < 6; c++) {
    const offset = Math.floor((c / 6 + 0.08 * Math.sin(c * 2.3)) * d.length);
    const chirpLen = Math.floor(sr * 0.03);
    for (let i = 0; i < chirpLen && offset + i < d.length; i++) {
      const env = Math.sin((Math.PI * i) / chirpLen);
      d[offset + i] +=
        Math.sin((2 * Math.PI * (3000 + c * 400) * i) / sr) * env * 0.04;
    }
  }

  // Keep very quiet
  for (let i = 0; i < d.length; i++) d[i] *= 0.3;
  clamp(d);
  return buf;
}

function genAmbientNight(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const duration = 4; // 4-second loop
  const buf = createBuffer(ctx, duration);
  const d = buf.getChannelData(0);

  // "Crickets" — rapid oscillating high tones at different phases
  for (let c = 0; c < 5; c++) {
    const freq = 4200 + c * 300;
    const chirpRate = 12 + c * 3; // chirps per second
    const phaseOffset = c * 0.7;
    for (let i = 0; i < d.length; i++) {
      const t = i / sr;
      // On/off gating via sine
      const gate = Math.max(0, Math.sin(2 * Math.PI * chirpRate * (t + phaseOffset)));
      d[i] += Math.sin(2 * Math.PI * freq * t) * gate * 0.02;
    }
  }

  // Soft low drone
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    d[i] += Math.sin(2 * Math.PI * 80 * t) * 0.015;
  }

  // Gentle amplitude modulation
  for (let i = 0; i < d.length; i++) {
    const t = i / sr;
    d[i] *=
      0.6 +
      0.2 * Math.sin(2 * Math.PI * 0.25 * t) +
      0.1 * Math.sin(2 * Math.PI * 0.6 * t);
  }

  for (let i = 0; i < d.length; i++) d[i] *= 0.25;
  clamp(d);
  return buf;
}

// ─── buffer → Phaser registration ──────────────────────────────────────

/**
 * Convert an AudioBuffer to a base64 WAV data URI, then decode it via
 * Phaser's audio cache so it can be played with scene.sound.play(key).
 */
function registerBuffer(
  scene: Phaser.Scene,
  ctx: AudioContext,
  key: string,
  audioBuf: AudioBuffer,
): void {
  // Build a minimal WAV in memory
  const numChannels = audioBuf.numberOfChannels;
  const sampleRate = audioBuf.sampleRate;
  const samples = audioBuf.getChannelData(0);
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const wav = new ArrayBuffer(bufferSize);
  const view = new DataView(wav);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  // Decode via Phaser's audio system
  try {
    ctx.decodeAudioData(
      wav.slice(0), // clone because decodeAudioData detaches
      (decoded) => {
        scene.cache.audio.add(key, decoded);
      },
      () => {
        // Fallback: add the un-decoded buffer directly
        scene.cache.audio.add(key, audioBuf);
      },
    );
  } catch {
    scene.cache.audio.add(key, audioBuf);
  }
}

// ─── SoundManager class ────────────────────────────────────────────────

export class SoundManager {
  private scene: Phaser.Scene;
  private masterVolume = 1;
  private muted = false;
  private currentAmbientKey: string | null = null;
  private currentAmbient: Phaser.Sound.BaseSound | null = null;
  private ambientKeys: Set<string> = new Set(['ambient_day', 'ambient_night']);

  /** Maximum audible distance for spatial audio (in world pixels). */
  private static MAX_DISTANCE = 800;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ── static bootstrap ──────────────────────────────────────────────

  /**
   * Call from your boot/preload scene to synthesize every sound effect
   * and register it with Phaser's audio cache.
   *
   * Usage:
   *   SoundManager.generateSounds(this);   // inside BootScene.preload()
   */
  static generateSounds(scene: Phaser.Scene): void {
    const ctx = getAudioContext(scene);
    if (!ctx) {
      console.warn('[SoundManager] Web Audio not available — skipping sound generation.');
      return;
    }

    const sounds: Record<string, (c: AudioContext) => AudioBuffer> = {
      sfx_click: genClick,
      sfx_select: genSelect,
      sfx_move: genMove,
      sfx_attack_melee: genAttackMelee,
      sfx_attack_ranged: genAttackRanged,
      sfx_build: genBuild,
      sfx_gather: genGather,
      sfx_train: genTrain,
      sfx_age_up: genAgeUp,
      sfx_death: genDeath,
      sfx_building_destroy: genBuildingDestroy,
      sfx_error: genError,
      ambient_day: genAmbientDay,
      ambient_night: genAmbientNight,
    };

    for (const [key, generator] of Object.entries(sounds)) {
      try {
        const audioBuffer = generator(ctx);
        registerBuffer(scene, ctx, key, audioBuffer);
      } catch (e) {
        console.warn(`[SoundManager] Failed to generate "${key}":`, e);
      }
    }
  }

  // ── playback ──────────────────────────────────────────────────────

  /** Play a one-shot sound effect. */
  play(key: string, volume = 1): void {
    if (this.muted) return;
    try {
      if (!this.scene.cache.audio.exists(key)) return;
      this.scene.sound.play(key, {
        volume: volume * this.masterVolume,
      });
    } catch {
      /* graceful degradation */
    }
  }

  /**
   * Play a sound with spatial attenuation.
   * Volume falls off linearly with distance between the sound source
   * (x, y) and the listener position.
   */
  playAt(
    key: string,
    x: number,
    y: number,
    listenerX: number,
    listenerY: number,
    baseVolume = 1,
  ): void {
    const dx = x - listenerX;
    const dy = y - listenerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vol = Math.max(0, 1 - dist / SoundManager.MAX_DISTANCE);
    if (vol <= 0) return;
    this.play(key, baseVolume * vol);
  }

  /**
   * Crossfade to the given ambient track.  Pass `null` to stop ambient.
   */
  setAmbient(key: string | null): void {
    if (key === this.currentAmbientKey) return;

    // Fade out current
    if (this.currentAmbient) {
      try {
        this.currentAmbient.stop();
      } catch {
        /* ok */
      }
      this.currentAmbient.destroy();
      this.currentAmbient = null;
    }

    this.currentAmbientKey = key;

    if (!key) return;
    if (!this.scene.cache.audio.exists(key)) return;

    try {
      const ambientVolume = 0.3 * this.masterVolume * (this.muted ? 0 : 1);
      this.currentAmbient = this.scene.sound.add(key, {
        loop: true,
        volume: ambientVolume,
      });
      (this.currentAmbient as Phaser.Sound.WebAudioSound).play();
    } catch {
      /* graceful degradation */
    }
  }

  /** Set master volume (0 to 1). Affects all future sounds and current ambient. */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAmbientVolume();
  }

  /** Mute all audio. */
  mute(): void {
    this.muted = true;
    this.updateAmbientVolume();
  }

  /** Unmute audio. */
  unmute(): void {
    this.muted = false;
    this.updateAmbientVolume();
  }

  /** Toggle mute state. Returns the new muted value. */
  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }

  /** Returns true if currently muted. */
  isMuted(): boolean {
    return this.muted;
  }

  // ── private ───────────────────────────────────────────────────────

  private updateAmbientVolume(): void {
    if (!this.currentAmbient) return;
    try {
      const vol = this.muted ? 0 : 0.3 * this.masterVolume;
      (this.currentAmbient as any).setVolume?.(vol);
    } catch {
      /* ok */
    }
  }
}
