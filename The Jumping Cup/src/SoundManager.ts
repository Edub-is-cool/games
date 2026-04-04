let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function play(freq: number, type: OscillatorType, duration: number, volume = 0.15) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playCorrect() {
  play(523, 'sine', 0.15, 0.12);
  setTimeout(() => play(659, 'sine', 0.15, 0.12), 80);
  setTimeout(() => play(784, 'sine', 0.25, 0.12), 160);
}

export function playWrong() {
  play(220, 'square', 0.25, 0.08);
  setTimeout(() => play(180, 'square', 0.35, 0.08), 120);
}

export function playShuffle() {
  play(300 + Math.random() * 100, 'triangle', 0.1, 0.06);
}

export function playLift() {
  play(400, 'sine', 0.12, 0.05);
}

export function playSlam() {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
  }
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  gain.gain.value = 0.08;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
}

export function playSelect() {
  play(600, 'sine', 0.08, 0.08);
}
