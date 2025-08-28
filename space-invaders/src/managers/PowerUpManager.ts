import Phaser from 'phaser';

import { safeDestroyGroup } from '../utils/phaserHelpers';
import { UIManager } from './UIManager';

export type PowerUpType = 'triple' | 'quad' | 'rapid' | 'heart';
type SfxBank = { laser: { play(volMul?: number): void } };

export const POWERUP_CFG = {
  spawnEveryMs: 20000,
  durationMs: 6000,
  fallSpeed: [140, 180],
};

export class PowerUpManager {
  private scene: Phaser.Scene;
  private player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private bullets: Phaser.Physics.Arcade.Group;
  private ui: UIManager;
  private pfLeft: number;
  private pfRight: number;
  private onHeartPickup?: () => void;
  private paused = false;
  private lastSpawnAt = -Infinity;

  private spawnEv?: Phaser.Time.TimerEvent;
  private crates?: Phaser.Physics.Arcade.Group;

  private current?: { type: PowerUpType; until: number };

  private sfx?: SfxBank;

  private readonly crateKey = 'crate_outlined';

  constructor(
    scene: Phaser.Scene,
    player: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
    bullets: Phaser.Physics.Arcade.Group,
    ui: UIManager,
    pfLeft: number,
    pfRight: number,
    onHeartPickup?: () => void,
  ) {
    this.scene = scene;
    this.player = player;
    this.bullets = bullets;
    this.ui = ui;
    this.pfLeft = pfLeft;
    this.pfRight = pfRight;
    this.onHeartPickup = onHeartPickup;

    this.crates = scene.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 3 });

    this.scene.time.delayedCall(0, () => {
      const g = this.crates;
      if (!g) return;
      this.scene.physics.add.overlap(
        this.player,
        g,
        (_p, c) => this.pickUp(c as Phaser.Physics.Arcade.Image),
        undefined,
        this,
      );
    });

    this.spawnEv = scene.time.addEvent({
      delay: POWERUP_CFG.spawnEveryMs,
      loop: true,
      callback: () => this.trySpawn(),
    });
  }

  pause() {
    if (this.spawnEv) this.spawnEv.paused = true;
  }

  resume() {
    if (this.spawnEv) this.spawnEv.paused = false;
  }

  destroy(): void {
    this.paused = true;

    this.spawnEv?.remove(false);
    this.spawnEv = undefined;

    const g = this.crates;
    this.crates = undefined;

    safeDestroyGroup(g);
  }

  public setSfx(sfx: SfxBank) {
    this.sfx = sfx;
  }

  private trySpawn() {
    if (this.paused) return;
    const now = this.scene.time.now;

    if (now - this.lastSpawnAt < 30) return;
    this.lastSpawnAt = now;

    this.spawnCrate();
  }

  private spawnCrate() {
    if (this.paused || !this.crates) return;

    const g = this.crates;
    const x = Phaser.Math.Between(this.pfLeft + 30, this.pfRight - 30);

    const c = g.get(x, -24, this.crateKey) as Phaser.Physics.Arcade.Image | null;
    if (!c) return;

    c.setActive(true).setVisible(true);
    c.setVelocity(0, Phaser.Math.Between(POWERUP_CFG.fallSpeed[0], POWERUP_CFG.fallSpeed[1]));
    c.setScale(1);

    const radius = Math.max(c.displayWidth, c.displayHeight) * 0.45;
    (c.body as Phaser.Physics.Arcade.Body).setCircle(
      Math.round(radius),
      Math.round(c.displayWidth / 2 - radius),
      Math.round(c.displayHeight / 2 - radius),
    );

    c.setDepth(20);

    const types: PowerUpType[] = ['triple', 'quad', 'rapid', 'heart'];
    const t = Phaser.Utils.Array.GetRandom(types);

    c.setData('type', t);
    const tint =
      t === 'triple' ? 0x6df7c1 : t === 'quad' ? 0x9bf6ff : t === 'rapid' ? 0xffd6a5 : 0xff4d6d;

    c.setTint(tint);
  }

  private pickUp(crate: Phaser.Physics.Arcade.Image) {
    const type = (crate.getData('type') as PowerUpType) ?? 'triple';
    crate.destroy();

    if (type === 'heart') {
      this.onHeartPickup?.();
      this.ui.setPowerUpLabel('LIFE +1');
      this.scene.time.delayedCall(1000, () => this.ui.clearPowerUpLabel());
      return;
    }

    this.current = { type, until: this.scene.time.now + POWERUP_CFG.durationMs };
    this.ui.setPowerUpLabel(type.toUpperCase());

    this.scene.time.delayedCall(POWERUP_CFG.durationMs + 50, () => {
      if (this.current && this.scene.time.now >= this.current.until) {
        this.current = undefined;
        this.ui.clearPowerUpLabel();
      }
    });
  }

  shoot() {
    const now = this.scene.time.now;
    if (!this.current || now >= this.current.until) {
      this.current = undefined;
      this.ui.clearPowerUpLabel();
      return this.fireStraight();
    }

    switch (this.current.type) {
      case 'triple':
        return this.fireSpread(3, 12);
      case 'quad':
        return this.fireSpread(4, 16);
      case 'rapid':
        this.fireStraight();
        this.scene.time.delayedCall(55, () => this.fireStraight());
        return;
      default:
        return this.fireStraight();
    }
  }

  private fireStraight() {
    const b = this.bullets.get(
      this.player.x,
      this.player.y - 28,
      'bullet',
    ) as Phaser.Physics.Arcade.Image | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.setVelocity(0, -520);
    this.sfx?.laser.play();
  }

  private fireSpread(count: number, halfAngle: number) {
    const baseSpeed = 520;
    const angles: number[] = [];

    if (count === 3) angles.push(-halfAngle, 0, halfAngle);
    else if (count === 4)
      angles.push(-halfAngle * 1.5, -halfAngle * 0.5, halfAngle * 0.5, halfAngle * 1.5);
    else angles.push(0);

    for (const a of angles) {
      const rad = Phaser.Math.DegToRad(a);
      const vx = baseSpeed * Math.sin(rad);
      const vy = -baseSpeed * Math.cos(rad);
      const b = this.bullets.get(
        this.player.x,
        this.player.y - 28,
        'bullet',
      ) as Phaser.Physics.Arcade.Image | null;
      if (!b) continue;
      b.setActive(true).setVisible(true);
      b.setVelocity(vx, vy);
      b.setAngle(-a);
      this.sfx?.laser.play(0.9);
    }
  }

  update() {
    const g = this.crates;
    if (!g) return;

    const H = this.scene.scale.height;

    for (const obj of g.getChildren() as Phaser.Physics.Arcade.Image[]) {
      if (!obj || !obj.active) continue;
      if (obj.y > H + 30) obj.destroy();
    }
  }
}
