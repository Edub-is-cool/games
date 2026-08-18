import Phaser from 'phaser';

/**
 * Generated textures.
 *
 * The dungeon was drawn entirely with flat-coloured rectangles, which reads as
 * a spreadsheet more than a cave. These build small canvas textures once at
 * boot so the stone has grain and the torch has a soft falloff — neither of
 * which Phaser's shape API can express on its own.
 */

/** Tileable grain, multiplied over the map to break up flat fills. */
export function makeStoneTexture(scene: Phaser.Scene, key = 'stone-grain', size = 128) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const c = tex.getContext();

  c.fillStyle = '#808080';
  c.fillRect(0, 0, size, size);

  // Speckle. Mid-grey is neutral under MULTIPLY-style blending, so lighter and
  // darker flecks read as highlights and pits.
  const img = c.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 46;
    d[i] = d[i + 1] = d[i + 2] = n;
  }
  c.putImageData(img, 0, 0);

  // A few larger blotches for variation at tile scale.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 4 + Math.random() * 13;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() < 0.5;
    g.addColorStop(0, dark ? 'rgba(70,70,70,0.4)' : 'rgba(190,190,190,0.32)');
    g.addColorStop(1, 'rgba(128,128,128,0)');
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  tex.refresh();
  return key;
}

/** Soft radial falloff, used for torchlight and the screen vignette. */
export function makeRadialTexture(
  scene: Phaser.Scene,
  key: string,
  stops: Array<[number, string]>,
  size = 256,
) {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const c = tex.getContext();
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  tex.refresh();
  return key;
}
