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

function bodyBoxes(slim, legacy) {
  const aw = slim ? 3 : 4;
  const ax = slim ? 5.5 : 6;
  const base = [
    { uv: [0, 0],   size: [8, 8, 8],   pos: [0, 28, 0] },
    { uv: [16, 16], size: [8, 12, 4],  pos: [0, 18, 0] },
    { uv: [40, 16], size: [aw, 12, 4], pos: [-ax, 18, 0] },
    legacy ? { uv: [40, 16], size: [aw, 12, 4], pos: [ax, 18, 0], mirror: true }
           : { uv: [32, 48], size: [aw, 12, 4], pos: [ax, 18, 0] },
    { uv: [0, 16], size: [4, 12, 4], pos: [-2, 6, 0] },
    legacy ? { uv: [0, 16], size: [4, 12, 4], pos: [2, 6, 0], mirror: true }
           : { uv: [16, 48], size: [4, 12, 4], pos: [2, 6, 0] },
  ];
  const e = 0.25;
  const overlay = legacy ? [{ uv: [32, 0], size: [8, 8, 8], pos: [0, 28, 0], inflate: e }] : [
    { uv: [32, 0],  size: [8, 8, 8],   pos: [0, 28, 0],  inflate: e },
    { uv: [16, 32], size: [8, 12, 4],  pos: [0, 18, 0],  inflate: e },
    { uv: [40, 32], size: [aw, 12, 4], pos: [-ax, 18, 0], inflate: e },
    { uv: [48, 48], size: [aw, 12, 4], pos: [ax, 18, 0],  inflate: e },
    { uv: [0, 32],  size: [4, 12, 4],  pos: [-2, 6, 0],  inflate: e },
    { uv: [0, 48],  size: [4, 12, 4],  pos: [2, 6, 0],   inflate: e },
  ];
  return { base, overlay };
}

/* Armour always uses the standard (wide) humanoid model, as in game, and the
   64x32 layout with one arm and one leg mirrored across. */
const OUTER = 1.0, INNER = 0.5;
const ARMOR_BOXES = {
  helmet: [{ uv: [0, 0], size: [8, 8, 8], pos: [0, 28, 0], inflate: OUTER }],
  chestplate: [
    { uv: [16, 16], size: [8, 12, 4], pos: [0, 18, 0], inflate: OUTER },
    { uv: [40, 16], size: [4, 12, 4], pos: [-6, 18, 0], inflate: OUTER },
    { uv: [40, 16], size: [4, 12, 4], pos: [6, 18, 0], inflate: OUTER, mirror: true },
  ],
  boots: [
    { uv: [0, 16], size: [4, 12, 4], pos: [-2, 6, 0], inflate: OUTER },
    { uv: [0, 16], size: [4, 12, 4], pos: [2, 6, 0], inflate: OUTER, mirror: true },
  ],
  leggings: [
    { uv: [16, 16], size: [8, 12, 4], pos: [0, 18, 0], inflate: INNER },
    { uv: [0, 16], size: [4, 12, 4], pos: [-2, 6, 0], inflate: INNER },
    { uv: [0, 16], size: [4, 12, 4], pos: [2, 6, 0], inflate: INNER, mirror: true },
  ],
};

/* Cape hangs from the shoulders on the back and flares out slightly. The
   texture is the standard 64x32 cape layout. */
const CAPE_BOX = {
  uv: [0, 0], size: [10, 16, 1], pos: [0, 16, -2.5],
  pivot: [0, 24, -2.5], yaw180: true, rot: [0.14, 0, 0],
};

/* Elytra: one 10x20x2 wing per side, folded against the back. */
function elytraBoxes() {
  const wing = (sign, mirror) => ({
    uv: [22, 0], size: [10, 20, 2],
    pos: [0, 14, -1.2],
    pivot: [sign * 5, 23.5, -1.2],
    mirror,
    rot: [0.26, sign * -0.26, sign * 0.26],
  });
  return [wing(-1, false), wing(1, true)];
}

/* ---------------------------------------------------------------- viewer -- */

