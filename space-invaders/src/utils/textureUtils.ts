import Phaser from 'phaser';

type OutlineOpts = {
  color?: number;
  thickness?: number;
  scale?: number;
  pad?: number;
};

export function ensureOutlinedTexture(
  scene: Phaser.Scene,
  srcKey: string,
  outKey: string,
  opts: OutlineOpts = {},
): void {
  if (scene.textures.exists(outKey)) return;

  const { color = 0x0e1116, thickness = 2, scale = 1.25, pad = 2 } = opts;

  const srcTex = scene.textures.get(srcKey);
  const frame = srcTex.get();
  const w = Math.ceil(frame.realWidth * scale) + thickness * 2 + pad * 2;
  const h = Math.ceil(frame.realHeight * scale) + thickness * 2 + pad * 2;

  const rt = scene.add.renderTexture(0, 0, w, h).setVisible(false);
  const img = scene.add.image(0, 0, srcKey).setOrigin(0.5).setScale(scale).setTint(color);

  const cx = w / 2;
  const cy = h / 2;

  const t = thickness;
  const offs = [
    [-t, 0],
    [t, 0],
    [0, -t],
    [0, t],
    [-t, -t],
    [-t, t],
    [t, -t],
    [t, t],
  ];
  for (const [dx, dy] of offs) rt.draw(img, cx + dx, cy + dy);

  img.clearTint();
  rt.draw(img, cx, cy);

  rt.saveTexture(outKey);

  img.destroy();
  rt.destroy();
}
