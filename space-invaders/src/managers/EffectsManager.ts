import Phaser from 'phaser';

type ParticleEmitter = ReturnType<Phaser.GameObjects.GameObjectFactory['particles']>;

export class EffectsManager {
  private eSmall!: ParticleEmitter;
  private eHit!: ParticleEmitter;
  private eSmoke!: ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.eSmall = scene.add.particles(0, 0, 'spark', {
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

    this.eHit = scene.add.particles(0, 0, 'spark', {
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

    this.eSmoke = scene.add.particles(0, 0, 'smoke', {
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

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
  }

  explodeSmall(x: number, y: number, tint?: number) {
    (this.eSmall as any).setParticleTint?.(tint ?? 0xffffff);
    this.eSmall.explode(24, x, y);
  }

  explodeBoss(x: number, y: number, tint?: number) {
    this.explodeSmall(x, y, tint);
    this.eSmoke.explode(28, x, y);
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
