/* Trim Forge — 3D view.
   A small hand-written WebGL renderer for the player model: six boxes, plus
   the skin's outer layer and one inflated box per armour piece, unwrapped
   with Minecraft's own box UV layout. No libraries.

   Armour and trim are flattened into one texture per piece by pieceTexture()
   before they get here, so nothing is ever coplanar and there is no z-fight. */

/* ----------------------------------------------------------------- math -- */

function mat4Identity() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

function mat4Multiply(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
                     a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function mat4Perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const o = new Float32Array(16);
  o[0] = f / aspect; o[5] = f;
  o[10] = (far + near) / (near - far); o[11] = -1;
  o[14] = (2 * far * near) / (near - far);
  return o;
}

function mat4Translate(x, y, z) {
  const o = mat4Identity();
  o[12] = x; o[13] = y; o[14] = z;
  return o;
}

function mat4RotateX(rad) {
  const o = mat4Identity(), c = Math.cos(rad), s = Math.sin(rad);
  o[5] = c; o[6] = s; o[9] = -s; o[10] = c;
  return o;
}

function mat4RotateY(rad) {
  const o = mat4Identity(), c = Math.cos(rad), s = Math.sin(rad);
  o[0] = c; o[2] = -s; o[8] = s; o[10] = c;
  return o;
}

/* ------------------------------------------------------------- geometry --
   Minecraft unwraps a box as a strip: right | front | left | back, with top
   and bottom sitting above front and left. Face brightness is baked per face
   so the model reads as blocky without any real lighting. */

const SHADE = { top: 1.0, bottom: 0.55, front: 0.86, back: 0.78, side: 0.68 };

/* Rotation about a pivot, applied Z then Y then X as the game does. Capes and
   elytra need it; the plain body boxes are all axis-aligned. */
function rotatePoint(p, rot, pivot) {
  let x = p[0] - pivot[0], y = p[1] - pivot[1], z = p[2] - pivot[2];
  const [rx, ry, rz] = rot;
  if (rz) { const c = Math.cos(rz), s = Math.sin(rz); const nx = x*c - y*s; y = x*s + y*c; x = nx; }
  if (ry) { const c = Math.cos(ry), s = Math.sin(ry); const nx = x*c + z*s; z = -x*s + z*c; x = nx; }
  if (rx) { const c = Math.cos(rx), s = Math.sin(rx); const ny = y*c - z*s; z = y*s + z*c; y = ny; }
  return [x + pivot[0], y + pivot[1], z + pivot[2]];
}

function boxGeometry(out, box, texW, texH) {
  const [w, h, d] = box.size;
  const [cx, cy, cz] = box.pos;
  const e = box.inflate || 0;
  const hx = w / 2 + e, hy = h / 2 + e, hz = d / 2 + e;
  const [u, v] = box.uv;
  const mirror = !!box.mirror;

  const x0 = cx - hx, x1 = cx + hx;
  const y0 = cy - hy, y1 = cy + hy;
  const z0 = cz - hz, z1 = cz + hz;

  /* rect in pixels -> uv corners, flipped horizontally when mirrored */
  const rect = (rx, ry, rw, rh) => {
    let a = rx / texW, b = (rx + rw) / texW;
    if (mirror) { const t = a; a = b; b = t; }
    return [a, ry / texH, b, (ry + rh) / texH];
  };

  const right = rect(u, v + d, d, h);
  const front = rect(u + d, v + d, w, h);
  const left = rect(u + d + w, v + d, d, h);
  const back = rect(u + d + w + d, v + d, w, h);
  const top = rect(u + d, v, w, d);
  const bottom = rect(u + d + w, v, w, d);

  /* mirrored limbs swap which side face gets which rect */
  const negX = mirror ? left : right;
  const posX = mirror ? right : left;

  const faces = [
    { uv: front,  shade: SHADE.front,  corners: [[x0,y1,z1],[x1,y1,z1],[x1,y0,z1],[x0,y0,z1]] },
    { uv: back,   shade: SHADE.back,   corners: [[x1,y1,z0],[x0,y1,z0],[x0,y0,z0],[x1,y0,z0]] },
    { uv: negX,   shade: SHADE.side,   corners: [[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],[x0,y0,z0]] },
    { uv: posX,   shade: SHADE.side,   corners: [[x1,y1,z1],[x1,y1,z0],[x1,y0,z0],[x1,y0,z1]] },
    { uv: top,    shade: SHADE.top,    corners: [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]] },
    { uv: bottom, shade: SHADE.bottom, corners: [[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]] },
  ];

  /* Model parts written in Minecraft's space face -z; yaw180 turns such a box
     around so its design faces the player's back. */
  const pivot = box.pivot || [cx, cy, cz];
  const place = p => {
    let q = p;
    if (box.yaw180) q = rotatePoint(q, [0, Math.PI, 0], [cx, cy, cz]);
    if (box.rot) q = rotatePoint(q, box.rot, pivot);
    return q;
  };

  for (const f of faces) {
    const [uA, vA, uB, vB] = f.uv;
    const corner = [[uA, vA], [uB, vA], [uB, vB], [uA, vB]];
    const pts = f.corners.map(place);
    for (const i of [0, 1, 2, 0, 2, 3]) {
      out.push(pts[i][0], pts[i][1], pts[i][2],
               corner[i][0], corner[i][1], f.shade);
    }
  }
}

