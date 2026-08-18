import Phaser from 'phaser';

/**
 * Smooth backdrop helpers.
 *
 * Phaser's Graphics API has no gradients, so the felt sheen, the overhead
 * spotlight and the vignette are painted once into canvas textures and reused.
 * Banded fillRect gradients are what made these scenes look flat before.
 */

function radialTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  stops: Array<[number, string]>,
) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const c = tex.getContext();
  const grd = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) grd.addColorStop(offset, color);
  c.fillStyle = grd;
  c.fillRect(0, 0, size, size);
  tex.refresh();
}

function verticalTexture(
  scene: Phaser.Scene,
  key: string,
  height: number,
  stops: Array<[number, string]>,
) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, 4, height);
  if (!tex) return;
  const c = tex.getContext();
  const grd = c.createLinearGradient(0, 0, 0, height);
  for (const [offset, color] of stops) grd.addColorStop(offset, color);
  c.fillStyle = grd;
  c.fillRect(0, 0, 4, height);
  tex.refresh();
}

/** Full-bleed vertical gradient, no banding. */
export function addGradientBackground(
  scene: Phaser.Scene,
  w: number,
  h: number,
  stops: Array<[number, string]>,
) {
  verticalTexture(scene, 'bg-gradient', 256, stops);
  return scene.add.image(w / 2, h / 2, 'bg-gradient').setDisplaySize(w, h).setDepth(-100);
}

/** Warm pool of light from an overhead lamp, centred on a point. */
export function addSpotlight(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  strength = 0.5,
) {
  radialTexture(scene, 'spotlight', 256, [
    [0, 'rgba(255,240,200,1)'],
    [0.45, 'rgba(255,225,160,0.35)'],
    [1, 'rgba(255,220,150,0)'],
  ]);
  return scene.add.image(x, y, 'spotlight')
    .setDisplaySize(w, h)
    .setAlpha(strength)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(-90);
}

/** Feathered darkening at the edges of the frame. */
export function addVignette(scene: Phaser.Scene, w: number, h: number, strength = 0.55) {
  radialTexture(scene, 'vignette', 256, [
    [0, 'rgba(0,0,0,0)'],
    [0.55, 'rgba(0,0,0,0)'],
    [0.78, 'rgba(0,0,0,0.28)'],
    [1, 'rgba(0,0,0,1)'],
  ]);
  return scene.add.image(w / 2, h / 2, 'vignette')
    .setDisplaySize(w * 1.5, h * 1.6)
    .setAlpha(strength)
    .setDepth(1000);
}
