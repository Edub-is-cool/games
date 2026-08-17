/* Drum Pro — kit layout, drawing, and hit testing.
 *
 * Everything here lives in a fixed 1000x640 "kit space". The caller sets up a
 * canvas transform (full size for free play, scaled down for falling notes) and
 * converts pointer coords back into kit space before calling hitTest.
 */
const Kit = (() => {
  const W = 1000, H = 640;
  const FLOOR = 622;

  const PIECES = {
    crash:    { id: 'crash',    lane: 'crash',    name: 'Crash',     key: 'l', keyLabel: 'L', color: '#ff9de0',
                type: 'cymbal', x: 170, y: 150, rx: 98,  ry: 30 },
    ride:     { id: 'ride',     lane: 'ride',     name: 'Ride',      key: 'k', keyLabel: 'K', color: '#7ef0b8',
                type: 'cymbal', x: 835, y: 175, rx: 108, ry: 33 },
    hihat:    { id: 'hihat',    lane: 'hihat',    name: 'Hi-Hat',    key: 'a', keyLabel: 'A', color: '#ffd23f',
                type: 'hihat',  x: 345, y: 215, rx: 72,  ry: 23 },
    highTom:  { id: 'highTom',  lane: 'highTom',  name: 'High Tom',  key: 'd', keyLabel: 'D', color: '#4dd2ff',
                type: 'drum',   x: 430, y: 330, r: 64 },
    midTom:   { id: 'midTom',   lane: 'midTom',   name: 'Mid Tom',   key: 'f', keyLabel: 'F', color: '#5b8cff',
                type: 'drum',   x: 578, y: 318, r: 72 },
    floorTom: { id: 'floorTom', lane: 'floorTom', name: 'Floor Tom', key: 'j', keyLabel: 'J', color: '#a06bff',
                type: 'drum',   x: 795, y: 432, r: 86 },
    snare:    { id: 'snare',    lane: 'snare',    name: 'Snare',     key: 's', keyLabel: 'S', color: '#ff5470',
                type: 'drum',   x: 262, y: 440, r: 80 },
    kick:     { id: 'kick',     lane: 'kick',     name: 'Kick',      key: ' ', keyLabel: 'Space', color: '#f0803c',
                type: 'drum',   x: 520, y: 488, r: 126 },
  };

  // Back to front. Cymbals sit behind, kick behind the toms, snare in front.
  const DRAW_ORDER = ['crash', 'ride', 'hihat', 'kick', 'highTom', 'midTom', 'floorTom', 'snare'];
  // Front to back, for hit testing where shapes overlap.
  const HIT_ORDER = ['snare', 'floorTom', 'midTom', 'highTom', 'kick', 'hihat', 'ride', 'crash'];

  // Lanes read left-to-right in the same order the pieces appear on the kit, so
  // the falling-note highway is spatially honest.
  const LANES = ['crash', 'snare', 'hihat', 'highTom', 'kick', 'midTom', 'floorTom', 'ride']
    .map((id) => PIECES[id]);

  // Every sound a piece can make. The open hat shares the hi-hat's pad and lane.
  const VOICE_OF = {
    crash: 'crash', ride: 'ride', highTom: 'highTom', midTom: 'midTom',
    floorTom: 'floorTom', snare: 'snare', kick: 'kick',
    hihat: 'hihatClosed', hihatOpen: 'hihatOpen',
  };

  const KEYS = {};
  Object.values(PIECES).forEach((p) => { KEYS[p.key] = p.id; });
  KEYS.q = 'hihatOpen';   // same pad, foot off the pedal

  function laneOf(pieceId) {
    return pieceId === 'hihatOpen' ? 'hihat' : pieceId;
  }

  /* ---------- hit testing ---------- */

  function hitTest(x, y) {
    for (const id of HIT_ORDER) {
      const p = PIECES[id];
      if (p.type === 'drum') {
        const dx = x - p.x, dy = y - p.y;
        if (dx * dx + dy * dy <= p.r * p.r) return id;
      } else {
        // Ellipse test, padded vertically so thin cymbals stay tappable on touch.
        const pad = 14;
        const dx = (x - p.x) / p.rx, dy = (y - p.y) / (p.ry + pad);
        if (dx * dx + dy * dy <= 1) {
          // Upper plate of the hat is the open sound.
          if (id === 'hihat' && y < p.y - 2) return 'hihatOpen';
          return id;
        }
      }
    }
    return null;
  }

  /* ---------- drawing ---------- */

  function glowOf(flashes, id, now) {
    const f = flashes[id];
    if (!f) return 0;
    const age = now - f.t;
    if (age < 0 || age > 0.3) return 0;
    return (1 - age / 0.3) * (f.v == null ? 1 : f.v);
  }

  function stand(g, x, yTop, lean) {
    g.strokeStyle = '#2a2d3a';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(x, yTop);
    g.lineTo(x + lean, FLOOR);
    g.stroke();
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x + lean - 26, FLOOR + 6);
    g.lineTo(x + lean, FLOOR - 24);
    g.lineTo(x + lean + 26, FLOOR + 6);
    g.stroke();
  }

  function cymbalPlate(g, p, cx, cy, rx, ry, glow) {
    const grad = g.createLinearGradient(cx - rx, cy, cx + rx, cy);
    grad.addColorStop(0, '#8a6d2a');
    grad.addColorStop(0.35, '#d8b25a');
    grad.addColorStop(0.55, '#f5e0a0');
    grad.addColorStop(1, '#7d6127');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      g.beginPath();
      g.ellipse(cx, cy, rx * (i / 4), ry * (i / 4), 0, 0, Math.PI * 2);
      g.stroke();
    }
    // Bell
    g.fillStyle = '#e6c877';
    g.beginPath();
    g.ellipse(cx, cy - ry * 0.25, rx * 0.16, ry * 0.4, 0, 0, Math.PI * 2);
    g.fill();

    if (glow > 0) {
      g.save();
      g.globalAlpha = glow * 0.85;
      g.strokeStyle = p.color;
      g.lineWidth = 3 + glow * 4;
      g.beginPath();
      g.ellipse(cx, cy, rx + glow * 16, ry + glow * 8, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  function drawCymbal(g, p, flashes, now) {
    const glow = glowOf(flashes, p.id, now);
    // Struck cymbals rock slightly.
    const tilt = glow * 0.05;
    stand(g, p.x, p.y + 8, 0);
    g.save();
    g.translate(p.x, p.y);
    g.rotate(tilt);
    cymbalPlate(g, p, 0, 0, p.rx, p.ry, glow);
    g.restore();
  }

  function drawHiHat(g, p, flashes, now) {
    const closedGlow = glowOf(flashes, 'hihat', now);
    const openGlow = glowOf(flashes, 'hihatOpen', now);
    // The plates part when the open sound is playing.
    const gap = 6 + openGlow * 16;

    stand(g, p.x, p.y + 10, 0);
    cymbalPlate(g, p, p.x, p.y + 10, p.rx, p.ry, closedGlow);
    g.save();
    g.globalAlpha = 0.96;
    cymbalPlate(g, p, p.x, p.y - gap, p.rx * 0.96, p.ry * 0.85, openGlow);
    g.restore();
  }

  function drawDrum(g, p, flashes, now) {
    const glow = glowOf(flashes, p.id, now);
    // Hitting a head pushes it in a touch.
    const squash = 1 - glow * 0.04;
    const r = p.r * squash;

    // Shell depth
    g.fillStyle = '#191b26';
    g.beginPath();
    g.ellipse(p.x, p.y + r * 0.12, r * 0.99, r * 0.99, 0, 0, Math.PI * 2);
    g.fill();

    // Rim
    const rim = g.createLinearGradient(p.x - r, p.y - r, p.x + r, p.y + r);
    rim.addColorStop(0, '#5d6478');
    rim.addColorStop(0.5, '#8f97ad');
    rim.addColorStop(1, '#3f4557');
    g.fillStyle = rim;
    g.beginPath();
    g.arc(p.x, p.y, r, 0, Math.PI * 2);
    g.fill();

    // Head
    const head = g.createRadialGradient(p.x - r * 0.3, p.y - r * 0.4, r * 0.1, p.x, p.y, r * 0.9);
    head.addColorStop(0, '#f3f5fa');
    head.addColorStop(0.65, '#d5dae6');
    head.addColorStop(1, '#a8b0c2');
    g.fillStyle = head;
    g.beginPath();
    g.arc(p.x, p.y, r * 0.88, 0, Math.PI * 2);
    g.fill();

    // Colour ring so each piece is identifiable at a glance
    g.strokeStyle = p.color;
    g.globalAlpha = 0.5 + glow * 0.5;
    g.lineWidth = 4 + glow * 5;
    g.beginPath();
    g.arc(p.x, p.y, r * 0.88, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;

    // Lugs
    g.fillStyle = '#6c7488';
    const lugs = p.id === 'kick' ? 10 : 6;
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2 + 0.3;
      g.beginPath();
      g.arc(p.x + Math.cos(a) * r * 0.95, p.y + Math.sin(a) * r * 0.95, 4.5, 0, Math.PI * 2);
      g.fill();
    }

    if (glow > 0) {
      g.save();
      g.globalAlpha = glow * 0.55;
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x, p.y, r * 0.86, 0, Math.PI * 2);
      g.fill();
      // Expanding shock ring
      g.globalAlpha = glow * 0.5;
      g.strokeStyle = p.color;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(p.x, p.y, r * (0.9 + (1 - glow) * 0.5), 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }

  function drawKeyCap(g, p) {
    const label = p.keyLabel;
    const isHat = p.id === 'hihat';
    const y = p.type === 'drum' ? p.y + (p.r * 0.42) : p.y + 34;
    const w = label.length > 1 ? 54 : 30;
    const x = p.x - w / 2;

    g.save();
    g.globalAlpha = 0.9;
    g.fillStyle = 'rgba(10,10,16,0.72)';
    roundRect(g, x, y - 13, w, 26, 7);
    g.fill();
    g.strokeStyle = p.color;
    g.globalAlpha = 0.7;
    g.lineWidth = 1.5;
    roundRect(g, x, y - 13, w, 26, 7);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = '#e8ecf5';
    g.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, p.x, y);
    if (isHat) {
      g.font = '600 11px ui-monospace, Menlo, monospace';
      g.globalAlpha = 0.75;
      g.fillText('Q = open', p.x, y + 22);
    }
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function draw(g, flashes, now, showKeys) {
    // Rug
    g.fillStyle = 'rgba(255,255,255,0.03)';
    g.beginPath();
    g.ellipse(520, FLOOR + 6, 470, 42, 0, 0, Math.PI * 2);
    g.fill();

    for (const id of DRAW_ORDER) {
      const p = PIECES[id];
      if (p.type === 'drum') drawDrum(g, p, flashes, now);
      else if (p.type === 'hihat') drawHiHat(g, p, flashes, now);
      else drawCymbal(g, p, flashes, now);
    }

    if (showKeys) Object.values(PIECES).forEach((p) => drawKeyCap(g, p));
  }

  return { W, H, PIECES, LANES, KEYS, VOICE_OF, laneOf, hitTest, draw, roundRect };
})();