/* ---------------------------------------------------------------- model --
   Model units are skin pixels, feet at y=0. */

/* Idle motion. The arm sway is the game's own: HumanoidModel nudges the arms
   by cos(age * 0.09) * 0.05 and sin(age * 0.067) * 0.05 every tick, which
   almost nobody consciously notices. The head drift and cape sway are two slow
   sines each, deliberately at odd frequencies so the loop never reads as one.
   `t` is in ticks (20/s), as in game. */
function idlePose(t) {
  return {
    armZ: Math.cos(t * 0.09) * 0.05 + 0.05,
    armX: Math.sin(t * 0.067) * 0.05,
    headYaw: Math.sin(t * 0.013) * 0.04 + Math.sin(t * 0.0071) * 0.018,
    headPitch: Math.sin(t * 0.0097) * 0.014,
    capeSway: Math.sin(t * 0.05) * 0.02 + Math.sin(t * 0.031) * 0.012,
  };
}

const HEAD_PIVOT = [0, 24, 0];
const shoulder = sign => [sign * 5, 22, 0];

function headPose(pose) {
  return { pivot: HEAD_PIVOT, rot: [pose.headPitch, pose.headYaw, 0] };
}
function armPose(pose, sign) {
  return { pivot: shoulder(sign), rot: [pose.armX * sign, 0, pose.armZ * sign] };
}

function bodyBoxes(slim, legacy, pose) {
  const aw = slim ? 3 : 4;
  const ax = slim ? 5.5 : 6;
  const head = headPose(pose);
  const armR = armPose(pose, -1), armL = armPose(pose, 1);
  const base = [
    { uv: [0, 0],   size: [8, 8, 8],   pos: [0, 28, 0], ...head },
    { uv: [16, 16], size: [8, 12, 4],  pos: [0, 18, 0] },
    { uv: [40, 16], size: [aw, 12, 4], pos: [-ax, 18, 0], ...armR },
    legacy ? { uv: [40, 16], size: [aw, 12, 4], pos: [ax, 18, 0], mirror: true, ...armL }
           : { uv: [32, 48], size: [aw, 12, 4], pos: [ax, 18, 0], ...armL },
    { uv: [0, 16], size: [4, 12, 4], pos: [-2, 6, 0] },
    legacy ? { uv: [0, 16], size: [4, 12, 4], pos: [2, 6, 0], mirror: true }
           : { uv: [16, 48], size: [4, 12, 4], pos: [2, 6, 0] },
  ];
  const e = 0.25;
  const overlay = legacy ? [{ uv: [32, 0], size: [8, 8, 8], pos: [0, 28, 0], inflate: e, ...head }] : [
    { uv: [32, 0],  size: [8, 8, 8],   pos: [0, 28, 0],  inflate: e, ...head },
    { uv: [16, 32], size: [8, 12, 4],  pos: [0, 18, 0],  inflate: e },
    { uv: [40, 32], size: [aw, 12, 4], pos: [-ax, 18, 0], inflate: e, ...armR },
    { uv: [48, 48], size: [aw, 12, 4], pos: [ax, 18, 0],  inflate: e, ...armL },
    { uv: [0, 32],  size: [4, 12, 4],  pos: [-2, 6, 0],  inflate: e },
    { uv: [0, 48],  size: [4, 12, 4],  pos: [2, 6, 0],   inflate: e },
  ];
  return { base, overlay };
}

