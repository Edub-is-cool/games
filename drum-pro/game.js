/* Drum Pro — game loop, input routing, falling-notes logic, scoring. */
(() => {
  'use strict';

  const LW = 1000, LH = 700;      // logical canvas, letterboxed into the viewport
  const HIT_Y = 340;              // where notes must be struck
  const LANE_MARGIN = 56;
  const NOTE_W = 84, NOTE_H = 20;

  // Judgement windows in seconds. Constant across every speed — speed changes how
  // much time you get to read the note, not how precisely you must hit it.
  const W_PERFECT = 0.05;
  const W_GOOD = 0.11;
  const W_LATE = 0.16;            // past this, the note is gone

  const SPEEDS = [
    { name: 'Slow',   px: 145 },
    { name: 'Normal', px: 470 },
    { name: 'Fast',   px: 680 },
    { name: 'Insane', px: 950 },
  ];

  const SAVE_KEY = 'drumpro-save-v1';

  const canvas = document.getElementById('game');
  const g = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  const el = {
    boot: document.getElementById('boot'),
    bootBtn: document.getElementById('bootBtn'),
    menu: document.getElementById('menu'),
    keymap: document.getElementById('keymap'),
    select: document.getElementById('select'),
    chartList: document.getElementById('chartList'),
    speedRow: document.getElementById('speedRow'),
    startBtn: document.getElementById('startBtn'),
    hud: document.getElementById('hud'),
    hudChart: document.getElementById('hudChart'),
    hudSpeed: document.getElementById('hudSpeed'),
    hudCombo: document.getElementById('hudCombo'),
    hudScore: document.getElementById('hudScore'),
    hudAcc: document.getElementById('hudAcc'),
    hudProgress: document.getElementById('hudProgress'),
    back: document.getElementById('backBtn'),
    results: document.getElementById('results'),
    resTitle: document.getElementById('resTitle'),
    resGrade: document.getElementById('resGrade'),
    resStats: document.getElementById('resStats'),
    resBest: document.getElementById('resBest'),
    retryBtn: document.getElementById('retryBtn'),
    resMenuBtn: document.getElementById('resMenuBtn'),
  };

  const state = {
    mode: 'boot',          // boot | menu | select | free | play | results
    flashes: {},           // pieceId -> { t, v }
    laneFlash: {},         // laneId -> t
    floaters: [],
    chartIndex: 0,
    speedIndex: 1,
    run: null,
    save: loadSave(),
  };

  let view = { dpr: 1, s: 1, x: 0, y: 0, w: LW, h: LH };

  /* ---------------- save ---------------- */

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.best) return data;
    } catch (e) { /* corrupt or blocked storage — start fresh */ }
    return { v: 1, best: {} };
  }

  function saveNow() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.save)); }
    catch (e) { /* private mode; scores just won't persist */ }
  }

  function bestKey(chartId, speedName) { return chartId + '|' + speedName; }

  /* ---------------- layout ---------------- */

  function resize() {
    const rect = stage.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * view.dpr);
    canvas.height = Math.round(rect.height * view.dpr);
    view.w = rect.width;
    view.h = rect.height;
    view.s = Math.min(rect.width / LW, rect.height / LH);
    view.x = (rect.width - LW * view.s) / 2;
    view.y = (rect.height - LH * view.s) / 2;
  }

  // Where the kit sits in logical space: full size in free play, tucked under the
  // highway during falling notes.
  function kitTransform() {
    if (state.mode === 'play') return { s: 0.5, x: 250, y: 368 };
    return { s: 1, x: 0, y: 34 };
  }

  function laneX(i) {
    const usable = LW - LANE_MARGIN * 2;
    const w = usable / Kit.LANES.length;
    return LANE_MARGIN + w * (i + 0.5);
  }

  function laneWidth() { return (LW - LANE_MARGIN * 2) / Kit.LANES.length; }

  function laneIndex(laneId) {
    for (let i = 0; i < Kit.LANES.length; i++) if (Kit.LANES[i].lane === laneId) return i;
    return -1;
  }

  /* ---------------- input ---------------- */

  function screenToLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x) / view.s,
      y: (clientY - rect.top - view.y) / view.s,
    };
  }

  // One entry point for every input path, so keys and touch behave identically.
  function hit(pieceId, velocity) {
    const t = DrumAudio.time();
    DrumAudio.play(Kit.VOICE_OF[pieceId] || pieceId, t, velocity == null ? 0.9 : velocity);
    state.flashes[pieceId] = { t, v: 1 };
    lastHitAt = t;
    // Striking the hat at all settles the other plate visually.
    if (pieceId === 'hihat') delete state.flashes.hihatOpen;
    if (pieceId === 'hihatOpen') delete state.flashes.hihat;

    if (state.mode === 'play' && state.run && !state.run.ended) {
      const lane = Kit.laneOf(pieceId);
      state.laneFlash[lane] = t;
      judgeHit(lane, t);
    }
  }

  function onPointerDown(e) {
    e.preventDefault();
    if (state.mode !== 'free' && state.mode !== 'play') return;
    const p = screenToLogical(e.clientX, e.clientY);
    const kt = kitTransform();
    const kx = (p.x - kt.x) / kt.s;
    const ky = (p.y - kt.y) / kt.s;
    const id = Kit.hitTest(kx, ky);
    if (id) hit(id);
  }

  function onKeyDown(e) {
    // Held keys must not machine-gun.
    if (e.repeat) return;

    const key = e.key === ' ' ? ' ' : e.key.toLowerCase();
    if (key === ' ' || key === 'arrowup' || key === 'arrowdown') e.preventDefault();

    if (state.mode === 'boot') { start(); return; }
    if (e.key === 'Escape') {
      if (state.mode === 'free' || state.mode === 'play') goMenu();
      else if (state.mode === 'select' || state.mode === 'results') goMenu();
      return;
    }
    if (state.mode !== 'free' && state.mode !== 'play') return;

    const id = Kit.KEYS[key];
    if (id) hit(id);
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 120));

  /* ---------------- falling notes ---------------- */

  function startRun(chart, speed) {
    const now = DrumAudio.time();
    const beat = 60 / chart.bpm;
    const leadIn = beat * 4 + 0.4;
    const startTime = now + leadIn;
    const notes = Charts.build(chart, startTime);

    // Metronome: quarter notes through the run, plus a four-beat count-in.
    const sps = Charts.secPerStep(chart);
    const clicks = [];
    for (let i = 4; i >= 1; i--) clicks.push({ t: startTime - beat * i, accent: i === 4 });
    for (let s = 0; s < Charts.totalSteps(chart); s += 4) {
      clicks.push({ t: startTime + s * sps, accent: (s % chart.steps) === 0 });
    }

    state.run = {
      chart, speed, notes, clicks,
      clickIndex: 0,
      startTime,
      beat,
      endTime: startTime + Charts.duration(chart) + 0.9,
      lastNoteTime: notes.length ? notes[notes.length - 1].time : startTime,
      total: notes.length,
      score: 0, combo: 0, maxCombo: 0,
      counts: { perfect: 0, good: 0, miss: 0, stray: 0 },
      ended: false,
    };

    state.floaters.length = 0;
    state.flashes = {};
    state.laneFlash = {};
    setMode('play');

    el.hudChart.textContent = chart.name;
    el.hudSpeed.textContent = speed.name + ' · ' + chart.bpm + ' BPM';
    hudLast.score = -1;
  }

  function multiplier(combo) { return 1 + Math.min(3, Math.floor(combo / 12)); }

  function judgeHit(laneId, t) {
    const run = state.run;
    let best = null, bestDt = Infinity;
    for (const n of run.notes) {
      if (n.judged || n.lane !== laneId) continue;
      const dt = Math.abs(n.time - t);
      if (dt < bestDt) { best = n; bestDt = dt; }
    }
    if (!best || bestDt > W_GOOD) {
      // Nothing to hit here. Only counts against you while the chart is live —
      // warming up during the count-in, or celebrating after the last note, is free.
      if (t >= run.startTime - W_GOOD && t <= run.lastNoteTime + W_LATE) {
        run.counts.stray++;
        run.combo = 0;
        floater(laneId, 'EXTRA', '#ff5470');
      }
      return;
    }

    best.judged = true;
    if (bestDt <= W_PERFECT) {
      best.result = 'perfect';
      run.counts.perfect++;
      run.combo++;
      run.score += 100 * multiplier(run.combo);
      floater(laneId, 'PERFECT', '#7ef0b8');
    } else {
      best.result = 'good';
      run.counts.good++;
      run.combo++;
      run.score += 45 * multiplier(run.combo);
      floater(laneId, 'GOOD', '#ffd23f');
    }
    run.maxCombo = Math.max(run.maxCombo, run.combo);
    state.laneFlash[laneId] = t;
  }

  function floater(laneId, text, color) {
    const i = laneIndex(laneId);
    state.floaters.push({
      x: i < 0 ? LW / 2 : laneX(i),
      y: HIT_Y - 42,
      t: DrumAudio.time(),
      text, color,
    });
    if (state.floaters.length > 24) state.floaters.shift();
  }

  function updatePlay(t) {
    const run = state.run;
    if (!run) return;

    // Schedule clicks a little ahead so the metronome never jitters.
    while (run.clickIndex < run.clicks.length && run.clicks[run.clickIndex].t < t + 0.25) {
      const c = run.clicks[run.clickIndex++];
      if (c.t > t - 0.05) DrumAudio.click(c.t, c.accent);
    }

    // Notes that sailed past the window.
    for (const n of run.notes) {
      if (!n.judged && t > n.time + W_LATE) {
        n.judged = true;
        n.result = 'miss';
        run.counts.miss++;
        floater(n.lane, 'MISS', '#ff5470');
        run.combo = 0;
      }
    }

    if (!run.ended && t > run.endTime) finishRun();
  }

  function grade(acc) {
    if (acc >= 97) return 'S';
    if (acc >= 92) return 'A';
    if (acc >= 84) return 'B';
    if (acc >= 72) return 'C';
    return 'D';
  }

  function finishRun() {
    const run = state.run;
    run.ended = true;

    const c = run.counts;
    // Extra hits inflate the denominator, so spamming can't grade well.
    const denom = run.total + c.stray;
    const acc = denom ? ((c.perfect + c.good * 0.5) / denom) * 100 : 0;
    const gr = grade(acc);

    const key = bestKey(run.chart.id, run.speed.name);
    const prev = state.save.best[key];
    const isBest = !prev || run.score > prev.score;
    if (isBest) {
      state.save.best[key] = { score: run.score, acc: Math.round(acc * 10) / 10, grade: gr };
      saveNow();
    }

    el.resTitle.textContent = run.chart.name + ' · ' + run.speed.name;
    el.resGrade.textContent = gr;
    el.resStats.innerHTML = [
      ['Score', run.score.toLocaleString()],
      ['Accuracy', acc.toFixed(1) + '%'],
      ['Max combo', run.maxCombo],
      ['Perfect', c.perfect],
      ['Good', c.good],
      ['Missed', c.miss],
      ['Extra hits', c.stray],
    ].map(([k, v]) => '<div class="rs"><div class="rs-k">' + k + '</div><div class="rs-v">' + v + '</div></div>').join('');
    el.resBest.innerHTML = isBest
      ? '<strong>New best!</strong>'
      : 'Best: <strong>' + prev.score.toLocaleString() + '</strong> (' + prev.grade + ')';

    setMode('results');
  }

  /* ---------------- rendering ---------------- */

  function drawHighway(t) {
    const run = state.run;
    const lw = laneWidth();

    for (let i = 0; i < Kit.LANES.length; i++) {
      const piece = Kit.LANES[i];
      const cx = laneX(i);
      const x = cx - lw / 2;

      const grad = g.createLinearGradient(0, 0, 0, HIT_Y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, hexA(piece.color, 0.1));
      g.fillStyle = grad;
      g.fillRect(x + 1, 0, lw - 2, HIT_Y);

      g.strokeStyle = 'rgba(255,255,255,0.05)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, 0); g.lineTo(x, HIT_Y);
      g.stroke();
    }

    // Hit line
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(LANE_MARGIN, HIT_Y); g.lineTo(LW - LANE_MARGIN, HIT_Y);
    g.stroke();

    // Receptors with key labels
    for (let i = 0; i < Kit.LANES.length; i++) {
      const piece = Kit.LANES[i];
      const cx = laneX(i);
      const fl = state.laneFlash[piece.lane];
      const glow = fl ? Math.max(0, 1 - (t - fl) / 0.22) : 0;

      g.save();
      g.strokeStyle = piece.color;
      g.globalAlpha = 0.35 + glow * 0.65;
      g.lineWidth = 2 + glow * 3;
      Kit.roundRect(g, cx - NOTE_W / 2, HIT_Y - 15, NOTE_W, 30, 8);
      g.stroke();
      if (glow > 0) {
        g.globalAlpha = glow * 0.3;
        g.fillStyle = piece.color;
        g.fill();
      }
      g.restore();

      g.fillStyle = 'rgba(236,239,247,0.75)';
      g.font = '600 13px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(piece.keyLabel, cx, HIT_Y);
    }

    if (!run) return;

    // Notes
    for (const n of run.notes) {
      if (n.judged) continue;
      const y = HIT_Y - (n.time - t) * run.speed.px;
      if (y < -NOTE_H || y > HIT_Y + 60) continue;

      const i = laneIndex(n.lane);
      if (i < 0) continue;
      const piece = Kit.LANES[i];
      const cx = laneX(i);

      g.save();
      if (n.open) {
        // Open hat reads as a ring, so it's distinguishable mid-fall.
        g.strokeStyle = piece.color;
        g.lineWidth = 3;
        Kit.roundRect(g, cx - NOTE_W / 2, y - NOTE_H / 2, NOTE_W, NOTE_H, 9);
        g.stroke();
      } else {
        const ng = g.createLinearGradient(0, y - NOTE_H / 2, 0, y + NOTE_H / 2);
        ng.addColorStop(0, '#ffffff');
        ng.addColorStop(0.25, piece.color);
        ng.addColorStop(1, shade(piece.color, -0.35));
        g.fillStyle = ng;
        Kit.roundRect(g, cx - NOTE_W / 2, y - NOTE_H / 2, NOTE_W, NOTE_H, 9);
        g.fill();
      }
      g.restore();
    }
  }

  function drawFloaters(t) {
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i];
      const age = t - f.t;
      if (age > 0.62) { state.floaters.splice(i, 1); continue; }
      const k = age / 0.62;
      g.save();
      g.globalAlpha = 1 - k * k;
      g.fillStyle = f.color;
      g.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(f.text, f.x, f.y - k * 34);
      g.restore();
    }
  }

  function drawCountIn(t) {
    const run = state.run;
    if (!run || t >= run.startTime) return;
    const left = run.startTime - t;
    const n = Math.max(1, Math.ceil(left / run.beat));
    const frac = (left % run.beat) / run.beat;

    g.save();
    g.globalAlpha = 0.35 + frac * 0.55;
    g.fillStyle = '#ffd23f';
    g.font = '800 128px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), LW / 2, HIT_Y / 2);
    g.globalAlpha = 0.6;
    g.font = '600 18px -apple-system, sans-serif';
    g.fillStyle = '#9aa2b8';
    g.fillText('get ready', LW / 2, HIT_Y / 2 + 88);
    g.restore();
  }

  function drawFreeHint() {
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = '#9aa2b8';
    g.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Tap a drum or press its key · Esc for menu', LW / 2, 20);
    g.restore();
  }

  const hudLast = { score: -1, combo: -1, acc: '', prog: -1 };

  function updateHud(t) {
    const run = state.run;
    if (!run) return;
    if (run.score !== hudLast.score) {
      el.hudScore.textContent = run.score.toLocaleString();
      hudLast.score = run.score;
    }
    if (run.combo !== hudLast.combo) {
      const m = multiplier(run.combo);
      el.hudCombo.textContent = run.combo >= 4 ? run.combo + 'x' + (m > 1 ? ' ·' + m : '') : '';
      hudLast.combo = run.combo;
    }
    const judged = run.counts.perfect + run.counts.good + run.counts.miss + run.counts.stray;
    const acc = judged ? (((run.counts.perfect + run.counts.good * 0.5) / judged) * 100).toFixed(1) + '%' : '100.0%';
    if (acc !== hudLast.acc) { el.hudAcc.textContent = acc; hudLast.acc = acc; }

    const span = run.endTime - run.startTime;
    const prog = Math.max(0, Math.min(1, (t - run.startTime) / span));
    const pct = Math.round(prog * 100);
    if (pct !== hudLast.prog) { el.hudProgress.style.width = pct + '%'; hudLast.prog = pct; }
  }

  function render(t) {
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    g.clearRect(0, 0, view.w, view.h);
    g.save();
    g.translate(view.x, view.y);
    g.scale(view.s, view.s);

    drawStageLight(t);

    if (state.mode === 'play') drawHighway(t);
    if (state.mode === 'free') drawFreeHint();

    const kt = kitTransform();
    g.save();
    g.translate(kt.x, kt.y);
    g.scale(kt.s, kt.s);
    Kit.draw(g, state.flashes, t, state.mode === 'free');
    g.restore();

    if (state.mode === 'play') { drawFloaters(t); drawCountIn(t); }
    g.restore();
  }

  // Warm pool of light behind the kit, brightening for a moment on every hit —
  // the room reacting to the drum rather than the drum lighting itself.
  let lastHitAt = -10;
  function drawStageLight(t) {
    const kt = kitTransform();
    const cx = 520 * kt.s + kt.x;
    const cy = 430 * kt.s + kt.y;
    const r = 620 * kt.s;
    const pulse = Math.max(0, 1 - (t - lastHitAt) / 0.35);

    const grad = g.createRadialGradient(cx, cy - r * 0.25, r * 0.05, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 214, 130, ' + (0.11 + pulse * 0.07).toFixed(3) + ')');
    grad.addColorStop(0.45, 'rgba(255, 180, 90, ' + (0.045 + pulse * 0.03).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(255, 160, 70, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, LW, LH);
  }

  function frame() {
    requestAnimationFrame(frame);
    const t = DrumAudio.time();
    if (state.mode === 'play') { updatePlay(t); updateHud(t); }
    render(t);
  }

  /* ---------------- colour helpers ---------------- */

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
    return 'rgb(' + f((n >> 16) & 255) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }

  /* ---------------- screens ---------------- */

  function setMode(mode) {
    state.mode = mode;
    el.boot.classList.toggle('hidden', mode !== 'boot');
    el.menu.classList.toggle('hidden', mode !== 'menu');
    el.select.classList.toggle('hidden', mode !== 'select');
    el.results.classList.toggle('hidden', mode !== 'results');
    el.hud.classList.toggle('hidden', mode !== 'play');
    el.back.classList.toggle('hidden', mode !== 'free' && mode !== 'play');
  }

  function goMenu() {
    state.run = null;
    state.floaters.length = 0;
    setMode('menu');
  }

  function buildKeymap() {
    const rows = Kit.LANES.map((p) =>
      '<span class="km"><kbd>' + p.keyLabel + '</kbd>' + p.name + '</span>');
    rows.splice(3, 0, '<span class="km"><kbd>Q</kbd>Open Hat</span>');
    el.keymap.innerHTML = rows.join('');
  }

  function renderChartList() {
    el.chartList.innerHTML = Charts.CHARTS.map((c, i) => {
      const b = state.save.best[bestKey(c.id, SPEEDS[state.speedIndex].name)];
      const best = b ? '<div class="cr-best">' + b.grade + ' · ' + b.score.toLocaleString() + '</div>' : '';
      return '<button class="chart-row' + (i === state.chartIndex ? ' sel' : '') + '" data-chart="' + i + '">' +
        '<div class="cr-main"><div class="cr-name">' + c.name + '</div>' +
        '<div class="cr-desc">' + c.desc + '</div></div>' +
        '<div class="cr-meta">' + c.bpm + ' BPM<br>' + Charts.noteCount(c) + ' notes' + best + '</div>' +
        '</button>';
    }).join('');
  }

  function renderSpeedRow() {
    el.speedRow.innerHTML = SPEEDS.map((s, i) =>
      '<button class="pill' + (i === state.speedIndex ? ' sel' : '') + '" data-speed="' + i + '">' + s.name + '</button>'
    ).join('');
  }

  el.chartList.addEventListener('click', (e) => {
    const row = e.target.closest('[data-chart]');
    if (!row) return;
    state.chartIndex = +row.dataset.chart;
    renderChartList();
  });

  el.speedRow.addEventListener('click', (e) => {
    const p = e.target.closest('[data-speed]');
    if (!p) return;
    state.speedIndex = +p.dataset.speed;
    renderSpeedRow();
    renderChartList();     // best scores are per speed
  });

  el.menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    if (b.dataset.go === 'free') { setMode('free'); return; }
    renderChartList();
    renderSpeedRow();
    setMode('select');
  });

  el.startBtn.addEventListener('click', () => {
    startRun(Charts.CHARTS[state.chartIndex], SPEEDS[state.speedIndex]);
  });

  el.retryBtn.addEventListener('click', () => {
    const run = state.run;
    startRun(run ? run.chart : Charts.CHARTS[state.chartIndex], run ? run.speed : SPEEDS[state.speedIndex]);
  });

  el.resMenuBtn.addEventListener('click', goMenu);
  el.back.addEventListener('click', goMenu);

  /* ---------------- boot ---------------- */

  function start() {
    DrumAudio.unlock();
    buildKeymap();
    goMenu();
  }

  el.bootBtn.addEventListener('click', start);
  el.boot.addEventListener('pointerdown', () => { if (state.mode === 'boot') start(); });

  resize();
  requestAnimationFrame(frame);
})();