const VERT_SRC = `
attribute vec3 aPos;
attribute vec2 aUV;
attribute float aShade;
uniform mat4 uMVP;
varying vec2 vUV;
varying float vShade;
void main() {
  vUV = aUV;
  vShade = aShade;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;

const FRAG_SRC = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUV;
varying float vShade;
void main() {
  vec4 c = texture2D(uTex, vUV);
  if (c.a < 0.1) discard;             // cutout, so draw order never matters
  gl_FragColor = vec4(c.rgb * vShade, c.a);
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
    this.buffer = gl.createBuffer();
    this.textures = new WeakMap();

    this.yaw = -0.5; this.pitch = -0.18; this.distance = 52;
    this.spin = false;
    this.dirty = true;
    this.lastFrame = 0;

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
  texture(source) {
    let tex = this.textures.get(source);
    if (tex) return tex;
    const gl = this.gl;
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.textures.set(source, tex);
    return tex;
  }

  drawGroup(boxes, source, texW, texH, mvp) {
    if (!source) return;
    const gl = this.gl;
    const data = [];
    for (const box of boxes) boxGeometry(data, box, texW, texH);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);

    const stride = 6 * 4;
    gl.enableVertexAttribArray(this.attr.pos);
    gl.vertexAttribPointer(this.attr.pos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.attr.uv);
    gl.vertexAttribPointer(this.attr.uv, 2, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(this.attr.shade);
    gl.vertexAttribPointer(this.attr.shade, 1, gl.FLOAT, false, stride, 20);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture(source));
    gl.uniform1i(this.uTex, 0);
    gl.uniformMatrix4fv(this.uMVP, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, data.length / 6);
  }

  resize() {
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

    const bg = BACKGROUNDS[opts.bg];
    if (bg) {
      const r = parseInt(bg.slice(1, 3), 16) / 255;
      const g = parseInt(bg.slice(3, 5), 16) / 255;
      const b = parseInt(bg.slice(5, 7), 16) / 255;
      gl.clearColor(r, g, b, 1);
    } else {
      gl.clearColor(0, 0, 0, 0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const aspect = this.canvas.width / this.canvas.height;
    const proj = mat4Perspective(0.9, aspect, 0.1, 500);
    let view = mat4Multiply(mat4Translate(0, 0, -this.distance), mat4RotateX(this.pitch));
    view = mat4Multiply(view, mat4RotateY(this.yaw));
    view = mat4Multiply(view, mat4Translate(0, -18, 0));   // centre on the chest
    const mvp = mat4Multiply(proj, view);

    const skin = currentSkin();
    const legacy = skinIsLegacy();
    const slim = skinIsSlim();

    if (opts.showBody !== false) {
      const { base, overlay } = bodyBoxes(slim, legacy);
      this.drawGroup(base, skin, skin.width, skin.height, mvp);
      this.drawGroup(overlay, skin, skin.width, skin.height, mvp);
    }

    /* An equipped elytra replaces the cape rather than layering over it. */
    const cape = currentCape();
    if (cape && !opts.elytra) this.drawGroup([CAPE_BOX], cape, 64, 32, mvp);

    for (const piece of ['leggings', 'boots', 'chestplate', 'helmet']) {
      const cfg = opts.pieces[piece];
      if (!cfg || !cfg.on) continue;
      const tex = pieceTexture(piece, cfg);
      if (!tex) continue;
      this.drawGroup(ARMOR_BOXES[piece], tex, 64, 32, mvp);
    }

    /* A player with a cape flies it as their elytra, exactly as in game. */
    if (opts.elytra) {
      this.drawGroup(elytraBoxes(), cape || IMG['wings/elytra'], 64, 32, mvp);
    }
  }

  /* Renders continuously only while spinning; otherwise on demand. */
  start(getOpts) {
    const frame = now => {
      if (this.spin) {
        const dt = this.lastFrame ? (now - this.lastFrame) / 1000 : 0;
        this.yaw += dt * 0.6;
        this.dirty = true;
      }
      this.lastFrame = now;
      if (this.dirty || this.canvas.clientWidth !== this.lastW) {
        this.lastW = this.canvas.clientWidth;
        this.dirty = false;
        this.render(getOpts());
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