/* Armour always uses the standard (wide) humanoid model, as in game, and the
   64x32 layout with one arm and one leg mirrored across. */
const OUTER = 1.0, INNER = 0.5;

/* Helmet and sleeves have to ride the same pose as the head and arms, or the
   armour drifts off the body. */
function armorBoxes(piece, pose) {
  const head = headPose(pose);
  const armR = armPose(pose, -1), armL = armPose(pose, 1);
  switch (piece) {
    case 'helmet':
      return [{ uv: [0, 0], size: [8, 8, 8], pos: [0, 28, 0], inflate: OUTER, ...head }];
    case 'chestplate':
      return [
        { uv: [16, 16], size: [8, 12, 4], pos: [0, 18, 0], inflate: OUTER },
        { uv: [40, 16], size: [4, 12, 4], pos: [-6, 18, 0], inflate: OUTER, ...armR },
        { uv: [40, 16], size: [4, 12, 4], pos: [6, 18, 0], inflate: OUTER, mirror: true, ...armL },
      ];
    case 'boots':
      return [
        { uv: [0, 16], size: [4, 12, 4], pos: [-2, 6, 0], inflate: OUTER },
        { uv: [0, 16], size: [4, 12, 4], pos: [2, 6, 0], inflate: OUTER, mirror: true },
      ];
    case 'leggings':
      return [
        { uv: [16, 16], size: [8, 12, 4], pos: [0, 18, 0], inflate: INNER },
        { uv: [0, 16], size: [4, 12, 4], pos: [-2, 6, 0], inflate: INNER },
        { uv: [0, 16], size: [4, 12, 4], pos: [2, 6, 0], inflate: INNER, mirror: true },
      ];
    default:
      return [];
  }
}

/* ---------------------------------------------------------- held items --
   Item sprites are flat 16x16 textures that the game extrudes into a slab.
   Front and back are single quads (the cutout comes from the alpha discard);
   side faces are emitted per pixel wherever an opaque pixel meets a gap. */

function spriteGeometry(out, pixels, w, h, place) {
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && pixels[(y * w + x) * 4 + 3] > 16;
  const push = (pts, uv, shade) => {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const p = place(pts[i][0], pts[i][1], pts[i][2]);
      out.push(p[0], p[1], p[2], uv[i][0], uv[i][1], shade);
    }
  };

  const t = 0.5;   // half thickness, in sprite pixels
  /* flat faces, spanning the whole sprite */
  push([[0, 0, t], [w, 0, t], [w, h, t], [0, h, t]],
       [[0, 1], [1, 1], [1, 0], [0, 0]], SHADE.front);
  push([[w, 0, -t], [0, 0, -t], [0, h, -t], [w, h, -t]],
       [[1, 1], [0, 1], [0, 0], [1, 0]], SHADE.back);

  /* edges: one quad per exposed pixel side, textured with that texel */
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (!opaque(px, py)) continue;
      const u = (px + 0.5) / w, v = (py + 0.5) / h;
      const uv = [[u, v], [u, v], [u, v], [u, v]];
      const x0 = px, x1 = px + 1;
      const y0 = h - py - 1, y1 = h - py;      // sprite rows run top-down
      if (!opaque(px, py - 1)) push([[x0, y1, -t], [x1, y1, -t], [x1, y1, t], [x0, y1, t]], uv, SHADE.top);
      if (!opaque(px, py + 1)) push([[x0, y0, t], [x1, y0, t], [x1, y0, -t], [x0, y0, -t]], uv, SHADE.bottom);
      if (!opaque(px - 1, py)) push([[x0, y0, -t], [x0, y1, -t], [x0, y1, t], [x0, y0, t]], uv, SHADE.side);
      if (!opaque(px + 1, py)) push([[x1, y0, t], [x1, y1, t], [x1, y1, -t], [x1, y0, -t]], uv, SHADE.side);
    }
  }
}

/* Grip: the sprite's flat face points sideways and its diagonal runs up and
   forward, which is how a sword sits in the hand in third person. */
function heldItemPlacement(pose) {
  const scale = 0.82;
  const anchorX = 2, anchorY = 2;                    // the grip, on the sprite
  /* sits inside the fist rather than floating in front of it */
  const hand = [-6, 13.5 + pose.armX * 6, 0.5];
  const tilt = 0;                                    // the sprite's own diagonal is the grip angle
  return (lx, ly, lz) => {
    const x = (lx - anchorX) * scale;
    const y = (ly - anchorY) * scale;
    const z = lz * scale;
    /* sprite x runs forward, sprite y runs up, thickness goes sideways */
    let wy = y, wz = x;
    const c = Math.cos(tilt), sn = Math.sin(tilt);
    const ry = wy * c - wz * sn, rz = wy * sn + wz * c;
    return [hand[0] + z, hand[1] + ry, hand[2] + rz];
  };
}

