import Phaser from 'phaser';

type ParticleEmitter = ReturnType<Phaser.GameObjects.GameObjectFactory['particles']>;

export class EffectsManager {
  private eSmall!: ParticleEmitter;
  private eHit!: ParticleEmitter;
  private eSmoke!: ParticleEmitter;

  constructor(private scene: Phaser.Scene) {
    this.eSmall = this.scene.add.particles(0, 0, 'spark', {
      angle: { min: 0, max: 360 },
      speed: { min: 140, max: 280 },
      lifespan: { min: 300, max: 650 },
      gravityY: 300,
      quantity: 1,
      alpha: { start: 1, end: 0 },
      scale: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.eSmall.stop();
    this.eSmall.setDepth(40);

    this.eHit = this.scene.add.particles(0, 0, 'spark', {
      angle: { min: -20, max: 20 },
      speed: { min: 80, max: 160 },
      lifespan: 220,
      quantity: 1,
      alpha: { start: 1, end: 0 },
      scale: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.eHit.stop();
    this.eHit.setDepth(40);

    this.eSmoke = this.scene.add.particles(0, 0, 'smoke', {
      speed: { min: 40, max: 90 },
      lifespan: { min: 700, max: 1400 },
      alpha: { start: 0.9, end: 0 },
      scale: { start: 0.8, end: 1.8 },
      quantity: 2,
      tint: 0xb0b6c0,
      gravityY: -20,
      blendMode: Phaser.BlendModes.NORMAL,
    });
    this.eSmoke.stop();
    this.eSmoke.setDepth(39);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private hitStop(ms = 140, scale = 0.18) {
    const t = this.scene.time;
    const w = this.scene.physics.world;
    const prevT = t.timeScale ?? 1;
    const prevP = w.timeScale ?? 1;
    t.timeScale = scale;
    w.timeScale = scale;
    t.delayedCall(ms, () => {
      t.timeScale = prevT;
      w.timeScale = prevP;
    });
  }

  private cameraPunch(dur = 220, zoomTo = 1.06, shake = 0.012) {
    const cam = this.scene.cameras.main;
    const z0 = cam.zoom;
    this.scene.tweens.add({
      targets: cam,
      zoom: zoomTo,
      duration: dur * 0.5,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => cam.setZoom(z0),
    });
    cam.shake(dur, shake);
    cam.flash(120, 255, 240, 200);
  }

  explodeSmall(x: number, y: number, tint?: number) {
    (this.eSmall as any).setParticleTint?.(tint ?? 0xffffff);
    this.eSmall.explode(24, x, y);
  }

  public explodeBoss(x: number, y: number, tint = 0xffffff, opts?: { power?: number }) {
    const power = Math.max(0.6, opts?.power ?? 1.0);

    this.hitStop(140, 0.18);
    this.cameraPunch(260, 1.07, 0.013);

    const glow = this.scene.add
      .circle(x, y, 36, 0xffffff, 0.55)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(120);
    this.scene.tweens.add({
      targets: glow,
      scale: { from: 0.6, to: 3.6 * power },
      alpha: { from: 0.75, to: 0 },
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => glow.destroy(),
    });

    const sparks = this.scene.add.particles(0, 0, 'spark', {
      speed: { min: 280, max: 820 },
      angle: { min: 0, max: 360 },
      quantity: 1,
      lifespan: { min: 380, max: 900 },
      scale: { start: 1.2 * power, end: 0 },
      alpha: { start: 1, end: 0 },
      tint,
      blendMode: Phaser.BlendModes.ADD,
    });
    sparks.setDepth(130);
    sparks.explode(Math.round(120 * power), x, y);
    this.scene.time.delayedCall(1000, () => sparks.destroy());

    this.scene.time.delayedCall(90, () => {
      const sparks2 = this.scene.add.particles(0, 0, 'spark', {
        speed: { min: 160, max: 520 },
        angle: { min: 0, max: 360 },
        quantity: 1,
        lifespan: { min: 420, max: 1100 },
        scale: { start: 1.0 * power, end: 0 },
        alpha: { start: 1, end: 0 },
        tint,
        gravityY: 300,
        blendMode: Phaser.BlendModes.ADD,
      });
      sparks2.setDepth(125);
      sparks2.explode(Math.round(90 * power), x, y);
      this.scene.time.delayedCall(1200, () => sparks2.destroy());
    });

    const smoke = this.scene.add.particles(0, 0, 'smoke', {
      speed: { min: 40, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 900, max: 1600 },
      quantity: 1,
      alpha: { start: 0.9, end: 0 },
      scale: { start: 0.7 * power, end: 2.6 * power },
      gravityY: -40,
    });
    smoke.setDepth(90);

    smoke.explode(Math.round(70 * power), x, y);
    this.scene.time.delayedCall(1600, () => smoke.destroy());
  }

  hitSpark(x: number, y: number, tint?: number) {
    (this.eHit as any).setParticleTint?.(tint ?? 0xffffff);
    this.eHit.explode(6, x, y);
  }

  destroy() {
    this.eSmall?.destroy?.();
    this.eHit?.destroy?.();
    this.eSmoke?.destroy?.();
  }
}
