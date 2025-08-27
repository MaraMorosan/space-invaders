import Phaser from "phaser";
import { CFG } from "../config";
import { UIManager } from "../managers/UIManager";
import { WaveManager } from "../managers/WaveManager";
import { BossManager } from "../managers/BossManager";
import { PowerUpManager } from "../managers/PowerUpManager";
import { EffectsManager } from "../managers/EffectsManager";

type ParticleManager = ReturnType<Phaser.GameObjects.GameObjectFactory["particles"]>;

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


  constructor() { super("GameScene"); }

  preload() {
    this.load.svg("player", "/assets/images/player.svg");
    this.load.svg("enemy_small", "/assets/images/enemy_small.svg");
    this.load.svg("enemy_fast", "/assets/images/enemy_fast.svg");
    this.load.svg("enemy_tank", "/assets/images/enemy_tank.svg");
    this.load.svg("boss_beetle", "/assets/images/boss_beetle.svg");
    this.load.svg("boss_manta",  "/assets/images/boss_manta.svg");
    this.load.svg("boss_brute",  "/assets/images/boss_brute.svg");
    this.load.svg("crate", "assets/images/logo-white.svg", { width: 14, height: 18 });


    const g = this.add.graphics();
    g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 10);
    g.generateTexture("bullet", 2, 10);

    g.clear(); g.fillStyle(0xffffff, 1).fillRect(0, 0, 1, 1); g.generateTexture("star1", 1, 1);
    g.clear(); g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2); g.generateTexture("star2", 2, 2);

    g.clear(); g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2); g.generateTexture("spark", 2, 2);

    g.clear(); g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3); g.generateTexture("smoke", 6, 6);

    g.destroy();
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    
		const gutterX = Math.max(CFG.gutterX, Math.round(W * 0.12));
    this.pfLeft  = gutterX;
    this.pfRight = W - gutterX;

    this.physics.world.setBounds(this.pfLeft, 0, this.pfRight - this.pfLeft, H, true, true, true, true);

    this.createStarfield();

    this.gutter = this.add.graphics().setDepth(5);
    this.drawGutters(W, H);

		this.player = this.physics.add.image((this.pfLeft + this.pfRight) / 2, H - 70, "player");
		this.player.setCollideWorldBounds(true);
		this.player.setCircle(16, 8, 8);
		this.player.setMaxVelocity(420);

		this.cursors = this.input.keyboard!.createCursorKeys();

		this.bullets      = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 120 });
		this.enemies      = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 200 });
		this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 120 });

		this.ui = new UIManager(this, this.pfLeft, this.pfRight);
    this.fx = new EffectsManager(this);

		this.powerUpMgr = new PowerUpManager(this, this.player, this.bullets, this.ui, this.pfLeft, this.pfRight);

		this.time.addEvent({ delay: CFG.autoFireMs, loop: true, callback: () => this.shoot() });

		this.waveMgr = new WaveManager(this, this.enemies, this.pfLeft, this.pfRight);
		//this.waveMgr.start();

		this.bossMgr = new BossManager(this, this.player, this.bullets, this.enemyBullets, this.ui, this.pfLeft, this.pfRight, this.fx);

    this.physics.add.overlap(
      this.bullets, this.enemies,
      (bullet, enemy) => this.hitEnemy(bullet as Phaser.Physics.Arcade.Image, enemy as Phaser.Physics.Arcade.Image)
    );

    this.physics.add.overlap(
      this.player, this.enemies,
      (_player, enemy) => {
        (enemy as Phaser.Physics.Arcade.Image).destroy();
        this.cameras.main.shake(120, 0.01);
        this.addScore(-25);
      }
    );

    this.physics.add.overlap(
      this.player, this.enemyBullets,
      (_player, ebullet) => {
        (ebullet as Phaser.Physics.Arcade.Image).destroy();
        this.cameras.main.shake(150, 0.012);
        this.addScore(-40);
      }
    );

    this.ui.setBossTimerText(`Boss in: ${this.bossCountdown}s`);
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
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

    this.time.delayedCall(0, () => {
      try {
        this.fx = new EffectsManager(this);
      } catch (e) {
        console.error("EffectsManager init failed:", e);
      }
    });

    this.time.delayedCall(0, () => {
      try {
        this.waveMgr.start();
      } catch (e) {
        console.error("WaveManager.start failed:", e);
      }
    });

    this.time.delayedCall(0, () => {
      try {
        this.fx = new EffectsManager(this);
        this.bossMgr.setFx(this.fx);
      } catch (e) {
        console.error("EffectsManager init failed:", e);
      }
    });

    this.scale.on("resize", (gs: Phaser.Structs.Size) => {
    this.handleResize(gs.width, gs.height);
    });
  }

  private createStarfield() {
    this.starsSlow?.destroy();
    this.starsFast?.destroy();

    this.starsSlow = this.add.particles(0, 0, "star1", {
    x: { min: this.pfLeft, max: this.pfRight },
    y: -10,
    speedY: { min: 20, max: 45 },
    lifespan: 8000,
    quantity: 2,
    frequency: 70,
    alpha: { start: 0.8, end: 0 },
    blendMode: Phaser.BlendModes.ADD,
  }) as ParticleManager;
  this.starsSlow.setDepth(-10);

  this.starsFast = this.add.particles(0, 0, "star2", {
    x: { min: this.pfLeft, max: this.pfRight },
    y: -10,
    speedY: { min: 80, max: 130 },
    lifespan: 4500,
    quantity: 1,
    frequency: 40,
    alpha: { start: 1, end: 0 },
    blendMode: Phaser.BlendModes.ADD,
  }) as ParticleManager;
  this.starsFast.setDepth(-9);

    const H = this.scale.height;
    for (let i = 0; i < 60; i++) this.starsSlow.emitParticleAt(Phaser.Math.Between(this.pfLeft, this.pfRight), Phaser.Math.Between(0, H));
    for (let i = 0; i < 40; i++) this.starsFast.emitParticleAt(Phaser.Math.Between(this.pfLeft, this.pfRight), Phaser.Math.Between(0, H));
  }

  private handleResize(W: number, H: number) {
    const gutterX = Math.max(CFG.gutterX, Math.round(W * 0.12));
    this.pfLeft  = gutterX;
    this.pfRight = W - gutterX;

    this.drawGutters(W, H);
    this.physics.world.setBounds(this.pfLeft, 0, this.pfRight - this.pfLeft, H, true, true, true, true);

    this.createStarfield();
    this.player.x = Phaser.Math.Clamp(this.player.x, this.pfLeft + 20, this.pfRight - 20);
    this.player.y = H - 70;
    this.waveMgr.setBounds(this.pfLeft, this.pfRight);
    this.bossMgr.setBounds(this.pfLeft, this.pfRight);
    this.ui.resize(this.pfLeft, this.pfRight);

    if (this.bossMgr.active && this.bossMgr.hpMax > 0) {
      this.ui.drawBossHpBar(this.bossMgr.hpCurrent, this.bossMgr.hpMax, (this.pfLeft + this.pfRight) / 2);
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
    if ((enemy as any).getData?.("__isBoss") || enemy === this.bossMgr.boss) return;

    bullet.destroy();
    const hp = (enemy.getData("hp") as number) - 1;
    enemy.setData("hp", hp);
    this.addScore(2);
    if (hp <= 0) {
      const sc = enemy.getData("score") as number | undefined;
      const tint = (enemy as any).tintTopLeft ?? 0xffffff;
      this.fx?.explodeSmall(enemy.x, enemy.y, tint);
      enemy.destroy();
      this.addScore(sc ?? 10);
    }
    else {
      const tint = (enemy as any).tintTopLeft ?? 0xffffff;
      this.fx?.hitSpark(enemy.x, enemy.y, tint);
    }
  }

	private pruneGroup(
		group: Phaser.Physics.Arcade.Group,
		isOut: (o: Phaser.Physics.Arcade.Image) => boolean
	) {
		(group.getChildren() as Phaser.GameObjects.GameObject[]).forEach((obj) => {
			const go = obj as Phaser.Physics.Arcade.Image;
			if (go.active && isOut(go)) go.destroy();
		});
	}

  update() {
    if (!this.player || !this.cursors) return;

    const speed = 420;
    this.player.setVelocity(0);
    if (this.cursors.left?.isDown) this.player.setVelocityX(-speed);
    else if (this.cursors.right?.isDown) this.player.setVelocityX(speed);

    this.enemies && this.pruneGroup(this.enemies, e  => e.y > this.scale.height + 40);
    this.bullets && this.pruneGroup(this.bullets, b  => b.y < -20);
    this.enemyBullets && this.pruneGroup(this.enemyBullets, eb => eb.y > this.scale.height + 20);

    this.bossMgr?.update?.();
    this.powerUpMgr?.update?.();

    if (this.waveMgr && !this.bossMgr?.active) this.waveMgr.resume();
  }
}