/* Shield: plate plus handle, held in the off hand. Texture is 64x64. */
function shieldBoxes(pose) {
  const sway = pose.armX * -1;
  const y = 15 + sway * 5;
  /* held out from the off hand, clear of the torso */
  const x = 10.5, z = 5, turn = -0.3;
  return [
    { uv: [0, 0], size: [12, 22, 1], pos: [x, y, z + 1], pivot: [x, y, z], rot: [0, turn, 0] },
    { uv: [26, 0], size: [2, 6, 6], pos: [x - 1.5, y - 1, z - 2], pivot: [x, y, z], rot: [0, turn, 0] },
  ];
}

/* Cape hangs from the shoulders on the back and flares out slightly. The
   texture is the standard 64x32 cape layout. */
function capeBox(pose) {
  return {
    uv: [0, 0], size: [10, 16, 1], pos: [0, 16, -2.5],
    pivot: [0, 24, -2.5], yaw180: true, rot: [0.14 + pose.capeSway, 0, 0],
  };
}

/* Elytra: one 10x20x2 wing per side, folded against the back. */
function elytraBoxes(pose) {
  const flutter = pose ? pose.capeSway * 0.5 : 0;
  const wing = (sign, mirror) => ({
    uv: [22, 0], size: [10, 20, 2],
    pos: [0, 14, -1.2],
    pivot: [sign * 5, 23.5, -1.2],
    mirror,
    rot: [0.26, sign * -0.26, sign * (0.26 + flutter)],
  });
  return [wing(-1, false), wing(1, true)];
}

const spritePixelCache = new Map();
function itemPixels(key) {
  if (!IMG[key]) return null;
  let hit = spritePixelCache.get(key);
  if (!hit) { hit = pixelsOf(key); spritePixelCache.set(key, hit); }
  return hit;
}

/* ---------------------------------------------------------------- viewer -- */

