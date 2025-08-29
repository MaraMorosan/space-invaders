import Phaser from 'phaser';

import { CFG, ENEMY_TYPES } from '../config';
import { setFxTint } from '../utils/phaserHelpers';

export class WaveManager {
  private scene: Phaser.Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private pfLeft: number;
  private pfRight: number;

  private timers: Phaser.Time.TimerEvent[] = [];
  private addTimer(cfg: Phaser.Types.Time.TimerEventConfig) {
    const ev = this.scene.time.addEvent(cfg);
    this.timers.push(ev);
    return ev;
  }

  constructor(
    scene: Phaser.Scene,
    enemies: Phaser.Physics.Arcade.Group,
    pfLeft: number,
    pfRight: number,
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.pfLeft = pfLeft;
    this.pfRight = pfRight;
  }

  start() {
    this.stop();
    this.addTimer({
      delay: CFG.waveEveryMs,
      loop: true,
      callback: () => this.launchWave(),
    });
  }

  pause() {
    this.timers.forEach((t) => (t.paused = true));
  }
  resume() {
    this.timers.forEach((t) => (t.paused = false));
  }

  stop() {
    for (const t of this.timers) t?.remove?.(false);
    this.timers.length = 0;
  }

  private launchWave() {
    const count = Phaser.Math.Between(CFG.waveCountMin, CFG.waveCountMax);
    const pattern = Phaser.Math.Between(0, 1);

    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * CFG.waveBurstDelay, () => {
        let x = Phaser.Math.Between(this.pfLeft + 40, this.pfRight - 40);
        if (pattern === 0 && count > 1) {
          x = this.pfLeft + 40 + Math.round(i * ((this.pfRight - this.pfLeft - 80) / (count - 1)));
        }
        this.spawnEnemyAt(x);
      });
    }
  }

  private spawnEnemyAt(x: number) {
    const spec = Phaser.Utils.Array.GetRandom(ENEMY_TYPES);
    const e = this.enemies.get(x, -30, spec.key) as Phaser.Physics.Arcade.Image | null;
    if (!e) return;
    e.setActive(true).setVisible(true);
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setSize(e.displayWidth, e.displayHeight, true);
    e.setVelocity(0, Phaser.Math.Between(spec.speed[0], spec.speed[1]));
    if (typeof spec.fxTint === 'number') setFxTint(e, spec.fxTint);
    e.setData('hp', spec.hp);
    e.setData('score', spec.score);
    e.setCollideWorldBounds(false);
  }

  setBounds(left: number, right: number) {
    this.pfLeft = left;
    this.pfRight = right;
  }
}
