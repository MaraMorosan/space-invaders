import Phaser from 'phaser';

import { CFG } from '../config';
import { BossManager } from '../managers/BossManager';
import { EffectsManager } from '../managers/EffectsManager';
import { PowerUpManager } from '../managers/PowerUpManager';
import { UIManager } from '../managers/UIManager';
import { WaveManager } from '../managers/WaveManager';

type ParticleManager = ReturnType<Phaser.GameObjects.GameObjectFactory['particles']>;
type Sfx = { play: (volMul?: number) => void };

export default class GameScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private ui!: UIManager;

  private pfLeft = 0;
  private pfRight = 0;

  private waveMgr!: WaveManager;
  private bossMgr!: BossManager;

  private bossCountdown = CFG.bossCountdownStart;

  private powerUpMgr!: PowerUpManager;
  private gutter!: Phaser.GameObjects.Graphics;

  private starsSlow?: ParticleManager;
  private starsFast?: ParticleManager;

  private fx!: EffectsManager;

  private lives = CFG.playerLivesStart;
  private livesMax = CFG.playerLivesMax;
  private gameOverShown = false;

  private autoFireEv?: Phaser.Time.TimerEvent;
  private bossTickEv?: Phaser.Time.TimerEvent;
  private onResize = () => this.handleResize();

  private _cleaned = false;

  constructor() {
    super('GameScene');
  }

  preload() {
    this.load.svg('player', '/assets/images/player.svg');
    this.load.svg('enemy_small', '/assets/images/enemy_small.svg');
    this.load.svg('enemy_fast', '/assets/images/enemy_fast.svg');
    this.load.svg('enemy_tank', '/assets/images/enemy_tank.svg');
    this.load.svg('boss_beetle', '/assets/images/boss_beetle.svg');
    this.load.svg('boss_manta', '/assets/images/boss_manta.svg');
    this.load.svg('boss_brute', '/assets/images/boss_brute.svg');
    this.load.svg('crate', 'assets/images/logo-white.svg', { width: 18, height: 22 });
    this.load.svg('heart', '/assets/images/heart.svg');

    this.load.audio('bgm', 'assets/sfx/bgm.ogg');
    this.load.audio('boss_fire', 'assets/sfx/boss_fight.ogg');
    this.load.audio('enemy_destroyed', 'assets/sfx/enemy_destroyed.ogg');
    this.load.audio('laser', 'assets/sfx/laser.ogg');

    const g = this.add.graphics();
    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 10);
    g.generateTexture('bullet', 2, 10);

    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1);
    g.generateTexture('star1', 1, 1);
    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
    g.generateTexture('star2', 2, 2);

    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2);
    g.generateTexture('spark', 2, 2);

    g.clear();
    g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
    g.generateTexture('smoke', 6, 6);

    g.destroy();
  }

  private sfx!: {
    laser: Sfx;
    enemyDestroyed: Sfx;
    bossFire: Sfx;
  };

  private bgm!: Phaser.Sound.BaseSound;

  create() {
    this.gameOverShown = false;
    this.score = 0;
    this.lives = CFG.playerLivesStart;
    this.livesMax = CFG.playerLivesMax;
    this.bossCountdown = CFG.bossCountdownStart;

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.physics.world.resume();
    this.input.keyboard!.enabled = true;
    this.input.keyboard?.resetKeys();

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.input.keyboard!.enabled = true;
    this.input.keyboard?.resetKeys();
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.sound.stopAll();

    this.scale.on('resize', this.onResize, this);

    const gutterX = Math.max(CFG.gutterX, Math.round(W * 0.12));
    this.pfLeft = gutterX;
    this.pfRight = W - gutterX;

    this.gutter = this.add.graphics().setDepth(5);
    this.gutter.setScrollFactor(0);
    this.drawGutters(W, H);
    this.physics.world.setBounds(
      this.pfLeft,
      0,
      this.pfRight - this.pfLeft,
      H,
      true,
      true,
      true,
      true,
    );

    this.createStarfield();

    this.player = this.physics.add.image((this.pfLeft + this.pfRight) / 2, H - 70, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.setCircle(16, 8, 8);
    this.player.setMaxVelocity(420);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 120 });
    this.enemies = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 200 });
    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 120,
    });

    this.ui = new UIManager(this, this.pfLeft, this.pfRight);
    this.ui.setLives(this.lives, this.livesMax);

    this.powerUpMgr = new PowerUpManager(
      this,
      this.player,
      this.bullets,
      this.ui,
      this.pfLeft,
      this.pfRight,
      () => this.gainLife(),
    );

    this.waveMgr = new WaveManager(this, this.enemies, this.pfLeft, this.pfRight);
    this.waveMgr.start();
    this.fx = new EffectsManager(this);
    this.bossMgr = new BossManager(
      this,
      this.player,
      this.bullets,
      this.enemyBullets,
      this.ui,
      this.pfLeft,
      this.pfRight,
      this.fx,
    );

    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) =>
      this.hitEnemy(bullet as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image),
    );

    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      (enemy as Phaser.Physics.Arcade.Image).destroy();
      this.cameras.main.shake(120, 0.01);
      this.addScore(-25);
      this.loseLife('collide');
    });

    this.physics.add.overlap(this.player, this.enemyBullets, (_player, ebullet) => {
      (ebullet as Phaser.Physics.Arcade.Image).destroy();
      this.cameras.main.shake(150, 0.012);
      this.addScore(-40);
      this.loseLife('hit');
    });

    this.autoFireEv = this.time.addEvent({
      delay: CFG.autoFireMs,
      loop: true,
      callback: () => this.shoot(),
    });

    this.bossTickEv = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.gameOverShown) return;
        if (this.bossMgr.active) return;
        this.bossCountdown--;
        if (this.bossCountdown <= 0) {
          this.bossMgr.spawn(() => this.waveMgr.pause());
          this.bossCountdown = CFG.bossCountdownStart;
        } else {
          this.ui.setBossTimerText(`Boss in: ${this.bossCountdown}s`);
        }
      },
    });

    this.bgm = this.sound.add('bgm', { loop: true, volume: 0 });
    this.bgm.play();
    this.tweens.add({ targets: this.bgm, volume: 0.05, duration: 600 });

    this.sfx = {
      laser: createSfx(this, 'laser', { pool: 8, volume: 0.15 }),
      enemyDestroyed: createSfx(this, 'enemy_destroyed', { pool: 4, volume: 0.04, cooldownMs: 30 }),
      bossFire: createSfx(this, 'boss_fire', { pool: 2, volume: 0.05, cooldownMs: 80 }),
    };

    this.powerUpMgr.setSfx?.(this.sfx);
    this.bossMgr.setSfx?.(this.sfx);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private gainLife() {
    if (this.lives < this.livesMax) {
      this.lives++;
      this.ui.setLives(this.lives, this.livesMax);
      this.cameras.main.flash(120, 80, 255, 120);
    }
  }

  private loseLife(_reason: 'hit' | 'collide' | 'miss') {
    if (this.gameOverShown) return;
    this.lives = Math.max(0, this.lives - 1);
    this.ui.setLives(this.lives, this.livesMax);

    this.cameras.main.shake(160, 0.01);

    if (this.lives <= 0) this.showGameOver();
  }

  private showGameOver() {
    if (this.gameOverShown) return;
    this.gameOverShown = true;

    this.autoFireEv?.remove(false);
    this.autoFireEv = undefined;
    this.bossTickEv?.remove(false);
    this.bossTickEv = undefined;

    this.waveMgr?.stop();
    this.bossMgr?.finish(false);
    this.powerUpMgr?.pause?.();

    this.physics.world.pause();
    this.tweens.killAll();
    this.sound.stopAll();
    if (this.input.keyboard) this.input.keyboard.enabled = false;

    this.setGroupVisible(this.enemies, false);
    this.setGroupVisible(this.bullets, false);
    this.setGroupVisible(this.enemyBullets, false);
    this.player?.setVisible(false);

    this.emptyGroup(this.bullets);
    this.emptyGroup(this.enemyBullets);
    this.emptyGroup(this.enemies);

    this.time.delayedCall(0, () => {
      this.ui.showGameOver(this.score, () => {
        this.ui.hideGameOver();
        this.input.enabled = false;
        this.scene.restart();
      });
    });
  }

  private createStarfield() {
    this.starsSlow?.destroy();
    this.starsFast?.destroy();

    this.starsSlow = this.add.particles(0, 0, 'star1', {
      x: { min: this.pfLeft, max: this.pfRight },
      y: -10,
      speedY: { min: 20, max: 45 },
      lifespan: 8000,
      quantity: 2,
      frequency: 70,
      alpha: { start: 0.8, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.starsSlow.setDepth(-10);

    this.starsFast = this.add.particles(0, 0, 'star2', {
      x: { min: this.pfLeft, max: this.pfRight },
      y: -10,
      speedY: { min: 80, max: 130 },
      lifespan: 4500,
      quantity: 1,
      frequency: 40,
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.starsFast.setDepth(-9);

    const H = this.scale.height;
    for (let i = 0; i < 60; i++)
      this.starsSlow.emitParticleAt(
        Phaser.Math.Between(this.pfLeft, this.pfRight),
        Phaser.Math.Between(0, H),
      );
    for (let i = 0; i < 40; i++)
      this.starsFast.emitParticleAt(
        Phaser.Math.Between(this.pfLeft, this.pfRight),
        Phaser.Math.Between(0, H),
      );
  }

  private handleResize() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const gutterX = Math.max(CFG.gutterX, Math.round(W * 0.12));
    this.pfLeft = gutterX;
    this.pfRight = W - gutterX;

    this.drawGutters(W, H);
    this.physics.world.setBounds(
      this.pfLeft,
      0,
      this.pfRight - this.pfLeft,
      H,
      true,
      true,
      true,
      true,
    );

    this.createStarfield();
    this.player.x = Phaser.Math.Clamp(this.player.x, this.pfLeft + 20, this.pfRight - 20);
    this.player.y = H - 70;

    this.waveMgr.setBounds(this.pfLeft, this.pfRight);
    this.bossMgr.setBounds(this.pfLeft, this.pfRight);
    this.ui.resize(this.pfLeft, this.pfRight);
    this.ui.setLives(this.lives, this.livesMax);

    if (this.bossMgr.active && this.bossMgr.hpMax > 0) {
      this.ui.drawBossHpBar(
        this.bossMgr.hpCurrent,
        this.bossMgr.hpMax,
        (this.pfLeft + this.pfRight) / 2,
      );
    }
  }

  private drawGutters(W: number, H: number) {
    this.gutter.clear();
    this.gutter.fillStyle(0x121820, 1);
    this.gutter.fillRect(0, 0, this.pfLeft, H);
    this.gutter.fillRect(this.pfRight, 0, W - this.pfRight, H);
  }

  private addScore(delta: number) {
    this.score = Math.max(0, this.score + delta);
    this.ui.setScore(this.score);
  }

  private shoot() {
    this.powerUpMgr.shoot();
  }

  private hitEnemy(bullet: Phaser.Physics.Arcade.Image, enemy: Phaser.Physics.Arcade.Image) {
    if ((enemy as any).getData?.('__isBoss') || enemy === this.bossMgr.boss) return;

    bullet.destroy();
    const hp = (enemy.getData('hp') as number) - 1;
    enemy.setData('hp', hp);
    this.addScore(2);
    if (hp <= 0) {
      const sc = enemy.getData('score') as number | undefined;
      const tint = (enemy as any).tintTopLeft ?? 0xffffff;
      this.fx?.explodeSmall(enemy.x, enemy.y, tint);
      this.sfx?.enemyDestroyed.play();
      enemy.destroy();
      this.addScore(sc ?? 10);
    } else {
      const tint = (enemy as any).tintTopLeft ?? 0xffffff;
      this.fx?.hitSpark(enemy.x, enemy.y, tint);
    }
  }

  private pruneGroup(
    group: Phaser.Physics.Arcade.Group,
    isOut: (o: Phaser.Physics.Arcade.Image) => boolean,
    onPrune?: (o: Phaser.Physics.Arcade.Image) => void,
  ) {
    const anyG: any = group;
    if (!anyG?.children) return;

    group.getChildren().forEach((obj) => {
      const go = obj as Phaser.Physics.Arcade.Image;
      if (go.active && isOut(go)) {
        onPrune?.(go);
        go.destroy();
      }
    });
  }

  update() {
    if (!this.player || !this.cursors || this.gameOverShown) return;

    const speed = 420;
    this.player.setVelocity(0);
    if (this.cursors.left?.isDown) this.player.setVelocityX(-speed);
    else if (this.cursors.right?.isDown) this.player.setVelocityX(speed);

    this.pruneGroup(
      this.enemies,
      (e) => e.y > this.scale.height + 40,
      () => this.loseLife('miss'),
    );

    this.pruneGroup(this.bullets, (b) => b.y < -20);
    this.pruneGroup(this.enemyBullets, (eb) => eb.y > this.scale.height + 20);

    this.bossMgr.update?.();
    this.powerUpMgr.update?.();

    if (!this.bossMgr.active) this.waveMgr.resume();
  }

  private cleanup() {
    if (this._cleaned) return;
    this._cleaned = true;
    this.scale.off('resize', this.onResize, this);

    this.autoFireEv?.remove(false);
    this.autoFireEv = undefined;
    this.bossTickEv?.remove(false);
    this.bossTickEv = undefined;

    this.waveMgr?.stop();
    this.bossMgr?.stopAll?.();

    this.powerUpMgr?.destroy?.();
    this.safeClearDestroy(this.bullets);
    this.safeClearDestroy(this.enemyBullets);
    this.safeClearDestroy(this.enemies);

    this.player?.destroy();
    this.fx?.destroy?.();
    this.sound.stopAll();
  }

  private safeClearDestroy(group?: Phaser.Physics.Arcade.Group | Phaser.GameObjects.Group) {
    const g: any = group as any;
    if (!g) return;

    if (g.children && typeof g.clear === 'function') {
      try {
        g.clear(true, true);
      } catch {}
    }

    if (typeof g.destroy === 'function') {
      try {
        g.destroy(true);
      } catch {}
    }
  }

  private emptyGroup(g?: Phaser.Physics.Arcade.Group) {
    const anyG: any = g;
    if (!anyG?.children) return;
    for (const obj of g!.getChildren()) {
      obj?.destroy?.();
    }
  }

  private setGroupVisible(g?: Phaser.Physics.Arcade.Group, visible = true) {
    const anyG: any = g;
    if (!anyG?.children) return;
    for (const obj of g!.getChildren()) {
      (obj as any)?.setVisible?.(visible);
    }
  }
}

function createSfx(
  scene: Phaser.Scene,
  key: string,
  { pool = 4, volume = 0.1, cooldownMs = 0 } = {},
): Sfx {
  const sounds = Array.from({ length: pool }, () => scene.sound.add(key, { volume }));
  let idx = 0;
  let last = -Infinity;
  return {
    play(volMul = 1) {
      const now = scene.time.now;
      if (now - last < cooldownMs) return;
      last = now;
      const snd = sounds[idx];
      idx = (idx + 1) % sounds.length;
      snd.setVolume(volume * volMul);
      snd.play();
    },
  };
}