const VERT_SRC = `
attribute vec3 aPos;
attribute vec2 aUV;
attribute float aShade;
uniform mat4 uMVP;
uniform vec4 uUV;        // xy scale, zw offset — the glint pass scrolls these
varying vec2 vUV;
varying float vShade;
void main() {
  vUV = aUV * uUV.xy + uUV.zw;
  vShade = aShade;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;

const FRAG_SRC = `
precision mediump float;
uniform sampler2D uTex;
uniform float uGlint;    // >0 while drawing the sheen; doubles as its strength
varying vec2 vUV;
varying float vShade;
void main() {
  vec4 c = texture2D(uTex, vUV);
  if (c.a < 0.1) discard;             // cutout, so draw order never matters
  float lit = uGlint > 0.0 ? uGlint : vShade;
  gl_FragColor = vec4(c.rgb * lit, c.a);
}`;

class Viewer3D {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;

    this.program = this.buildProgram();
    this.attr = {
      pos: gl.getAttribLocation(this.program, 'aPos'),
      uv: gl.getAttribLocation(this.program, 'aUV'),
      shade: gl.getAttribLocation(this.program, 'aShade'),
    };
    this.uMVP = gl.getUniformLocation(this.program, 'uMVP');
    this.uTex = gl.getUniformLocation(this.program, 'uTex');
    this.uUV = gl.getUniformLocation(this.program, 'uUV');
    this.uGlint = gl.getUniformLocation(this.program, 'uGlint');
    this.buffer = gl.createBuffer();
    this.textures = new WeakMap();

    this.yaw = -0.5; this.pitch = -0.18; this.distance = 52;
    this.spin = false;
    this.dirty = true;
    this.lastFrame = 0;
    this.ticks = 0;
    this.idle = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    this.attachControls();
  }

  buildProgram() {
    const gl = this.gl;
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('shader: ' + gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('link: ' + gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  attachControls() {
    const c = this.canvas;
    let dragging = false, lastX = 0, lastY = 0;

    c.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      this.spin = false;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', e => {
      if (!dragging) return;
      this.yaw += (e.clientX - lastX) * 0.01;
      this.pitch += (e.clientY - lastY) * 0.01;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
      lastX = e.clientX; lastY = e.clientY;
      this.dirty = true;
    });
    const stop = e => { dragging = false; if (c.hasPointerCapture?.(e.pointerId)) c.releasePointerCapture(e.pointerId); };
    c.addEventListener('pointerup', stop);
    c.addEventListener('pointercancel', stop);
    c.addEventListener('wheel', e => {
      e.preventDefault();
      this.distance = Math.max(24, Math.min(120, this.distance + Math.sign(e.deltaY) * 3));
      this.dirty = true;
    }, { passive: false });
  }

  /* Textures are keyed off the canvas/image object, so a recoloured piece
     uploads once and is reused until its composite changes. */
  texture(source, linear, repeat) {
    let tex = this.textures.get(source);
    if (tex) return tex;
    const gl = this.gl;
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    this.textures.set(source, tex);
    return tex;
  }

  bindData(data) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    const stride = 6 * 4;
    gl.enableVertexAttribArray(this.attr.pos);
    gl.vertexAttribPointer(this.attr.pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.attr.uv);
    gl.vertexAttribPointer(this.attr.uv, 2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(this.attr.shade);
    gl.vertexAttribPointer(this.attr.shade, 1, gl.FLOAT, false, stride, 20);
  }

  /* The enchantment sheen re-draws the same geometry with the glint sheet,
     scrolled and added on top. depthFunc EQUAL keeps it exactly where the
     model actually drew, so cut-out pixels never light up. */
  drawGlint(count, sheet) {
    const gl = this.gl;
    const tex = IMG[sheet];
    if (!tex) return;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture(tex, true, true));
    gl.uniform1f(this.uGlint, 0.26);
    gl.depthFunc(gl.EQUAL);
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    const t = this.ticks;
    for (const [scale, sx, sy] of [[3.1, 0.0038, 0.0021], [2.4, -0.0026, 0.0033]]) {
      gl.uniform4f(this.uUV, scale, scale, (t * sx) % 1, (t * sy) % 1);
      gl.drawArrays(gl.TRIANGLES, 0, count);
    }

    gl.uniform4f(this.uUV, 1, 1, 0, 0);
    gl.uniform1f(this.uGlint, 0);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  drawData(data, source, mvp, glintSheet) {
    if (!source || !data.length) return;
    const gl = this.gl;
    this.bindData(data);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture(source));
    gl.uniform1i(this.uTex, 0);
    gl.uniform4f(this.uUV, 1, 1, 0, 0);
    gl.uniform1f(this.uGlint, 0);
    gl.uniformMatrix4fv(this.uMVP, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, data.length / 6);
    if (glintSheet) this.drawGlint(data.length / 6, glintSheet);
  }

  drawGroup(boxes, source, texW, texH, mvp, glintSheet) {
    if (!source) return;
    const data = [];
    for (const box of boxes) boxGeometry(data, box, texW, texH);
    this.drawData(data, source, mvp, glintSheet);
  }

  /* Backdrop is a screen-filling quad drawn before the model with depth off.
     Positions are already in clip space, so the shader gets an identity MVP. */
  drawBackdrop(source, cover) {
    const gl = this.gl;
    let u0 = 0, v0 = 0, u1 = 1, v1 = 1;
    /* Procedural backdrops are uniform horizontally, so they stretch to fill —
       cover-fitting them would crop the horizon out. Photos get cover. */
    if (cover) {
      const canvasAspect = this.canvas.width / this.canvas.height;
      const texAspect = source.width / source.height;
      if (texAspect > canvasAspect) {
        const f = canvasAspect / texAspect;
        u0 = (1 - f) / 2; u1 = 1 - u0;
      } else {
        const f = texAspect / canvasAspect;
        v0 = (1 - f) / 2; v1 = 1 - v0;
      }
    }
    const data = [
      -1, -1, 0, u0, v1, 1,   1, -1, 0, u1, v1, 1,   1, 1, 0, u1, v0, 1,
      -1, -1, 0, u0, v1, 1,   1, 1, 0, u1, v0, 1,   -1, 1, 0, u0, v0, 1,
    ];
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    const stride = 6 * 4;
    gl.enableVertexAttribArray(this.attr.pos);
    gl.vertexAttribPointer(this.attr.pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.attr.uv);
    gl.vertexAttribPointer(this.attr.uv, 2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(this.attr.shade);
    gl.vertexAttribPointer(this.attr.shade, 1, gl.FLOAT, false, stride, 20);

    const big = Math.max(source.width, source.height) > 128;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture(source, big));
    gl.uniform1i(this.uTex, 0);
    gl.uniform4f(this.uUV, 1, 1, 0, 0);
    gl.uniform1f(this.uGlint, 0);
    gl.uniformMatrix4fv(this.uMVP, false, mat4Identity());
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.enable(gl.DEPTH_TEST);
  }

  /* Renders once at a multiple of the on-screen size and hands back a PNG,
     so an exported shot isn't stuck at whatever the panel happens to be. */
  snapshot(opts, multiplier) {
    const w = this.canvas.width, h = this.canvas.height;
    this.lockSize = true;
    this.canvas.width = Math.round(this.canvas.clientWidth * multiplier);
    this.canvas.height = Math.round(this.canvas.clientHeight * multiplier);
    this.render(opts);
    const url = this.canvas.toDataURL('image/png');
    this.lockSize = false;
    this.canvas.width = w; this.canvas.height = h;
    this.dirty = true;
    return url;
  }

  resize() {
    if (this.lockSize) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
      this.dirty = true;
    }
  }

  render(opts) {
    const gl = this.gl;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);          // inflated armour is viewed from inside at the neck

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const backdrop = backdropTexture(opts.bg);
    if (backdrop) this.drawBackdrop(backdrop, opts.bg === 'custom');

    const aspect = this.canvas.width / this.canvas.height;
    const proj = mat4Perspective(0.9, aspect, 0.1, 500);
    let view = mat4Multiply(mat4Translate(0, 0, -this.distance), mat4RotateX(this.pitch));
    view = mat4Multiply(view, mat4RotateY(this.yaw));
    view = mat4Multiply(view, mat4Translate(0, -18, 0));   // centre on the chest
    const mvp = mat4Multiply(proj, view);

    const skin = currentSkin();
    const legacy = skinIsLegacy();
    const slim = skinIsSlim();

    const pose = idlePose(this.idle ? this.ticks : 0);

    if (opts.showBody !== false) {
      const { base, overlay } = bodyBoxes(slim, legacy, pose);
      this.drawGroup(base, skin, skin.width, skin.height, mvp);
      this.drawGroup(overlay, skin, skin.width, skin.height, mvp);
    }

    /* An equipped elytra replaces the cape rather than layering over it. */
    const cape = currentCape();
    if (cape && !opts.elytra) this.drawGroup([capeBox(pose)], cape, 64, 32, mvp);

    for (const piece of ['leggings', 'boots', 'chestplate', 'helmet']) {
      const cfg = opts.pieces[piece];
      if (!cfg || !cfg.on) continue;
      const tex = pieceTexture(piece, cfg);
      if (!tex) continue;
      this.drawGroup(armorBoxes(piece, pose), tex, 64, 32, mvp, cfg.enchanted && 'glint/armor');
    }

    if (opts.shield) {
      this.drawGroup(shieldBoxes(pose), shieldTexture(opts.banner), 64, 64, mvp,
                     opts.shieldEnchanted && 'glint/item');
    }

    if (opts.item && opts.item !== 'none') {
      const def = HELD_ITEMS.find(i => i.id === opts.item);
      const key = def && def.tex ? `item/${def.tex}` : null;
      const px = key && itemPixels(key);
      if (px) {
        const data = [];
        spriteGeometry(data, px.data, px.width, px.height, heldItemPlacement(pose));
        this.drawData(data, IMG[key], mvp, opts.itemEnchanted && 'glint/item');
      }
    }

    /* A player with a cape flies it as their elytra, exactly as in game. */
    if (opts.elytra) {
      this.drawGroup(elytraBoxes(pose), cape || IMG['wings/elytra'], 64, 32, mvp);
    }
  }

  /* The idle pose keeps the loop running; without it we only draw on demand.
     requestAnimationFrame already pauses when the tab is hidden. */
  start(getOpts) {
    const frame = now => {
      const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.1) : 0;
      this.lastFrame = now;
      if (this.spin) this.yaw += dt * 0.6;
      if (this.idle) this.ticks += dt * 20;              // game ticks
      if (this.dirty || this.spin || this.idle || this.canvas.clientWidth !== this.lastW) {
        this.lastW = this.canvas.clientWidth;
        this.dirty = false;
        this.render(getOpts());
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
